import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sessionCookieName, sessionCookieOptions } from "@/lib/auth";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientKey = forwarded || request.headers.get("x-real-ip") || "anonymous";
  const limited = rateLimit(`logout:${clientKey}`, 30, 60_000);
  const rateResponse = rateLimitResponse(limited);
  if (rateResponse) return rateResponse;

  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(sessionCookieName())?.value;
    if (sessionId) await prisma.session.deleteMany({ where: { id: sessionId } });
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(sessionCookieName(), "", sessionCookieOptions(new Date(0)));
    return response;
  } catch {
    return NextResponse.json({ error: "Unable to sign out." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
