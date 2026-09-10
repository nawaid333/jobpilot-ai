import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const safeActions = new Set(["prepare","mark-preparing","mark-applied","follow-up","interview","assessment","offer"]);
const RANK: Record<string, number> = { Saved: 0, Preparing: 1, Applied: 2, Interview: 3, Offer: 4, Rejected: 4 };
const FINAL_STATUSES = new Set(["Interview", "Offer", "Rejected"]);

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimit(`agent-execute:${user.id}`, 30, 60_000);
  const rateResponse = rateLimitResponse(limited); if (rateResponse) return rateResponse;
  try {
    const body = await request.json();
    const action = typeof body?.action === "string" ? body.action : "";
    const applicationId = typeof body?.applicationId === "string" ? body.applicationId.trim() : "";
    if (!applicationId || applicationId.length > 100 || !safeActions.has(action)) return NextResponse.json({ error: "Valid action and application are required." }, { status: 400 });
    const application = await prisma.application.findFirst({ where: { id: applicationId, userId: user.id }, include: { job: true, tailoredApplication: true } });
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    const id = encodeURIComponent(application.id);
    if (action === "prepare") {
      if (!application.tailoredApplication) return NextResponse.json({ ok: false, next: "tailor", redirect: `/tailor?applicationId=${id}`, message: "Create the tailored package before preparing submission." });
      if (FINAL_STATUSES.has(application.status)) return NextResponse.json({ error: `Cannot prepare an application already marked ${application.status}.` }, { status: 409 });
      if (RANK[application.status] < RANK.Preparing) await prisma.application.update({ where: { id: application.id }, data: { status: "Preparing" } });
      return NextResponse.json({ ok: true, next: "review", redirect: `/automation?applicationId=${id}`, message: "Your tailored package is ready for review." });
    }
    if (action === "mark-preparing") {
      if (FINAL_STATUSES.has(application.status) || application.status === "Applied") return NextResponse.json({ error: `Cannot move a ${application.status} application back to Preparing.` }, { status: 409 });
      if (application.status === "Preparing") return NextResponse.json({ ok: true, status: application.status, alreadyRecorded: true, message: "Application is already in Preparing." });
      const updated = await prisma.application.update({ where: { id: application.id }, data: { status: "Preparing" } });
      return NextResponse.json({ ok: true, status: updated.status, message: "Application moved to Preparing." });
    }
    if (action === "mark-applied") {
      if (FINAL_STATUSES.has(application.status)) return NextResponse.json({ error: `Cannot mark a ${application.status} application as Applied.` }, { status: 409 });
      if (application.status === "Applied") return NextResponse.json({ ok: true, status: application.status, alreadyRecorded: true, message: "Application is already marked as Applied." });
      const updated = await prisma.application.update({ where: { id: application.id }, data: { status: "Applied", appliedAt: application.appliedAt || new Date() } });
      return NextResponse.json({ ok: true, status: updated.status, message: "Marked as Applied. JobPilot did not submit the application." });
    }
    if (action === "follow-up") return NextResponse.json({ ok: true, next: "follow-up", redirect: `/application/${id}`, message: "Open the application to review context and prepare the follow-up." });
    if (action === "interview") return NextResponse.json({ ok: true, next: "interview", redirect: `/interview?applicationId=${id}`, message: "Interview preparation opened with this application." });
    if (action === "assessment") return NextResponse.json({ ok: true, next: "assessment", redirect: `/intelligence?applicationId=${id}`, message: "Assessment context opened for this application." });
    if (action === "offer") return NextResponse.json({ ok: true, next: "offer", redirect: `/application/${id}`, message: "Offer review opened for this application." });
    return NextResponse.json({ error: "Unsupported agent action." }, { status: 400 });
  } catch { return NextResponse.json({ error: "Could not execute agent action." }, { status: 400 }); }
}
