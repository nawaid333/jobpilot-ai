import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 64 * 1024;

type Job = { title?: string; company?: string; location?: string; mode?: string; level?: string; description?: string; skills?: string[]; salary?: string };

function normalize(value: unknown) { return typeof value === "string" ? value.toLowerCase() : ""; }
function terms(value: string) { return value.toLowerCase().split(/[^a-z0-9+#.-]+/).filter(x => x.length >= 3); }
function originViolation(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).origin !== new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").origin; } catch { return true; }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const limited = rateLimit(`match:${user.id}`, 60, 60_000);
    const limitedResponse = rateLimitResponse(limited);
    if (limitedResponse) return limitedResponse;

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) return NextResponse.json({ error: "Match request is too large." }, { status: 413 });
    if (originViolation(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });

    const bodyBytes = await request.clone().arrayBuffer();
    if (bodyBytes.byteLength > MAX_BODY_BYTES) return NextResponse.json({ error: "Match request is too large." }, { status: 413 });

    const body = await request.json() as { profile?: { summary?: string; skills?: string[]; targetRoles?: string[]; experience?: { role?: string; highlights?: string[] }[] }; preferences?: { roles?: string; locations?: string; workMode?: string; seniority?: string; keywords?: string }; job?: Job };
    const profile = body.profile || {};
    const preferences = body.preferences || {};
    const job = body.job || {};
    const jobText = [job.title, job.company, job.location, job.mode, job.level, job.description, ...(job.skills || [])].filter(Boolean).join(" ");
    const profileTerms = [...(profile.skills || []), ...(profile.targetRoles || []), ...(profile.experience || []).flatMap(x => [x.role || "", ...(x.highlights || [])]), profile.summary || ""].flatMap(terms);
    const prefTerms = [preferences.roles || "", preferences.keywords || ""].flatMap(terms);
    const jobTerms = new Set(terms(jobText));
    const matchedSkills = [...new Set([...profileTerms, ...prefTerms].filter(t => jobTerms.has(t)))].slice(0, 12);
    const missingSignals = [...new Set((job.skills || []).filter(skill => !profileTerms.some(t => normalize(skill).includes(t) || t.includes(normalize(skill)))))].slice(0, 8);
    const locationMatch = !preferences.locations || terms(preferences.locations).some(t => normalize(job.location).includes(t));
    const modeMatch = !preferences.workMode || preferences.workMode === "Any" || normalize(job.mode) === normalize(preferences.workMode);
    const base = 45 + Math.min(35, matchedSkills.length * 5) + (locationMatch ? 10 : 0) + (modeMatch ? 10 : 0);
    const score = Math.max(0, Math.min(99, base));
    const verdict = score >= 80 ? "APPLY" : score >= 65 ? "CONSIDER" : "SKIP";
    const reasons = [matchedSkills.length ? `Strong overlap in ${matchedSkills.slice(0, 5).join(", ")}.` : "Limited evidence of direct skill overlap.", locationMatch ? "Location preference is compatible." : "Location does not clearly match your stated preference.", modeMatch ? "Work mode is compatible." : "Work mode differs from your stated preference."];
    return NextResponse.json({ score, verdict, reasons, matchedSkills, missingSignals, note: "This recommendation is evidence-based from the supplied profile and listing; it is not a guarantee of interview or hiring outcome." }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch { return NextResponse.json({ error: "Unable to analyze this job match." }, { status: 400 }); }
}
