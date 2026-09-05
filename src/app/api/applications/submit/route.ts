import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

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

async function readBody(req: Request) {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return null;
  const body = await req.text();
  if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) return null;
  return body;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(`application-submit:${user.id}`, 20, 60_000);
  const limitedResponse = rateLimitResponse(limited);
  if (limitedResponse) return limitedResponse;

  if (originViolation(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });

  try {
    const body = await readBody(req);
    if (body === null) return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    const parsed = JSON.parse(body) as Record<string, unknown>;
    const id = typeof parsed.applicationId === "string" ? parsed.applicationId.trim() : "";
    const confirmed = parsed.confirmed === true;
    if (!id || id.length > 300) return NextResponse.json({ error: "Application id is required." }, { status: 400 });
    if (!confirmed) return NextResponse.json({ error: "Confirm that you submitted the application first." }, { status: 400 });

    const application = await prisma.application.findFirst({ where: { id, userId: user.id }, include: { job: true, tailoredApplication: true } });
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });
    if (!application.tailoredApplication) return NextResponse.json({ error: "Create and review the tailored package before submitting." }, { status: 409 });
    if (!application.job.url) return NextResponse.json({ error: "This job does not have a submission listing URL." }, { status: 409 });

    const updated = await prisma.application.update({ where: { id: application.id }, data: { status: "Applied", appliedAt: application.appliedAt || new Date() }, include: { job: true, tailoredApplication: true } });
    return NextResponse.json({ application: updated, submission: { mode: "user-confirmed", listingUrl: updated.job.url } }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ error: "Could not record the application submission." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
