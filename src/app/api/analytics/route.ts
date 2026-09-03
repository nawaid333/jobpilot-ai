import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DAY = 86400000;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    include: { job: true, emailSignals: { orderBy: { receivedAt: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  const count = (status: string) => applications.filter((a) => a.status === status).length;
  const tracked = applications.length;
  const applied = count("Applied") + count("Interview") + count("Offer");
  const interviews = count("Interview") + count("Offer");
  const offers = count("Offer");
  const rejected = count("Rejected");
  const responseSignals = applications.filter((a) => a.emailSignals.some((s) => ["interview", "assessment", "offer", "rejection"].includes(s.category)));
  const pct = (n: number, d: number) => d ? Math.round((n / d) * 100) : 0;

  const funnel = [
    { label: "Tracked", value: tracked },
    { label: "Applied", value: applied },
    { label: "Interview", value: interviews },
    { label: "Offer", value: offers },
  ];

  const aging = applications
    .filter((a) => !["Rejected", "Offer"].includes(a.status))
    .map((a) => ({ applicationId: a.id, title: a.job.title, company: a.job.company, status: a.status, days: Math.max(0, Math.floor((Date.now() - new Date(a.updatedAt).getTime()) / DAY)) }))
    .sort((a, b) => b.days - a.days).slice(0, 6);

  const companies = new Map<string, { applications: number; interviews: number; offers: number }>();
  for (const a of applications) {
    const row = companies.get(a.job.company) || { applications: 0, interviews: 0, offers: 0 };
    row.applications++;
    if (["Interview", "Offer"].includes(a.status)) row.interviews++;
    if (a.status === "Offer") row.offers++;
    companies.set(a.job.company, row);
  }

  const insights: string[] = [];
  if (!tracked) insights.push("Track a few genuinely relevant roles to establish a useful baseline.");
  else if (!applied) insights.push("You have tracked roles but no completed applications yet. Move the strongest fits into Preparing and apply deliberately.");
  if (applied && interviews === 0) insights.push("Applications have not converted to interviews yet. Review job fit, ATS alignment, and tailoring before increasing application volume.");
  if (interviews > 0) insights.push(`${interviews} application${interviews === 1 ? " has" : "s have"} reached interview stage. Prioritize preparation over adding low-fit applications.`);
  if (offers > 0) insights.push(`${offers} offer${offers === 1 ? " is" : "s are"} in the pipeline. Review the offer details before making a decision.`);
  if (responseSignals.length && applied) insights.push(`${pct(responseSignals.length, applied)}% of your applied-stage applications have a meaningful recruiting signal recorded.`);

  return NextResponse.json({
    summary: { tracked, applied, interviews, offers, rejected, responseRate: pct(responseSignals.length, applied), interviewRate: pct(interviews, applied), offerRate: pct(offers, applied), rejectionRate: pct(rejected, applied) },
    funnel,
    aging,
    companies: Array.from(companies.entries()).map(([company, value]) => ({ company, ...value })).sort((a, b) => b.applications - a.applications).slice(0, 6),
    insights,
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
