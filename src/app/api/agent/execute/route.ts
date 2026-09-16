import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { buildAgentIdempotencyKey, scopeAgentIdempotencyKey } from "@/lib/agent-idempotency";

const safeActions = new Set(["prepare", "mark-preparing", "mark-applied", "follow-up", "complete-follow-up", "snooze-follow-up", "interview", "assessment", "offer"]);
const RANK: Record<string, number> = { Saved: 0, Preparing: 1, Applied: 2, Interview: 3, Offer: 4, Rejected: 4 };
const FINAL_STATUSES = new Set(["Interview", "Offer", "Rejected"]);
const DEFAULT_FOLLOW_UP_DELAY_DAYS = 3;
const FOLLOW_UP_OPTIONS = new Set([1, 3, 7, 14]);

function nextFollowUpDate(from = new Date(), days = DEFAULT_FOLLOW_UP_DELAY_DAYS) { const due = new Date(from); due.setDate(due.getDate() + days); due.setHours(12, 0, 0, 0); return due; }

async function startAction(userId: string, applicationId: string, actionType: string, idempotencyKey: string) {
  try { return { created: true, action: await prisma.agentAction.create({ data: { id: crypto.randomUUID(), userId, applicationId, actionType, status: "processing", idempotencyKey } }) }; }
  catch (error: any) { if (error?.code !== "P2002") throw error; const existing = await prisma.agentAction.findUnique({ where: { idempotencyKey } }); if (!existing) throw error; return { created: false, action: existing }; }
}

async function finishAction(db: any, id: string, result: Record<string, unknown>) { await db.agentAction.update({ where: { id }, data: { status: "completed", result: result as any, completedAt: new Date() } }); }
async function failAction(id: string, message: string, status = 400) { await prisma.agentAction.update({ where: { id }, data: { status: "failed", result: { error: message, status } as any } }).catch(() => undefined); }

