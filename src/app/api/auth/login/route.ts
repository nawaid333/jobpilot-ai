import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, sessionCookieName, sessionExpiry, sessionCookieOptions, cleanupExpiredSessions } from "@/lib/auth";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 8 * 1024;
const MAX_PASSWORD_LENGTH = 256;

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "anonymous";
}

function tooLarge() {
  return NextResponse.json({ error: "Request is too large." }, { status: 413, headers: { "Cache-Control": "no-store" } });
}

async function readJson(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let text = "";
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) return null;
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text) as { email?: unknown; password?: unknown };
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(`login:${clientKey(request)}`, 10, 60_000);
  const rateResponse = rateLimitResponse(limited);
  if (rateResponse) return rateResponse;

  try {
    const body = await readJson(request);
    if (!body) return tooLarge();
    const normalizedEmail = String(body.email || "").trim().toLowerCase();
    const suppliedPassword = String(body.password || "");
    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    if (!suppliedPassword || suppliedPassword.length > MAX_PASSWORD_LENGTH) return NextResponse.json({ error: "Invalid email or password." }, { status: 401, headers: { "Cache-Control": "no-store" } });

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) return NextResponse.json({ error: "Invalid email or password." }, { status: 401, headers: { "Cache-Control": "no-store" } });

    let valid = verifyPassword(suppliedPassword, user.passwordHash);
    if (!valid && /^[a-f0-9]{64}$/i.test(user.passwordHash)) {
      const legacyHash = createHash("sha256").update(suppliedPassword).digest("hex");
      valid = legacyHash === user.passwordHash;
      if (valid) await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(suppliedPassword) } });
    }
    if (!valid) return NextResponse.json({ error: "Invalid email or password." }, { status: 401, headers: { "Cache-Control": "no-store" } });

    await cleanupExpiredSessions();
    const expiresAt = sessionExpiry();
    const session = await prisma.session.create({ data: { userId: user.id, expiresAt } });
    const response = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
    response.cookies.set(sessionCookieName(), session.id, sessionCookieOptions(expiresAt));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch { return NextResponse.json({ error: "Unable to sign in." }, { status: 400, headers: { "Cache-Control": "no-store" } }); }
}
