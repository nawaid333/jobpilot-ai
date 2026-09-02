import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function tokens(value: string) {
  return value.toLowerCase().split(/[^a-z0-9+#.-]+/).filter(x => x.length > 2);
}

function score(job: any, profile: any, prefs: any) {
  const text = [job.title, job.company, job.location, job.mode, job.level, job.description, ...(job.skills || [])].join(" ").toLowerCase();
  const evidence = [...(profile?.skills || []), ...(profile?.targetRoles || []), prefs?.roles || "", prefs?.keywords || ""].flatMap(tokens);
  const unique = [...new Set(evidence)];
  const hits = unique.filter(t => text.includes(t));
  let value = 35 + Math.min(40, hits.length * 5);
  const locations = tokens((prefs?.locations || "").replace(/[,;]/g, " "));
  if (locations.some(x => job.location.toLowerCase().includes(x))) value += 10;
  if (prefs?.workMode && prefs.workMode !== "Any" && String(job.mode).toLowerCase() === prefs.workMode.toLowerCase()) value += 8;
  if (prefs?.seniority && prefs.seniority !== "Any" && String(job.level).toLowerCase().includes(prefs.seniority.split(" ")[0].toLowerCase())) value += 5;
  return Math.min(99, value);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [profile, preferences, applications, jobs] = await Promise.all([
    prisma.careerProfile.findUnique({ where: { userId: user.id } }),
    prisma.jobPreferences.findUnique({ where: { userId: user.id } }),
    prisma.application.findMany({ where: { userId: user.id }, select: { jobId: true } }),
    prisma.job.findMany({ orderBy: { lastSeenAt: "desc" }, take: 100 }),
  ]);
  if (!profile) return NextResponse.json({ error: "Build your career profile first." }, { status: 400 });

  const saved = new Set(applications.map(a => a.jobId));
  const recommendations = jobs
    .filter(job => !saved.has(job.id))
    .map(job => ({ job, score: score(job, profile, preferences) }))
    .filter(x => x.score >= 55)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(x => ({ ...x.job, matchScore: x.score }));

  return NextResponse.json({ recommendations, generatedAt: new Date().toISOString(), strategy: "profile-preferences-evidence" });
}
