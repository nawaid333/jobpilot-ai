import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowedRecommendations = new Set(["apply", "consider", "skip"]);

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const jobId = body?.jobId ? String(body.jobId) : "";
    const profile = await prisma.careerProfile.findUnique({ where: { userId: user.id } });
    const preferences = await prisma.jobPreferences.findUnique({ where: { userId: user.id } });

    if (!profile || !jobId) {
      return NextResponse.json({ error: "Career profile and saved job are required." }, { status: 400 });
    }

    const application = await prisma.application.findFirst({
      where: { userId: user.id, jobId },
      include: { job: true },
    });
    if (!application) {
      return NextResponse.json({ error: "Save this job to your tracker before tailoring it." }, { status: 404 });
    }

    const key = process.env.OPENAI_API_KEY;
    if (!key) return NextResponse.json({ error: "AI tailoring service is not configured." }, { status: 503 });

    const prompt = `Create an application-ready, truthful tailoring package. Never invent experience, metrics, employers, education, certifications or skills. Only reframe facts explicitly present in the candidate profile. Return ONLY valid JSON with exactly these keys: fitSummary, tailoredSummary, resumeEdits (array of {section,original,suggested,reason}), coverLetter, missingRequirements (string[]), applicationRecommendation (apply|consider|skip).
Candidate profile: ${JSON.stringify(profile)}
Job preferences: ${JSON.stringify(preferences)}
Job: ${JSON.stringify(application.job)}`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
      }),
    });

    if (!response.ok) return NextResponse.json({ error: "AI tailoring service failed." }, { status: 502 });

    const data = await response.json();
    const text = data.output_text || data.output?.flatMap((x: { content?: { text?: string }[] }) => x.content || []).map((x: { text?: string }) => x.text || "").join("") || "";
    const result = JSON.parse(text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim());

    if (
      typeof result.fitSummary !== "string" ||
      typeof result.tailoredSummary !== "string" ||
      !Array.isArray(result.resumeEdits) ||
      typeof result.coverLetter !== "string" ||
      !Array.isArray(result.missingRequirements) ||
      !allowedRecommendations.has(result.applicationRecommendation)
    ) {
      return NextResponse.json({ error: "AI returned an invalid tailoring package." }, { status: 502 });
    }

    const saved = await prisma.tailoredApplication.upsert({
      where: { applicationId: application.id },
      create: {
        applicationId: application.id,
        tailoredSummary: result.tailoredSummary,
        resumeEdits: result.resumeEdits,
        coverLetter: result.coverLetter,
        missingRequirements: result.missingRequirements,
        recommendation: result.applicationRecommendation,
      },
      update: {
        tailoredSummary: result.tailoredSummary,
        resumeEdits: result.resumeEdits,
        coverLetter: result.coverLetter,
        missingRequirements: result.missingRequirements,
        recommendation: result.applicationRecommendation,
      },
    });

    return NextResponse.json({ result: { ...result, id: saved.id }, job: application.job, applicationId: application.id, persisted: true });
  } catch {
    return NextResponse.json({ error: "Unable to create the tailored application package." }, { status: 400 });
  }
}
