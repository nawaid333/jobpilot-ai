import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get("applicationId");
  if (!applicationId) return NextResponse.json({ error: "applicationId is required" }, { status: 400 });

  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId: user.id },
    include: { job: true, tailoredApplication: true, agentActions: { where: { actionKey: `review-materials:${applicationId}`, status: "completed" }, take: 1 } },
  });
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const tailored = application.tailoredApplication;
  const reviewed = application.agentActions.length > 0;
  const checks = [
    { key: "profile", label: "Career profile available", ready: true },
    { key: "job", label: "Job opportunity saved", ready: !!application.job },
    { key: "tailored", label: "Tailored application generated", ready: !!tailored },
    { key: "review", label: "Materials reviewed", ready: reviewed },
    { key: "submission", label: "Application submitted", ready: ["Applied", "Interview", "Offer", "Rejected"].includes(application.status) },
  ];

  return NextResponse.json({
    applicationId: application.id,
    status: application.status,
    readiness: Math.round(checks.filter(c => c.ready).length / checks.length * 100),
    checks,
    missingRequirements: Array.isArray(tailored?.missingRequirements) ? tailored.missingRequirements : [],
    recommendation: tailored?.recommendation ?? "Generate a tailored package before submitting.",
    reviewed,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const applicationId = typeof body.applicationId === "string" ? body.applicationId : "";
  if (!applicationId) return NextResponse.json({ error: "applicationId is required" }, { status: 400 });

  const application = await prisma.application.findFirst({ where: { id: applicationId, userId: user.id }, include: { tailoredApplication: true } });
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (!application.tailoredApplication) return NextResponse.json({ error: "Generate the tailored package before marking materials reviewed." }, { status: 400 });

  const action = await prisma.agentAction.upsert({
    where: { userId_actionKey: { userId: user.id, actionKey: `review-materials:${applicationId}` } },
    update: { status: "completed", updatedAt: new Date(), title: "Materials reviewed", reason: "User confirmed the tailored application materials were reviewed.", priority: 0, type: "review" },
    create: { userId: user.id, applicationId, actionKey: `review-materials:${applicationId}`, type: "review", title: "Materials reviewed", reason: "User confirmed the tailored application materials were reviewed.", priority: 0, status: "completed" },
  });

  return NextResponse.json({ ok: true, reviewed: true, actionId: action.id });
}
