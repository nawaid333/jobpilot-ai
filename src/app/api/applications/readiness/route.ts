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
    include: { job: true, tailoredApplication: true },
  });
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const tailored = application.tailoredApplication;
  const checks = [
    { key: "profile", label: "Career profile available", ready: true },
    { key: "job", label: "Job opportunity saved", ready: !!application.job },
    { key: "tailored", label: "Tailored application generated", ready: !!tailored },
    { key: "review", label: "Materials reviewed", ready: !!tailored },
    { key: "submission", label: "Application submitted", ready: ["Applied", "Interview", "Offer", "Rejected"].includes(application.status) },
  ];

  return NextResponse.json({
    applicationId: application.id,
    status: application.status,
    readiness: checks.filter(c => c.ready).length / checks.length * 100,
    checks,
    missingRequirements: Array.isArray(tailored?.missingRequirements) ? tailored.missingRequirements : [],
    recommendation: tailored?.recommendation ?? "Generate a tailored package before submitting.",
  });
}
