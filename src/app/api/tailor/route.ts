import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profile, job } = body;
    if (!profile || !job) return NextResponse.json({ error: "Profile and job are required." }, { status: 400 });
    const key = process.env.OPENAI_API_KEY;
    if (!key) return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 503 });

    const prompt = `Create an application-ready, truthful tailoring package for this candidate and job. Never invent experience, metrics, employers, education, certifications or skills. Only reframe facts explicitly present in the candidate profile. Return ONLY valid JSON with keys: fitSummary (string), tailoredSummary (string), resumeEdits (array of {section:string, original:string, suggested:string, reason:string}), coverLetter (string), missingRequirements (string[]), applicationRecommendation ("apply"|"consider"|"skip"). Candidate profile: ${JSON.stringify(profile)} Job: ${JSON.stringify(job)}`;
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "gpt-5.6-luna", input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }] }) });
    if (!response.ok) return NextResponse.json({ error: "AI tailoring service failed." }, { status: 502 });
    const data = await response.json();
    const text = data.output_text || data.output?.flatMap((x: { content?: { text?: string }[] }) => x.content || []).map(x => x.text || "").join("") || "";
    const clean = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    const result = JSON.parse(clean);
    return NextResponse.json({ result });
  } catch { return NextResponse.json({ error: "Unable to create the tailored application package." }, { status: 400 }); }
}
