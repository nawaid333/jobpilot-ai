import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateJobMatch, type JobMatchInput } from "@/lib/job-matching";

const MAX_JOBS = 100;

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asJob(value: unknown): JobMatchInput | null {
  if (!value || typeof value !== "object") return null;
  const job = value as Record<string, unknown>;
  const title = asString(job.title);
  if (!title) return null;
  return {
    title,
    company: asString(job.company) || undefined,
    location: asString(job.location) || undefined,
    mode: asString(job.mode) || null,
    level: asString(job.level) || null,
    description: asString(job.description) || null,
    skills: Array.isArray(job.skills) ? job.skills : [],
  };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const inputJobs = Array.isArray(body?.jobs)
      ? body.jobs.slice(0, MAX_JOBS).map(asJob).filter((job): job is JobMatchInput => Boolean(job))
      : [];

    const [profile, preferences] = await Promise.all([
      prisma.careerProfile.findUnique({ where: { userId: user.id } }),
      prisma.jobPreferences.findUnique({ where: { userId: user.id } }),
    ]);

    if (!profile) {
      return NextResponse.json({ error: "Complete your career profile before matching jobs." }, { status: 400 });
    }

    const jobs = inputJobs.length
      ? inputJobs
      : await prisma.job.findMany({ orderBy: { lastSeenAt: "desc" }, take: MAX_JOBS });

    const ranked = jobs
      .map(job => ({ job, match: calculateJobMatch(job, profile) }))
      .sort((a, b) => b.match.score - a.match.score);

    return NextResponse.json({
      jobs: ranked,
      preferences: preferences ? {
        roles: preferences.roles,
        locations: preferences.locations,
        workMode: preferences.workMode,
        seniority: preferences.seniority,
      } : null,
      generatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Unable to calculate job matches." }, { status: 400 });
  }
}
