import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ANALYSIS_PROMPT = `You are JobPilot AI's CV analysis engine.
Analyze the uploaded CV for ATS readiness and real job-market usefulness.
Never invent facts. Only extract skills, experience, education, achievements, certifications, and other information that is actually present.
Return ONLY valid JSON with this shape:
{
  "atsScore": number,
  "candidate": { "name": string|null, "headline": string|null, "location": string|null },
  "summary": string,
  "skills": string[],
  "experience": [{"role":string,"company":string,"duration":string,"highlights":string[]}],
  "education": [{"degree":string,"institution":string,"year":string}],
  "strengths": string[],
  "improvements": [{"priority":"high"|"medium"|"low","issue":string,"recommendation":string}],
  "atsChecks": [{"name":string,"status":"pass"|"warning"|"fail","detail":string}],
  "targetRoles": string[]
}
ATS score must be evidence-based. Do not claim the score guarantees ATS success or a job.`;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API is not configured. Add OPENAI_API_KEY to the server environment." },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please upload a CV file." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Only PDF and DOCX files are supported." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File must be 8 MB or smaller." }, { status: 400 });
    }

    const upload = new FormData();
    upload.append("purpose", "user_data");
    upload.append("file", file, file.name);

    const fileResponse = await fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upload,
    });

    if (!fileResponse.ok) {
      const detail = await fileResponse.text();
      return NextResponse.json({ error: "CV upload to the AI service failed.", detail }, { status: 502 });
    }

    const uploaded = (await fileResponse.json()) as { id?: string };
    if (!uploaded.id) {
      return NextResponse.json({ error: "AI service did not return a file ID." }, { status: 502 });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: ANALYSIS_PROMPT },
              { type: "input_file", file_id: uploaded.id },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json({ error: "CV analysis failed.", detail }, { status: 502 });
    }

    const result = await response.json();
    const outputText = typeof result.output_text === "string" ? result.output_text : "";
    const cleaned = outputText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

    let analysis: unknown;
    try {
      analysis = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "The AI returned an invalid analysis format." }, { status: 502 });
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("CV analysis error", error);
    return NextResponse.json({ error: "Unexpected server error while analyzing the CV." }, { status: 500 });
  }
}
