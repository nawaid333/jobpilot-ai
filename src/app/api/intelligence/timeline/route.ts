import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_APPLICATIONS = 100;
const MAX_EVENTS_PER_APPLICATION = 50;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const applications = await prisma.application.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        appliedAt: true,
        job: true,
        emailSignals: {
          orderBy: { receivedAt: "asc" },
          take: MAX_EVENTS_PER_APPLICATION,
          select: {
            id: true,
            category: true,
            suggestedStatus: true,
            subject: true,
            reason: true,
            recruiterName: true,
            recruiterEmail: true,
            receivedAt: true,
            createdAt: true,
            matchedScore: true,
            confidence: true,
            applied: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: MAX_APPLICATIONS,
    });
    const timeline = applications.map((a) => ({
      applicationId: a.id,
      job: a.job,
      status: a.status,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      appliedAt: a.appliedAt,
      events: a.emailSignals.map((s) => ({
        id: s.id,
        category: s.category,
        status: s.suggestedStatus,
        subject: s.subject,
        reason: s.reason,
        recruiterName: s.recruiterName,
        recruiterEmail: s.recruiterEmail,
        receivedAt: s.receivedAt || s.createdAt,
        confidence: s.matchedScore ?? s.confidence,
        applied: s.applied,
      })),
    }));
    return NextResponse.json({ timeline, limit: MAX_APPLICATIONS, eventLimit: MAX_EVENTS_PER_APPLICATION }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to load application timeline right now." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
