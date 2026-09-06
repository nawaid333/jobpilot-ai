import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { actionKey } from "@/lib/agent-actions";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimitResponse(rateLimit(`agent-actions-read:${user.id}`, 60, 60_000));
  if (limited) return limited;
  const actions = await prisma.agentAction.findMany({
    where: { userId: user.id, status: "pending" },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 50,
  });
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
    else if (app.status === "Applied" && Math.floor((Date.now() - (app.appliedAt || app.updatedAt).getTime()) / 86400000) >= 7) add({ applicationId: app.id, type: "follow-up", title: "Follow up", reason: "No tracker update for 7+ days. Review the latest signal and prepare a follow-up.", priority: 3 });
    else if ((app.status === "Saved" || app.status === "Preparing") && !app.tailoredApplication) add({ applicationId: app.id, type: "tailor", title: "Tailor application", reason: "This saved job does not have a tailored application package yet.", priority: 2 });
  }

  for (const signal of signals.filter((s) => !s.applicationId && s.ambiguous)) add({ signalId: signal.id, type: "review", title: "Review email match", reason: "JobPilot could not safely identify the application. Review the match before linking it.", priority: 4 });

  for (const candidate of candidates) {
    const key = actionKey(candidate);
    await prisma.agentAction.upsert({
      where: { userId_actionKey: { userId: user.id, actionKey: key } },
      create: { id: crypto.randomUUID(), userId: user.id, applicationId: candidate.applicationId ?? null, signalId: candidate.signalId ?? null, actionKey: key, type: candidate.type, title: candidate.title, reason: candidate.reason, priority: candidate.priority, status: "pending" },
      update: { title: candidate.title, reason: candidate.reason, priority: candidate.priority, updatedAt: new Date() },
    });
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
    const updated = await prisma.agentAction.updateMany({ where: { id: body.id, userId: user.id, status: "pending" }, data: { status: body.status, updatedAt: new Date() } });
    if (!updated.count) return NextResponse.json({ error: "Pending action not found." }, { status: 404 });
    return NextResponse.json({ ok: true, status: body.status });
  } catch {
    return NextResponse.json({ error: "Could not update agent action." }, { status: 400 });
  }
}
