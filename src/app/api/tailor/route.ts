import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consumeAiCredit } from "@/lib/entitlements";
import { rateLimit } from "@/lib/rate-limit";

const allowedRecommendations = new Set(["apply", "consider", "skip"]);

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = rateLimit(`tailor:${user.id}`, 10, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many tailoring requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  try {
    const body = await request.json();
    const jobId = body?.jobId ? String(body.jobId) : "";
    const profile = await prisma.careerProfile.findUnique({ where: { userId: user.id } });
    const preferences = await prisma.jobPreferences.findUnique({ where: { userId: user.id } });
    if (!profile || !jobId) return NextResponse.json({ error: "Career profile and saved job are required." }, { status: 400 });

    const application = await prisma.application.findFirst({ where: { userId: user.id, jobId }, include: { job: true } });
    if (!application) return NextResponse.json({ error: "Save this job to your tracker before tailoring it." }, { status: 404 });
    if (["Applied", "Interview", "Offer", "Rejected"].includes(application.status)) {
      return NextResponse.json({ error: `This application is already ${application.status.toLowerCase()}. Tailoring is still available from the tracker.` }, { status: 409 });
    }

    const key = process.env.OPENAI_API_KEY;
    if (!key) return NextResponse.json({ error: "AI tailoring service is not configured." }, { status: 503 });
    const credit = await consumeAiCredit(user.id);
    if (!credit.ok) return NextResponse.json({ error: "Monthly AI limit reached.", plan: credit.entitlements.planKey, usage: credit.entitlements.usage, remainingAi: 0 }, { status: 429 });
    const prompt = `Create an application-ready, truthful tailoring package. Never invent experience, metrics, employers, education, certifications or skills. Only reframe facts explicitly present in the candidate profile. Return ONLY valid JSON with exactly these keys: fitSummary, tailoredSummary, resumeEdits (array of {section,original,suggested,reason}), coverLetter, missingRequirements (string[]), applicationRecommendation (apply|consider|skip).
Candidate profile: ${JSON.stringify(profile)}
Job preferences: ${JSON.stringify(preferences)}
Job: ${JSON.stringify(application.job)}`;
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "gpt-5.6-luna", input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }] }) });
    if (!response.ok) return NextResponse.json({ error: "AI tailoring service failed." }, { status: 502 });
    const data = await response.json();
    const text = data.output_text || data.output?.flatMap((x: { content?: { text?: string }[] }) => x.content || []).map((x: { text?: string }) => x.text || "").join("") || "";
    const result = JSON.parse(text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim());
    if (typeof result.fitSummary !== "string" || typeof result.tailoredSummary !== "string" || !Array.isArray(result.resumeEdits) || typeof result.coverLetter !== "string" || !Array.isArray(result.missingRequirements) || !allowedRecommendations.has(result.applicationRecommendation)) return NextResponse.json({ error: "AI returned an invalid tailoring package." }, { status: 502 });
    const saved = await prisma.tailoredApplication.upsert({ where: { applicationId: application.id }, create: { applicationId: application.id, tailoredSummary: result.tailoredSummary, resumeEdits: result.resumeEdits, coverLetter: result.coverLetter, missingRequirements: result.missingRequirements, recommendation: result.applicationRecommendation }, update: { tailoredSummary: result.tailoredSummary, resumeEdits: result.resumeEdits, coverLetter: result.coverLetter, missingRequirements: result.missingRequirements, recommendation: result.applicationRecommendation } });
    const updatedApplication = application.status === "Saved" ? await prisma.application.update({ where: { id: application.id }, data: { status: "Preparing" } }) : application;
    return NextResponse.json({ result: { ...result, id: saved.id }, job: application.job, applicationId: application.id, status: updatedApplication.status, persisted: true, remainingAi: credit.entitlements.remainingAi });
  } catch { return NextResponse.json({ error: "Unable to create the tailored application package." }, { status: 400 }); }
}
