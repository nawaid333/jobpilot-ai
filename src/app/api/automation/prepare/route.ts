import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const MAX_IDS = 25;
const MAX_BODY_BYTES = 8_000;

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
  const length = Number(req.headers.get("content-length") || 0);
  if (length > MAX_BODY_BYTES) throw new Error("too_large");
  const body = await req.text();
  if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) throw new Error("too_large");
  return JSON.parse(body) as Record<string, unknown>;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(`automation-prepare:${user.id}`, 30, 60_000);
  const limitedResponse = rateLimitResponse(limited);
  if (limitedResponse) return limitedResponse;
  if (originViolation(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });

  try {
    const body = await readJson(req);
    if (!Array.isArray(body.applicationIds)) return NextResponse.json({ error: "Select at least one application." }, { status: 400 });
    const ids = [...new Set(body.applicationIds.filter((id): id is string => typeof id === "string").map((id) => id.trim()).filter(Boolean))];
    if (!ids.length) return NextResponse.json({ error: "Select at least one application." }, { status: 400 });
    if (ids.length > MAX_IDS) return NextResponse.json({ error: `You can prepare up to ${MAX_IDS} applications at once.` }, { status: 400 });

    const applications = await prisma.application.findMany({
      where: { userId: user.id, id: { in: ids } },
      include: { job: true, tailoredApplication: true },
    });
    if (applications.length !== ids.length) return NextResponse.json({ error: "One or more selected applications were not found." }, { status: 404 });

    const steps = applications.map((a) => ({
      applicationId: a.id,
      job: { id: a.job.id, title: a.job.title, company: a.job.company, location: a.job.location, url: a.job.url },
      currentStatus: a.status,
      ready: !!a.tailoredApplication,
      steps: [
        { key: "review", label: "Review tailored package", completed: !!a.tailoredApplication },
        { key: "open", label: "Open employer application", completed: false },
        { key: "submit", label: "User confirms submission", completed: false },
      ],
      policy: "JobPilot prepares and guides the application. It does not submit without explicit user confirmation.",
    }));
    return NextResponse.json({ ok: true, count: steps.length, steps }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message === "too_large" ? "Request body is too large." : "Could not prepare application workflow." }, { status: error instanceof Error && error.message === "too_large" ? 413 : 400 });
  }
}
