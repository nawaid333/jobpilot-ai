import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const safeActions = new Set(["prepare", "mark-preparing", "mark-applied", "follow-up", "complete-follow-up", "snooze-follow-up", "interview", "assessment", "offer"]);
const RANK: Record<string, number> = { Saved: 0, Preparing: 1, Applied: 2, Interview: 3, Offer: 4, Rejected: 4 };
const FINAL_STATUSES = new Set(["Interview", "Offer", "Rejected"]);
const DEFAULT_FOLLOW_UP_DELAY_DAYS = 3;
const FOLLOW_UP_OPTIONS = new Set([1, 3, 7, 14]);

async function record(userId: string, applicationId: string, actionType: string, status: string, result: unknown) {
  await prisma.agentAction.create({ data: { id: crypto.randomUUID(), userId, applicationId, actionType, status, result: result as any, completedAt: status === "completed" ? new Date() : null } });
}
function nextFollowUpDate(from = new Date(), days = DEFAULT_FOLLOW_UP_DELAY_DAYS) { const due = new Date(from); due.setDate(due.getDate() + days); due.setHours(12, 0, 0, 0); return due; }

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimit(`agent-execute:${user.id}`, 30, 60_000); const rateResponse = rateLimitResponse(limited); if (rateResponse)return rateResponse;
  try {
    const body = await request.json();
    const action = typeof body?.action === "string" ? body.action : "";
    const applicationId = typeof body?.applicationId === "string" ? body.applicationId.trim() : "";
    const requestedDays = Number(body?.followUpDays);
    const followUpDays = Number.isInteger(requestedDays) && FOLLOW_UP_OPTIONS.has(requestedDays) ? requestedDays : DEFAULT_FOLLOW_UP_DELAY_DAYS;
    if (!applicationId || applicationId.length > 100 || !safeActions.has(action)) return NextResponse.json({ error: "Valid action and application are required." }, { status: 400 });
    const application = await prisma.application.findFirst({ where: { id: applicationId, userId: user.id }, include: { job: true, tailoredApplication: true } });
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });
    const id = encodeURIComponent(application.id); let response: any;
    if (action === "prepare") {
      if (!application.tailoredApplication) response = { ok: false, next: "tailor", redirect: `/tailor?applicationId=${id}`, message: "Create the tailored package before preparing submission." };
      else if (FINAL_STATUSES.has(application.status)) response = { error: `Cannot prepare an application already marked ${application.status}.`, status: 409 };
      else { if (RANK[application.status] < RANK.Preparing) await prisma.application.update({ where: { id: application.id }, data: { status: "Preparing" } }); response = { ok: true, next: "review", redirect: `/automation?applicationId=${id}`, message: "Your tailored package is ready for review." }; }
    } else if (action === "mark-preparing") {
      if (FINAL_STATUSES.has(application.status) || application.status === "Applied") response = { error: `Cannot move a ${application.status} application back to Preparing.`, status: 409 };
      else if (application.status === "Preparing") response = { ok: true, status: application.status, alreadyRecorded: true, message: "Application is already in Preparing." };
      else { const updated = await prisma.application.update({ where: { id: application.id }, data: { status: "Preparing" } }); response = { ok: true, status: updated.status, message: "Application moved to Preparing." }; }
    } else if (action === "mark-applied") {
      if (FINAL_STATUSES.has(application.status)) response = { error: `Cannot mark a ${application.status} application as Applied.`, status: 409 };
      else if (application.status === "Applied") response = { ok: true, status: application.status, alreadyRecorded: true, message: "Application is already marked as Applied." };
      else { const updated = await prisma.application.update({ where: { id: application.id }, data: { status: "Applied", appliedAt: application.appliedAt || new Date() } }); response = { ok: true, status: updated.status, message: "Marked as Applied. JobPilot did not submit the application." }; }
    } else if (action === "follow-up") {
      if (FINAL_STATUSES.has(application.status)) response = { error: `Cannot schedule Agent follow-up for a ${application.status} application.`, status: 409 };
      else if (application.followUpDueAt) response = { ok: true, next: "follow-up", redirect: `/application/${id}`, followUpDueAt: application.followUpDueAt.toISOString(), message: "A follow-up is already scheduled. Open the application to review it." };
      else { const dueAt = nextFollowUpDate(new Date(), followUpDays); await prisma.application.update({ where: { id: application.id }, data: { followUpDueAt: dueAt } }); response = { ok: true, next: "follow-up", redirect: `/application/${id}`, followUpDueAt: dueAt.toISOString(), followUpDays, message: `Follow-up scheduled for ${dueAt.toLocaleDateString()}. Review the application before contacting the recruiter.` }; }
    } else if (action === "complete-follow-up") {
      if (!application.followUpDueAt) response = { error: "No scheduled follow-up exists for this application.", status: 409 };
      else { const previousDueAt = application.followUpDueAt; await prisma.application.update({ where: { id: application.id }, data: { followUpDueAt: null } }); response = { ok: true, next: "follow-up-complete", message: "Follow-up marked complete. No email was sent automatically.", previousDueAt: previousDueAt.toISOString() }; }
    } else if (action === "snooze-follow-up") {
      if (!application.followUpDueAt) response = { error: "No scheduled follow-up exists for this application.", status: 409 };
      else { const dueAt = nextFollowUpDate(new Date(), followUpDays); await prisma.application.update({ where: { id: application.id }, data: { followUpDueAt: dueAt } }); response = { ok: true, next: "follow-up", followUpDueAt: dueAt.toISOString(), followUpDays, message: `Follow-up snoozed until ${dueAt.toLocaleDateString()}.` }; }
    } else if (action === "interview") response = application.status === "Offer" || application.status === "Rejected" ? { error: `Cannot prepare an interview for a ${application.status} application.`, status: 409 } : { ok: true, next: "interview", redirect: `/interview?applicationId=${id}`, message: "Interview preparation opened with this application." };
    else if (action === "assessment") response = application.status === "Offer" || application.status === "Rejected" ? { error: `Cannot prepare an assessment for a ${application.status} application.`, status: 409 } : { ok: true, next: "assessment", redirect: `/intelligence?applicationId=${id}`, message: "Assessment context opened for this application." };
    else if (action === "offer") response = application.status === "Offer" || application.status === "Rejected" ? { error: `Cannot reopen an offer action for a ${application.status} application.`, status: 409 } : { ok: true, next: "offer", redirect: `/application/${id}`, message: "Offer review opened for this application." };
    else response = { error: "Unsupported agent action.", status: 400 };
    if (response.ok && !response.alreadyRecorded) await record(user.id, application.id, action, "completed", { next: response.next || null, status: response.status || application.status, followUpDueAt: response.followUpDueAt || null, followUpDays: response.followUpDays || null, message: response.message || null });
    return NextResponse.json(response, { status: response.status || 200 });
  } catch { return NextResponse.json({ error: "Could not execute agent action." }, { status: 400 }); }
}
