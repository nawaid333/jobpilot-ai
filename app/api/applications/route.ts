import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeHttpUrl, stringArrayField, stringField, optionalStringField } from "@/lib/validate";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const ALLOWED = ["Saved", "Preparing", "Applied", "Interview", "Offer", "Rejected"] as const;
const RANK: Record<string, number> = { Saved: 0, Preparing: 1, Applied: 2, Interview: 3, Offer: 4, Rejected: 4 };
const MAX_APPLICATIONS_READ = 100;
const MAX_BODY_BYTES = 128 * 1024;

function guard(userId: string, action: string) {
  return rateLimitResponse(rateLimit(`applications:${action}:${userId}`, action === "read" ? 60 : 30, 60_000));
}

function bodyTooLarge(req: Request) {
  const length = req.headers.get("content-length");
  return length !== null && Number.isFinite(Number(length)) && Number(length) > MAX_BODY_BYTES;
}

function originViolation(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const expected = new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").origin;
    return new URL(origin).origin !== expected;
  } catch {
    return true;
  }
}

async function readJson(req: Request) {
  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
    throw new Response(JSON.stringify({ error: "Request body is too large." }), { status: 413, headers: { "content-type": "application/json" } });
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON");
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = guard(user.id, "read");
  if (limited) return limited;
  const applications = await prisma.application.findMany({ where: { userId: user.id }, include: { job: true, tailoredApplication: true }, orderBy: { updatedAt: "desc" }, take: MAX_APPLICATIONS_READ });
  return NextResponse.json({ applications, limit: MAX_APPLICATIONS_READ });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = guard(user.id, "write");
  if (limited) return limited;
  if (originViolation(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (bodyTooLarge(req)) return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  try {
    const b = await readJson(req);
    if (!b || typeof b !== "object" || !b.job || typeof b.job !== "object") return NextResponse.json({ error: "Job details are required." }, { status: 400 });
    const rawJob = b.job as Record<string, unknown>;
    const id = stringField(rawJob.id, 300, "Job id");
    const title = stringField(rawJob.title, 500, "Job title");
    const company = stringField(rawJob.company, 300, "Company");
    const location = optionalStringField(rawJob.location, 500, "Location") ?? "";
    const mode = optionalStringField(rawJob.mode, 100, "Mode") ?? null;
    const level = optionalStringField(rawJob.level, 100, "Level") ?? null;
    const source = optionalStringField(rawJob.source, 100, "Source") ?? null;
    const salary = optionalStringField(rawJob.salary, 500, "Salary") ?? null;
    const description = optionalStringField(rawJob.description, 20000, "Description") ?? null;
    const url = rawJob.url ? safeHttpUrl(rawJob.url, "Job URL") : null;
    const skills = rawJob.skills === undefined ? [] : stringArrayField(rawJob.skills, 100, 200, "Skills");
    if (b.status && !ALLOWED.includes(b.status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    const notes = b.notes === undefined ? "" : stringField(b.notes, 10000, "Notes");
    const job = await prisma.job.upsert({ where: { id }, create: { id, title, company, location, mode, level, source, salary, url, description, skills }, update: { title, company, location, mode, level, source, salary, url, description, skills } });
    const existing = await prisma.application.findUnique({ where: { userId_jobId: { userId: user.id, jobId: job.id } } });
    const requested = b.status ? String(b.status) : "Saved";
    const status = existing && RANK[existing.status] > RANK[requested] ? existing.status : requested;
    const application = await prisma.application.upsert({ where: { userId_jobId: { userId: user.id, jobId: job.id } }, create: { userId: user.id, jobId: job.id, status, notes }, update: { status, notes: b.notes === undefined ? undefined : notes }, include: { job: true, tailoredApplication: true } });
    return NextResponse.json({ application });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Could not save application." }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = guard(user.id, "write");
  if (limited) return limited;
  if (originViolation(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (bodyTooLarge(req)) return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  try {
    const b = await readJson(req);
    if (!b || typeof b !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    const id = stringField(b.id, 300, "Application id");
    if (b.status && !ALLOWED.includes(b.status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    const notes = b.notes === undefined ? undefined : stringField(b.notes, 10000, "Notes");
    const existing = await prisma.application.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Application not found." }, { status: 404 });
    const application = await prisma.application.update({ where: { id: existing.id }, data: { status: b.status || undefined, notes, appliedAt: b.status === "Applied" && !existing.appliedAt ? new Date() : undefined }, include: { job: true, tailoredApplication: true } });
    return NextResponse.json({ application });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Could not update application." }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = guard(user.id, "write");
  if (limited) return limited;
  if (originViolation(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (bodyTooLarge(req)) return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  const b = await req.json().catch(() => ({}));
  if (!b || typeof b !== "object" || !b.id) return NextResponse.json({ error: "Application id is required." }, { status: 400 });
  try {
    const id = stringField(b.id, 300, "Application id");
    const result = await prisma.application.deleteMany({ where: { id, userId: user.id } });
    if (!result.count) return NextResponse.json({ error: "Application not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Could not delete application." }, { status: 400 }); }
}
