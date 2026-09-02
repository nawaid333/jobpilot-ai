import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED = ["Saved", "Preparing", "Applied", "Interview", "Offer", "Rejected"] as const;
const RANK: Record<string, number> = { Saved: 0, Preparing: 1, Applied: 2, Interview: 3, Offer: 4, Rejected: 4 };

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const applications = await prisma.application.findMany({ where: { userId: user.id }, include: { job: true, tailoredApplication: true }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ applications });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const b = await req.json();
    if (!b.job?.id || !b.job?.title || !b.job?.company) return NextResponse.json({ error: "Job details are required." }, { status: 400 });
    if (b.status && !ALLOWED.includes(b.status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    const job = await prisma.job.upsert({
      where: { id: String(b.job.id) },
      create: { id: String(b.job.id), title: String(b.job.title), company: String(b.job.company), location: String(b.job.location || ""), mode: b.job.mode ? String(b.job.mode) : null, level: b.job.level ? String(b.job.level) : null, source: b.job.source ? String(b.job.source) : null, salary: b.job.salary ? String(b.job.salary) : null, url: b.job.url ? String(b.job.url) : null, description: b.job.description ? String(b.job.description) : null, skills: Array.isArray(b.job.skills) ? b.job.skills : [] },
      update: { title: String(b.job.title), company: String(b.job.company), location: String(b.job.location || ""), mode: b.job.mode ? String(b.job.mode) : null, level: b.job.level ? String(b.job.level) : null, source: b.job.source ? String(b.job.source) : null, salary: b.job.salary ? String(b.job.salary) : null, url: b.job.url ? String(b.job.url) : null, description: b.job.description ? String(b.job.description) : null, skills: Array.isArray(b.job.skills) ? b.job.skills : [] },
    });
    const existing = await prisma.application.findUnique({ where: { userId_jobId: { userId: user.id, jobId: job.id } } });
    const requested = b.status ? String(b.status) : "Saved";
    const status = existing && RANK[existing.status] > RANK[requested] ? existing.status : requested;
    const application = await prisma.application.upsert({
      where: { userId_jobId: { userId: user.id, jobId: job.id } },
      create: { userId: user.id, jobId: job.id, status, notes: String(b.notes || "") },
      update: { status, notes: b.notes === undefined ? undefined : String(b.notes) },
      include: { job: true, tailoredApplication: true },
    });
    return NextResponse.json({ application });
  } catch { return NextResponse.json({ error: "Could not save application." }, { status: 400 }); }
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const b = await req.json();
    if (!b.id) return NextResponse.json({ error: "Application id is required." }, { status: 400 });
    if (b.status && !ALLOWED.includes(b.status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    const existing = await prisma.application.findFirst({ where: { id: String(b.id), userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Application not found." }, { status: 404 });
    const application = await prisma.application.update({ where: { id: existing.id }, data: { status: b.status || undefined, notes: b.notes === undefined ? undefined : String(b.notes), appliedAt: b.status === "Applied" && !existing.appliedAt ? new Date() : undefined }, include: { job: true, tailoredApplication: true } });
    return NextResponse.json({ application });
  } catch { return NextResponse.json({ error: "Could not update application." }, { status: 400 }); }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ error: "Application id is required." }, { status: 400 });
  const result = await prisma.application.deleteMany({ where: { id: String(b.id), userId: user.id } });
  if (!result.count) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
