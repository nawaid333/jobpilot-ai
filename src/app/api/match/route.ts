import { NextRequest, NextResponse } from "next/server";

type Job = { title?: string; company?: string; location?: string; mode?: string; level?: string; description?: string; skills?: string[]; salary?: string };

function normalize(value: unknown) { return typeof value === "string" ? value.toLowerCase() : ""; }
function terms(value: string) { return value.toLowerCase().split(/[^a-z0-9+#.-]+/).filter(x => x.length >= 3); }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { profile?: { summary?: string; skills?: string[]; targetRoles?: string[]; experience?: { role?: string; highlights?: string[] }[] }; preferences?: { roles?: string; locations?: string; workMode?: string; seniority?: string; keywords?: string }; job?: Job };
    const profile = body.profile || {};
    const preferences = body.preferences || {};
    const job = body.job || {};
    const jobText = [job.title, job.company, job.location, job.mode, job.level, job.description, ...(job.skills || [])].filter(Boolean).join(" ");
    const profileTerms = [...(profile.skills || []), ...(profile.targetRoles || []), ...(profile.experience || []).flatMap(x => [x.role || "", ...(x.highlights || [])]), profile.summary || ""].flatMap(terms);
    const prefTerms = [preferences.roles || "", preferences.keywords || ""].flatMap(terms);
    const jobTerms = new Set(terms(jobText));
    const matchedSkills = [...new Set([...profileTerms, ...prefTerms].filter(t => jobTerms.has(t)))].slice(0, 12);
    const missingSignals = [...new Set((job.skills || []).filter(skill => !profileTerms.some(t => normalize(skill).includes(t) || t.includes(normalize(skill))))].slice(0, 8);
    const locationMatch = !preferences.locations || terms(preferences.locations).some(t => normalize(job.location).includes(t));
    const modeMatch = !preferences.workMode || preferences.workMode === "Any" || normalize(job.mode) === normalize(preferences.workMode);
    const base = 45 + Math.min(35, matchedSkills.length * 5) + (locationMatch ? 10 : 0) + (modeMatch ? 10 : 0);
    const score = Math.max(0, Math.min(99, base));
    const verdict = score >= 80 ? "APPLY" : score >= 65 ? "CONSIDER" : "SKIP";
    const reasons = [matchedSkills.length ? `Strong overlap in ${matchedSkills.slice(0, 5).join(", ")}.` : "Limited evidence of direct skill overlap.", locationMatch ? "Location preference is compatible." : "Location does not clearly match your stated preference.", modeMatch ? "Work mode is compatible." : "Work mode differs from your stated preference."];
    return NextResponse.json({ score, verdict, reasons, matchedSkills, missingSignals, note: "This recommendation is evidence-based from the supplied profile and listing; it is not a guarantee of interview or hiring outcome." });
  } catch { return NextResponse.json({ error: "Unable to analyze this job match." }, { status: 400 }); }
}