function replayActionResult(result: unknown) {
  if (!result || typeof result !== "object") return null;
  const stored = result as Record<string, unknown>;
  const status = typeof stored.status === "number" && stored.status >= 100 && stored.status <= 599 ? stored.status : 200;
  return { body: stored, status };
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimit(`agent-execute:${user.id}`, 30, 60_000); const rateResponse = rateLimitResponse(limited); if (rateResponse) return rateResponse;
  let claimedId: string | null = null;
  try {
    const body = await request.json();
    const action = typeof body?.action === "string" ? body.action : "";
    const applicationId = typeof body?.applicationId === "string" ? body.applicationId.trim() : "";
    const requestedDays = Number(body?.followUpDays);
    const followUpDays = Number.isInteger(requestedDays) && FOLLOW_UP_OPTIONS.has(requestedDays) ? requestedDays : DEFAULT_FOLLOW_UP_DELAY_DAYS;
    if (!applicationId || applicationId.length > 100 || !safeActions.has(action)) return NextResponse.json({ error: "Valid action and application are required." }, { status: 400 });
    const application = await prisma.application.findFirst({ where: { id: applicationId, userId: user.id }, include: { job: true, tailoredApplication: true } });
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });
    const suppliedKey = request.headers.get("Idempotency-Key")?.trim();
    const idempotencyKey = suppliedKey && suppliedKey.length <= 200 ? scopeAgentIdempotencyKey(user.id, application.id, action, suppliedKey) : buildAgentIdempotencyKey(action, application.id, followUpDays, application.followUpDueAt);
    const claim = await startAction(user.id, application.id, action, idempotencyKey);
    if (!claim.created) {
      if (claim.action.status === "processing") return NextResponse.json({ error: "This Agent action is already being processed. Refresh and try again if it does not complete." }, { status: 409 });
      const replay = replayActionResult(claim.action.result);
      if (replay) return NextResponse.json(replay.body, { status: replay.status });
      return NextResponse.json({ error: "This Agent action was already completed." }, { status: 200 });
    }
    claimedId = claim.action.id;
    const id = encodeURIComponent(application.id); let response: any; let applyMutation: ((db: any) => Promise<void>) | null = null;
    if (action === "prepare") {
      if (!application.tailoredApplication) response = { ok: true, next: "tailor", redirect: `/tailor?applicationId=${id}`, message: "Create the tailored package before preparing submission." };
      else if (FINAL_STATUSES.has(application.status)) response = { error: `Cannot prepare an application already marked ${application.status}.`, status: 409 };
      else { response = { ok: true, next: "review", redirect: `/automation?applicationId=${id}`, message: "Your tailored package is ready for review." }; if (RANK[application.status] < RANK.Preparing) applyMutation = (db) => db.application.update({ where: { id: application.id }, data: { status: "Preparing" } }).then(() => undefined); }
    } else if (action === "mark-preparing") {
      if (FINAL_STATUSES.has(application.status) || application.status === "Applied") response = { error: `Cannot move a ${application.status} application back to Preparing.`, status: 409 };
      else if (application.status === "Preparing") response = { ok: true, status: application.status, alreadyRecorded: true, message: "Application is already in Preparing." };
      else { response = { ok: true, status: "Preparing", message: "Application moved to Preparing." }; applyMutation = (db) => db.application.update({ where: { id: application.id }, data: { status: "Preparing" } }).then(() => undefined); }
    } else if (action === "mark-applied") {
      if (FINAL_STATUSES.has(application.status)) response = { error: `Cannot mark a ${application.status} application as Applied.`, status: 409 };
      else if (application.status === "Applied") response = { ok: true, status: application.status, alreadyRecorded: true, message: "Application is already marked as Applied." };
      else { response = { ok: true, status: "Applied", message: "Marked as Applied. JobPilot did not submit the application." }; applyMutation = (db) => db.application.update({ where: { id: application.id }, data: { status: "Applied", appliedAt: application.appliedAt || new Date() } }).then(() => undefined); }
    } else if (action === "follow-up") {
      if (FINAL_STATUSES.has(application.status)) response = { error: `Cannot schedule Agent follow-up for a ${application.status} application.`, status: 409 };
      else if (application.followUpDueAt) response = { ok: true, next: "follow-up", redirect: `/application/${id}`, followUpDueAt: application.followUpDueAt.toISOString(), message: "A follow-up is already scheduled. Open the application to review it." };
      else { const dueAt = nextFollowUpDate(new Date(), followUpDays); response = { ok: true, next: "follow-up", redirect: `/application/${id}`, followUpDueAt: dueAt.toISOString(), followUpDays, message: `Follow-up scheduled for ${dueAt.toLocaleDateString()}. Review the application before contacting the recruiter.` }; applyMutation = (db) => db.application.update({ where: { id: application.id }, data: { followUpDueAt: dueAt } }).then(() => undefined); }
    } else if (action === "complete-follow-up") {
      if (!application.followUpDueAt) response = { error: "No scheduled follow-up exists for this application.", status: 409 };
      else { const previousDueAt = application.followUpDueAt; response = { ok: true, next: "follow-up-complete", message: "Follow-up marked complete. No email was sent automatically.", previousDueAt: previousDueAt.toISOString() }; applyMutation = (db) => db.application.update({ where: { id: application.id }, data: { followUpDueAt: null } }).then(() => undefined); }
    } else if (action === "snooze-follow-up") {
      if (!application.followUpDueAt) response = { error: "No scheduled follow-up exists for this application.", status: 409 };
      else { const dueAt = nextFollowUpDate(new Date(), followUpDays); response = { ok: true, next: "follow-up", followUpDueAt: dueAt.toISOString(), followUpDays, message: `Follow-up snoozed until ${dueAt.toLocaleDateString()}.` }; applyMutation = (db) => db.application.update({ where: { id: application.id }, data: { followUpDueAt: dueAt } }).then(() => undefined); }
    } else if (action === "interview") response = application.status === "Offer" || application.status === "Rejected" ? { error: `Cannot prepare an interview for a ${application.status} application.`, status: 409 } : { ok: true, next: "interview", redirect: `/interview?applicationId=${id}`, message: "Interview preparation opened with this application." };
    else if (action === "assessment") response = application.status === "Offer" || application.status === "Rejected" ? { error: `Cannot prepare an assessment for a ${application.status} application.`, status: 409 } : { ok: true, next: "assessment", redirect: `/intelligence?applicationId=${id}`, message: "Assessment context opened for this application." };
    else if (action === "offer") response = application.status === "Offer" || application.status === "Rejected" ? { error: `Cannot reopen an offer action for a ${application.status} application.`, status: 409 } : { ok: true, next: "offer", redirect: `/application/${id}`, message: "Offer review opened for this application." };
    else response = { error: "Unsupported agent action.", status: 400 };
    if (response.ok) {
      const storedResult = { ...response }; delete storedResult.status;
      await prisma.$transaction(async (db) => { if (applyMutation) await applyMutation(db); await finishAction(db, claimedId!, storedResult); });
    } else await failAction(claimedId, response.error || "Agent action failed.", response.status || 400);
    return NextResponse.json(response, { status: response.status || 200 });
  } catch {
    if (claimedId) await failAction(claimedId, "Could not execute agent action.");
    return NextResponse.json({ error: "Could not execute agent action." }, { status: 400 });
  }
}
