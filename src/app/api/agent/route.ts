import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

function daysSince(date: Date | null) {
  if (!date) return 0;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimit(`agent:${user.id}`, 60, 60_000);
  const response = rateLimitResponse(limited);
  if (response) return response;

  const [applications, signals] = await Promise.all([
    prisma.application.findMany({ where: { userId: user.id }, include: { job: true, tailoredApplication: true }, orderBy: { updatedAt: "desc" }, take: 200 }),
    prisma.emailSignal.findMany({ where: { userId: user.id }, include: { job: true, application: { include: { job: true } } }, orderBy: { receivedAt: "desc" }, take: 50 }),
  ]);

  const actions: any[] = [];
  for (const app of applications) {
    const latest = signals.find((s) => s.applicationId === app.id);
    const age = daysSince(app.appliedAt || app.updatedAt);
    const context = { applicationId: app.id, status: app.status, hasTailored: !!app.tailoredApplication, jobUrl: app.job.url };
    if (app.status === "Offer") actions.push({ id: `offer-${app.id}`, type: "offer", priority: 5, title: "Review offer", company: app.job.company, role: app.job.title, reason: "An offer is in your tracker. Review the package and decide your next step.", ...context });
    else if (app.status === "Interview") actions.push({ id: `interview-${app.id}`, type: "interview", priority: 5, title: "Prepare for interview", company: app.job.company, role: app.job.title, reason: "This application is marked Interview. Use the interview coach before the conversation.", ...context });
    else if (latest?.category === "assessment" && !latest.applied) actions.push({ id: `assessment-${latest.id}`, type: "assessment", priority: 4, title: "Complete assessment", company: app.job.company, role: app.job.title, reason: latest.subject || latest.reason, ...context });
    else if (app.status === "Applied" && age >= 7) actions.push({ id: `followup-${app.id}`, type: "follow-up", priority: 3, title: "Follow up", company: app.job.company, role: app.job.title, reason: `No tracker update for ${age} days. Review the latest recruiter signal and prepare a follow-up.`, ...context });
    else if ((app.status === "Saved" || app.status === "Preparing") && !app.tailoredApplication) actions.push({ id: `tailor-${app.id}`, type: "tailor", priority: 2, title: "Tailor application", company: app.job.company, role: app.job.title, reason: "This saved job does not have a tailored application package yet.", ...context });
  }

  for (const signal of signals.filter((s) => !s.applicationId && s.ambiguous)) {
    actions.push({ id: `review-${signal.id}`, type: "review", priority: 4, title: "Review email match", company: signal.job?.company || "Unknown company", role: signal.job?.title || "Recruiting email", reason: "JobPilot could not safely identify the application. Review the match before linking it.", signalId: signal.id });
  }

  actions.sort((a, b) => b.priority - a.priority);
  return NextResponse.json({ actions: actions.slice(0, 12), summary: { activeApplications: applications.filter((a) => a.status !== "Rejected").length, needsAttention: actions.length, prepared: applications.filter((a) => !!a.tailoredApplication).length, inboxSignals: signals.length }, policy: "JobPilot recommends and prepares actions. It does not submit applications or send emails automatically." });
}
