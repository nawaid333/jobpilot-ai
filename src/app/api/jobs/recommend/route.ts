import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

type LeverPosting = {
  id: string; text: string;
  categories?: { location?: string; allLocations?: string[]; level?: string; commitment?: string; team?: string };
  content?: { description?: string };
  urls?: { show?: string; apply?: string };
  workplaceType?: string; salaryDescription?: string;
};

function tokens(value: string) {
  return value.toLowerCase().split(/[^a-z0-9+#.-]+/).filter(x => x.length > 2);
}

function score(job: any, profile: any, prefs: any) {
  const text = [job.title, job.company, job.location, job.mode, job.level, job.description, ...(job.skills || [])].join(" ").toLowerCase();
  const roleEvidence = [...(profile?.targetRoles || []), prefs?.roles || ""].flatMap(tokens);
  const skillEvidence = [...(profile?.skills || []), prefs?.keywords || ""].flatMap(tokens);
  const roleHits = [...new Set(roleEvidence)].filter(t => text.includes(t));
  const skillHits = [...new Set(skillEvidence)].filter(t => text.includes(t));
  let value = 30 + Math.min(30, roleHits.length * 6) + Math.min(25, skillHits.length * 3);
  const locations = tokens(String(prefs?.locations || "").replace(/[,;]/g, " "));
  if (locations.length && locations.some(x => job.location.toLowerCase().includes(x))) value += 10;
  if (prefs?.workMode && prefs.workMode !== "Any" && String(job.mode).toLowerCase() === String(prefs.workMode).toLowerCase()) value += 8;
  if (prefs?.seniority && prefs.seniority !== "Any" && String(job.level).toLowerCase().includes(String(prefs.seniority).split(" ")[0].toLowerCase())) value += 5;
  return Math.min(99, value);
}

async function fetchLiveJobs() {
  const companies = (process.env.JOBPILOT_LEVER_COMPANIES || "").split(",").map(x => x.trim()).filter(Boolean).slice(0, 20);
  if (!companies.length) return { jobs: [], configured: false };
  const results = await Promise.allSettled(companies.map(async slug => {
    const response = await fetch(`https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`, { next: { revalidate: 900 } });
    if (!response.ok) throw new Error(`Lever source ${slug} returned ${response.status}`);
    const postings = await response.json() as LeverPosting[];
    return postings.map(job => ({ id: `${slug}:${job.id}`, title: job.text, company: slug,
      location: job.categories?.location || job.categories?.allLocations?.join(", ") || "Not specified",
      mode: job.workplaceType || "Not specified", level: job.categories?.level || "Not specified",
      salary: job.salaryDescription || "", url: job.urls?.show || job.urls?.apply || "",
      description: job.content?.description || "", skills: [] as string[], source: "Lever" }));
  }));
  return { jobs: results.flatMap(r => r.status === "fulfilled" ? r.value : []), configured: true };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimit(`jobs-recommend:${user.id}`, 30, 60_000);
  const response = rateLimitResponse(limited);
  if (response) return response;

  const [profile, preferences, applications, live] = await Promise.all([
    prisma.careerProfile.findUnique({ where: { userId: user.id } }),
    prisma.jobPreferences.findUnique({ where: { userId: user.id } }),
    prisma.application.findMany({ where: { userId: user.id }, select: { jobId: true } }),
    fetchLiveJobs(),
  ]);
  if (!profile) return NextResponse.json({ error: "Build your career profile first." }, { status: 400 });
  if (live.jobs.length) await prisma.$transaction(live.jobs.map(job => prisma.job.upsert({
    where: { id: job.id }, create: job,
    update: { title: job.title, company: job.company, location: job.location, mode: job.mode, level: job.level, salary: job.salary, url: job.url, description: job.description, skills: job.skills },
  })));
  const saved = new Set(applications.map(a => a.jobId));
  const recommendations = live.jobs.filter(job => !saved.has(job.id)).map(job => ({ job, score: score(job, profile, preferences) }))
    .filter(x => x.score >= 55).sort((a, b) => b.score - a.score).slice(0, 20)
    .map(x => ({ ...x.job, matchScore: x.score }));
  return NextResponse.json({ recommendations, generatedAt: new Date().toISOString(), strategy: "live-lever-role-skill-preference-evidence", configured: live.configured, sourceCount: live.jobs.length });
}
