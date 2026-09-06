import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 16 * 1024;

function buildDraft(input: { name: string; company: string; role: string; appliedAt: Date | null }) {
  const greeting = input.name ? `Hi ${input.name},` : "Hi there,";
  const applied = input.appliedAt
    ? `I’m following up on my application for the ${input.role} position, which I submitted on ${input.appliedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`
    : `I’m following up on my application for the ${input.role} position.`;

  return {
    subject: `Following up — ${input.role} application`,
    body: `${greeting}\n\n${applied} I remain very interested in the opportunity at ${input.company} and would be glad to provide any additional information that may be helpful.\n\nThank you for your time and consideration. I look forward to hearing from you.\n\nBest,\n${input.name || "Your Name"}`,
  };
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimitResponse(rateLimit(`agent-follow-up:${user.id}`, 20, 60_000));
  if (limited) return limited;

  const length = request.headers.get("content-length");
  if (length && Number.isFinite(Number(length)) && Number(length) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }

  try {
    const body = await request.json();
    const applicationId = typeof body?.applicationId === "string" ? body.applicationId : "";
    if (!applicationId) return NextResponse.json({ error: "applicationId is required." }, { status: 400 });

    const application = await prisma.application.findFirst({
      where: { id: applicationId, userId: user.id },
      include: { job: true },
    });
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });
    if (!["Applied", "Interview"].includes(application.status)) {
      return NextResponse.json({ error: "Follow-up drafts are available for Applied or Interview applications." }, { status: 409 });
    }

    const draft = buildDraft({
      name: user.name || "",
      company: application.job.company,
      role: application.job.title,
      appliedAt: application.appliedAt,
    });

    return NextResponse.json({ ok: true, applicationId: application.id, draft, requiresReview: true });
  } catch {
    return NextResponse.json({ error: "Could not generate follow-up draft." }, { status: 400 });
  }
}
