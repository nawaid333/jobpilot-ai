import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

function invalidOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const expected = new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").origin;
    return new URL(origin).origin !== expected;
  } catch {
    return true;
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimitResponse(rateLimit(`gmail-status:read:${user.id}`, 60, 60_000));
  if (limited) return limited;
  const c = await prisma.gmailConnection.findUnique({ where: { userId: user.id }, select: { email: true, connectedAt: true, scope: true } });
  return NextResponse.json({ connected: !!c, connection: c }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimitResponse(rateLimit(`gmail-status:write:${user.id}`, 10, 60_000));
  if (limited) return limited;
  if (invalidOrigin(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  await prisma.gmailConnection.deleteMany({ where: { userId: user.id } });
  await prisma.emailSignal.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
