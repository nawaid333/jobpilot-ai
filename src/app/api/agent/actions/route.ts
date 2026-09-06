import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { actionKey } from "@/lib/agent-actions";

const rank: Record<string, number> = { Saved: 0, Preparing: 1, Applied: 2, Interview: 3, Offer: 4, Rejected: 4 };

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimitResponse(rateLimit(`agent-actions-read:${user.id}`, 60, 60_000));
  if (limited) return limited;
  const actions = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT "id", "applicationId", "signalId", "type", "title", "reason", "priority", "status", "createdAt", "updatedAt"
    FROM "AgentAction"
    WHERE "userId" = ${user.id} AND "status" = 'pending'
    ORDER BY "priority" DESC, "createdAt" DESC
    LIMIT 50
  `;
  return NextResponse.json({ actions });
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimitResponse(rateLimit(`agent-actions-write:${user.id}`, 20, 60_000));
  if (limited) return limited;

  const [applications, signals] = await Promise.all([
    prisma.application.findMany({ where: { userId: user.id }, include: { job: true, tailoredApplication: true }, orderBy: { updatedAt: "desc" }, take: 200 }),
    prisma.emailSignal.findMany({ where: { userId: user.id }, orderBy: { receivedAt: "desc" }, take: 50 }),
  ]);

  const candidates: Array<{ applicationId?: string; signalId?: string; type: string; title: string; reason: string; priority: number }> = [];
  const seen = new Set<string>();
  const add = (x: typeof candidates[number]) => { const key = actionKey({ applicationId: x.applicationId, signalId: x.signalId, type: x.type }); if (!seen.has(key)) { seen.add(key); candidates.push(x); } };

  for (const app of applications) {
    const latest = signals.find((s) => s.applicationId === app.id);
    if (app.status === "Offer") add({ applicationId: app.id, type: "offer", title: "Review offer", reason: "An offer is in your tracker. Review the package and decide your next step.", priority: 5 });
    else if (app.status === "Interview") add({ applicationId: app.id, type: "interview", title: "Prepare for interview", reason: "This application is marked Interview. Prepare before the conversation.", priority: 5 });
    else if (latest?.category === "assessment" && !latest.applied) add({ applicationId: app.id, signalId: latest.id, type: "assessment", title: "Complete assessment", reason: latest.subject || latest.reason, priority: 4 });
    else if (latest?.category === "recruiter_response" && !latest.applied && app.status === "Applied") add({ applicationId: app.id, signalId: latest.id, type: "recruiter-response", title: "Review recruiter response", reason: latest.subject || latest.reason, priority: 4 });
    else if (app.status === "Applied" && rank[app.status] >= 2 && Math.floor((Date.now() - (app.appliedAt || app.updatedAt).getTime()) / 86400000) >= 7) add({ applicationId: app.id, type: "follow-up", title: "Follow up", reason: "No tracker update for 7+ days. Review the latest signal and prepare a follow-up.", priority: 3 });
    else if ((app.status === "Saved" || app.status === "Preparing") && !app.tailoredApplication) add({ applicationId: app.id, type: "tailor", title: "Tailor application", reason: "This saved job does not have a tailored application package yet.", priority: 2 });
  }

  for (const signal of signals.filter((s) => !s.applicationId && s.ambiguous)) add({ signalId: signal.id, type: "review", title: "Review email match", reason: "JobPilot could not safely identify the application. Review the match before linking it.", priority: 4 });

  for (const candidate of candidates) {
    const key = actionKey(candidate);
    await prisma.$executeRaw`
      INSERT INTO "AgentAction" ("id", "userId", "applicationId", "signalId", "actionKey", "type", "title", "reason", "priority", "status", "createdAt", "updatedAt")
      VALUES (${crypto.randomUUID()}, ${user.id}, ${candidate.applicationId ?? null}, ${candidate.signalId ?? null}, ${key}, ${candidate.type}, ${candidate.title}, ${candidate.reason}, ${candidate.priority}, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("userId", "actionKey") DO UPDATE SET "title" = EXCLUDED."title", "reason" = EXCLUDED."reason", "priority" = EXCLUDED."priority", "updatedAt" = CURRENT_TIMESTAMP
    `;
  }

  return NextResponse.json({ ok: true, created: candidates.length });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimitResponse(rateLimit(`agent-actions-update:${user.id}`, 30, 60_000));
  if (limited) return limited;
  try {
    const body = await req.json();
    if (!body || typeof body.id !== "string" || !["completed", "dismissed"].includes(body.status)) return NextResponse.json({ error: "id and status (completed or dismissed) are required." }, { status: 400 });
    const updated = await prisma.$executeRaw`
      UPDATE "AgentAction" SET "status" = ${body.status}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${body.id} AND "userId" = ${user.id} AND "status" = 'pending'
    `;
    if (!updated) return NextResponse.json({ error: "Pending action not found." }, { status: 404 });
    return NextResponse.json({ ok: true, status: body.status });
  } catch {
    return NextResponse.json({ error: "Could not update agent action." }, { status: 400 });
  }
}
