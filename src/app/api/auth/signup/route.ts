import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, sessionCookieName, sessionExpiry, sessionCookieOptions, cleanupExpiredSessions } from "@/lib/auth";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 8 * 1024;

function clientKey(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "anonymous";
}

function bodyWithinLimit(request: NextRequest) {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) return true;
  const parsed = Number(contentLength);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= MAX_BODY_BYTES;
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(`auth-signup:${clientKey(request)}`, 5, 60_000);
  const rateResponse = rateLimitResponse(limited);
  if (rateResponse) return rateResponse;

  if (!bodyWithinLimit(request)) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413, headers: { "Cache-Control": "no-store" } });
    }

    const parsed = JSON.parse(rawBody) as { email?: unknown; password?: unknown; name?: unknown };
    const normalizedEmail = String(parsed.email || "").trim().toLowerCase();
    const suppliedPassword = String(parsed.password || "");
    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    if (suppliedPassword.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    if (suppliedPassword.length > 256) return NextResponse.json({ error: "Password is too long." }, { status: 400 });
    const name = String(parsed.name || "").trim();
    if (name.length > 120) return NextResponse.json({ error: "Name is too long." }, { status: 400 });
    if (await prisma.user.findUnique({ where: { email: normalizedEmail } })) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

    const user = await prisma.user.create({ data: { email: normalizedEmail, name: name || null, passwordHash: hashPassword(suppliedPassword) } });
    await cleanupExpiredSessions();
    const expiresAt = sessionExpiry();
    const session = await prisma.session.create({ data: { userId: user.id, expiresAt } });
    const response = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } }, { status: 201, headers: { "Cache-Control": "no-store" } });
    response.cookies.set(sessionCookieName(), session.id, sessionCookieOptions(expiresAt));
    return response;
  } catch { return NextResponse.json({ error: "Unable to create your account." }, { status: 400, headers: { "Cache-Control": "no-store" } }); }
}
