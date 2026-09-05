import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const safeActions = new Set(["prepare", "mark-preparing", "mark-applied"]);
const RANK: Record<string, number> = { Saved: 0, Preparing: 1, Applied: 2, Interview: 3, Offer: 4, Rejected: 5 };
const MAX_BODY_BYTES = 16_000;

function originViolation(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const expected = new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").origin;
    return new URL(origin).origin !== expected;
  } catch {
    return true;
  }
}

async function readJson(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) throw new Error("Request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Request body is required.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) { await reader.cancel(); throw new Error("Request is too large."); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimit(`agent-execute:${user.id}`, 30, 60_000);
  const limitedResponse = rateLimitResponse(limited);
  if (limitedResponse) return limitedResponse;
  if (originViolation(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const body = await readJson(request);
    const action = typeof body?.action === "string" ? body.action : "";
    const applicationId = typeof body?.applicationId === "string" ? body.applicationId : "";
    if (!applicationId || applicationId.length > 200 || !safeActions.has(action)) return NextResponse.json({ error: "Valid action and application are required." }, { status: 400 });
    const application = await prisma.application.findFirst({ where: { id: applicationId, userId: user.id }, include: { job: true, tailoredApplication: true } });
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    if (action === "prepare") {
      if (!application.tailoredApplication) return NextResponse.json({ ok: false, next: "tailor", redirect: `/tailor?applicationId=${encodeURIComponent(application.id)}`, message: "Create the tailored package before preparing submission." }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
      if (RANK[application.status] < RANK.Preparing) await prisma.application.update({ where: { id: application.id }, data: { status: "Preparing" } });
      return NextResponse.json({ ok: true, next: "review", redirect: `/automation?applicationId=${encodeURIComponent(application.id)}`, message: "Your tailored package is ready for review." }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
    }
    if (action === "mark-preparing") {
      if (RANK[application.status] > RANK.Preparing) return NextResponse.json({ error: `Cannot move ${application.status} back to Preparing.` }, { status: 409 });
      const updated = await prisma.application.update({ where: { id: application.id }, data: { status: "Preparing" } });
      return NextResponse.json({ ok: true, status: updated.status, message: "Application moved to Preparing." }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
    }
    if (RANK[application.status] > RANK.Applied) return NextResponse.json({ error: `Cannot mark a ${application.status} application as Applied.` }, { status: 409 });
    const updated = await prisma.application.update({ where: { id: application.id }, data: { status: "Applied", appliedAt: application.appliedAt || new Date() } });
    return NextResponse.json({ ok: true, status: updated.status, message: "Marked as Applied. JobPilot did not submit the application." }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof Error && error.message === "Request is too large.") return NextResponse.json({ error: error.message }, { status: 413 });
    return NextResponse.json({ error: "Could not execute agent action." }, { status: 400 });
  }
}
