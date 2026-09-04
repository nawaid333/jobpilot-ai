import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 128_000;
const MAX_TEXT = 12000;
const MAX_LIST = 80;
const MAX_ITEM = 5000;

function text(value: unknown, max = MAX_TEXT) {
  return typeof value === "string" ? value.slice(0, max).trim() : "";
}

function list(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value.filter((item): item is string => typeof item === "string").map(item => item.slice(0, MAX_ITEM).trim()).filter(Boolean).slice(0, MAX_LIST);
}

function objectList(value: unknown, keys: string[]) {
  if (!Array.isArray(value)) return [] as Record<string, string>[];
  return value.filter(item => item && typeof item === "object").slice(0, MAX_LIST).map(item => {
    const source = item as Record<string, unknown>;
    return Object.fromEntries(keys.map(key => [key, text(source[key], MAX_ITEM)]));
  });
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

async function readBody(req: Request) {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return null;
  const reader = req.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

const profileInclude = { user: { select: { name: true } } } as const;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const [profile, preferences] = await Promise.all([
      prisma.careerProfile.findUnique({ where: { userId: user.id }, include: profileInclude }),
      prisma.jobPreferences.findUnique({ where: { userId: user.id } }),
    ]);
    return NextResponse.json({ profile, preferences }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to load profile data right now." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimitResponse(rateLimit(`profile-write:${user.id}`, 30, 60_000));
  if (limited) return limited;
  if (originViolation(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const bodyText = await readBody(req);
    if (bodyText === null) return NextResponse.json({ error: "Request is too large or body is missing." }, { status: 413 });
    const body = JSON.parse(bodyText);
    const p = body?.profile && typeof body.profile === "object" ? body.profile : {};
    const pref = body?.preferences && typeof body.preferences === "object" ? body.preferences : {};
    const candidate = p.candidate && typeof p.candidate === "object" ? p.candidate : {};
    const profileData = {
      atsScore: Math.max(0, Math.min(100, Number(p.atsScore) || 0)),
      headline: text(candidate.headline, 1000) || null,
      location: text(candidate.location, 500) || null,
      summary: text(p.summary),
      skills: list(p.skills), targetRoles: list(p.targetRoles),
      experience: objectList(p.experience, ["role", "company", "duration", "highlights"]),
      education: objectList(p.education, ["degree", "institution", "year"]),
      strengths: list(p.strengths),
    };
    const preferencesData = {
      roles: text(pref.roles, 2000), locations: text(pref.locations, 2000),
      workMode: ["Any", "Remote", "Hybrid", "On-site"].includes(pref.workMode) ? pref.workMode : "Any",
      seniority: ["Any", "Entry level", "Mid level", "Senior", "Lead / Manager"].includes(pref.seniority) ? pref.seniority : "Any",
      minSalary: text(pref.minSalary, 500), keywords: text(pref.keywords, 3000),
    };
    const [profile] = await prisma.$transaction([
      prisma.careerProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...profileData }, update: profileData }),
      prisma.jobPreferences.upsert({ where: { userId: user.id }, create: { userId: user.id, ...preferencesData }, update: preferencesData }),
    ]);
    const profileWithUser = await prisma.careerProfile.findUnique({ where: { id: profile.id }, include: profileInclude });
    const preferences = await prisma.jobPreferences.findUnique({ where: { userId: user.id } });
    return NextResponse.json({ profile: profileWithUser, preferences }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid profile data." }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  }
}
