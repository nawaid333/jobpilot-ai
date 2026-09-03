import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consumeAiCredit } from "@/lib/entitlements";
import { rateLimit } from "@/lib/rate-limit";

const allowedRecommendations = new Set(["apply", "consider", "skip"]);
const MAX_BODY_BYTES = 64_000;
const MAX_EDITS = 8;
const MAX_MISSING = 8;

function cleanString(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned ? cleaned.slice(0, max) : null;
}

function validateResult(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const result = value as Record<string, unknown>;
  const fitSummary = cleanString(result.fitSummary, 1_000);
  const tailoredSummary = cleanString(result.tailoredSummary, 2_500);
  const coverLetter = cleanString(result.coverLetter, 8_000);
  const applicationRecommendation = typeof result.applicationRecommendation === "string" ? result.applicationRecommendation : "";
  if (!fitSummary || !tailoredSummary || !coverLetter || !allowedRecommendations.has(applicationRecommendation)) return null;
  if (!Array.isArray(result.resumeEdits) || !Array.isArray(result.missingRequirements)) return null;

  const resumeEdits = result.resumeEdits.slice(0, MAX_EDITS).map((edit) => {
    if (!edit || typeof edit !== "object") return null;
    const item = edit as Record<string, unknown>;
    const section = cleanString(item.section, 80);
    const original = cleanString(item.original, 1_000);
    const suggested = cleanString(item.suggested, 1_500);
    const reason = cleanString(item.reason, 500);
    return section && original && suggested && reason ? { section, original, suggested, reason } : null;
  }).filter((edit): edit is { section: string; original: string; suggested: string; reason: string } => Boolean(edit));

  const missingRequirements = result.missingRequirements.slice(0, MAX_MISSING)
    .map((item) => cleanString(item, 300))
    .filter((item): item is string => Boolean(item));

  return { fitSummary, tailoredSummary, resumeEdits, coverLetter, missingRequirements, applicationRecommendation };
}

function invalidOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const expected = new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").origin;
    return new URL(origin).origin !== expected;
  } catch {
    return true;
  }
}

async function readJsonWithinLimit(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Request body is unavailable.");
  const decoder = new TextDecoder();
  let size = 0;
  let raw = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) throw Object.assign(new Error("Request is too large."), { code: "PAYLOAD_TOO_LARGE" });
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    return JSON.parse(raw) as Record<string, unknown>;
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = rateLimit(`tailor:${user.id}`, 10, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many tailoring requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  if (invalidOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) return NextResponse.json({ error: "Request is too large." }, { status: 413 });

    const body = await readJsonWithinLimit(request);
    const jobId = body?.jobId ? String(body.jobId).slice(0, 200) : "";
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
    const prompt = `Create an application-ready, truthful tailoring package. Never invent experience, metrics, employers, education, certifications or skills. Only reframe facts explicitly present in the candidate profile. Return ONLY valid JSON with exactly these keys: fitSummary, tailoredSummary, resumeEdits (array of {section,original,suggested,reason}), coverLetter, missingRequirements (string[]), applicationRecommendation (apply|consider|skip).
Candidate profile: ${JSON.stringify(profile)}
Job preferences: ${JSON.stringify(preferences)}
Job: ${JSON.stringify(application.job)}`;
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "gpt-5.6-luna", input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }] }) });
    if (!response.ok) return NextResponse.json({ error: "AI tailoring service failed." }, { status: 502 });
    const data = await response.json();
    const text = data.output_text || data.output?.flatMap((x: { content?: { text?: string }[] }) => x.content || []).map((x: { text?: string }) => x.text || "").join("") || "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim());
    } catch {
      return NextResponse.json({ error: "AI returned an invalid tailoring package." }, { status: 502 });
    }
    const result = validateResult(parsed);
    if (!result) return NextResponse.json({ error: "AI returned an invalid tailoring package." }, { status: 502 });

    const credit = await consumeAiCredit(user.id);
    if (!credit.ok) return NextResponse.json({ error: "Monthly AI limit reached.", plan: credit.entitlements.planKey, usage: credit.entitlements.usage, remainingAi: 0 }, { status: 429 });

    const saved = await prisma.tailoredApplication.upsert({ where: { applicationId: application.id }, create: { applicationId: application.id, tailoredSummary: result.tailoredSummary, resumeEdits: result.resumeEdits, coverLetter: result.coverLetter, missingRequirements: result.missingRequirements, recommendation: result.applicationRecommendation }, update: { tailoredSummary: result.tailoredSummary, resumeEdits: result.resumeEdits, coverLetter: result.coverLetter, missingRequirements: result.missingRequirements, recommendation: result.applicationRecommendation } });
    const updatedApplication = application.status === "Saved" ? await prisma.application.update({ where: { id: application.id }, data: { status: "Preparing" } }) : application;
    return NextResponse.json({ result: { ...result, id: saved.id }, job: application.job, applicationId: application.id, status: updatedApplication.status, persisted: true, remainingAi: credit.entitlements.remainingAi }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "PAYLOAD_TOO_LARGE") return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    return NextResponse.json({ error: "Unable to create the tailored application package." }, { status: 400 });
  }
}
