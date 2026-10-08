import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { consumeAiCredit, releaseAiCredit } from "@/lib/entitlements";
import { extractCvText } from "@/lib/cv-text-extractor";
import { hasAiProvider, runAiText } from "@/lib/ai-provider";
import { rateLimit } from "@/lib/rate-limit";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_REQUEST_SIZE = MAX_FILE_SIZE + 256 * 1024;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ANALYSIS_PROMPT = `You are JobPilot AI's CV analysis engine.
Analyze the CV text below for ATS readiness and real job-market usefulness.
Never invent facts. Only extract skills, experience, education, achievements, certifications, and other information that is actually present in the CV.
Return ONLY valid JSON with this exact shape:
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
ATS score must be evidence-based. Do not claim the score guarantees ATS success or a job.

CV TEXT:
`;

function parseJson(text: string) {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as unknown;
    }
    throw new Error("Invalid JSON returned by AI provider.");
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = rateLimit(`analyze-cv:${user.id}`, 5, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many CV analysis requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  if (!hasAiProvider()) {
    return NextResponse.json(
      { error: "No AI provider is configured. Add MODAL_AI_API_KEY to the server environment." },
      { status: 503 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_SIZE) {
    return NextResponse.json({ error: "CV upload request is too large." }, { status: 413 });
  }

  let creditReserved = false;
  let stage = "reading-upload";

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) return NextResponse.json({ error: "Please upload a CV file." }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Only PDF and DOCX files are supported." }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "File must be 8 MB or smaller." }, { status: 400 });
    if (file.name.length > 180) return NextResponse.json({ error: "CV filename is too long." }, { status: 400 });

    stage = "reserving-ai-credit";
    const credit = await consumeAiCredit(user.id);
    if (!credit.ok) {
      return NextResponse.json(
        { error: "Monthly AI limit reached.", plan: credit.entitlements.planKey, usage: credit.entitlements.usage, remainingAi: 0 },
        { status: 429 },
      );
    }
    creditReserved = true;

    stage = "extracting-cv-text";
    const cvText = await extractCvText(file);
    if (cvText.length < 80) {
      await releaseAiCredit(user.id);
      creditReserved = false;
      return NextResponse.json({ error: "The CV does not contain enough readable text to analyze." }, { status: 422 });
    }

    stage = "calling-ai-provider";
    const aiResult = await runAiText({
      prompt: ANALYSIS_PROMPT + cvText,
      maxTokens: 2600,
      temperature: 0.1,
    });

    if (!aiResult) {
      await releaseAiCredit(user.id);
      creditReserved = false;
      return NextResponse.json({ error: "CV analysis failed because the AI service is unavailable." }, { status: 502 });
    }

    stage = "validating-ai-response";
    let analysis: unknown;
    try {
      analysis = parseJson(aiResult.text);
    } catch {
      await releaseAiCredit(user.id);
      creditReserved = false;
      return NextResponse.json({ error: "The AI returned an invalid analysis format." }, { status: 502 });
    }

    creditReserved = false;
    return NextResponse.json({
      analysis,
      provider: aiResult.provider,
      model: aiResult.model,
      remainingAi: credit.entitlements.remainingAi,
    });
  } catch (error) {
    console.error("CV analysis error", { stage, error });
    if (creditReserved) await releaseAiCredit(user.id);

    const message = error instanceof Error ? error.message : "";
    if (message === "No readable text was found in the CV.") {
      return NextResponse.json(
        { error: "No readable text was found in the CV. Please upload a text-based PDF or DOCX." },
        { status: 422 },
      );
    }

    return NextResponse.json({ error: `CV analysis failed at step: ${stage}. Please retry once; if it repeats, share this exact step with support.` }, { status: 500 });
  }
}
