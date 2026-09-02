import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sessionCookieName, sessionCookieOptions } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(sessionCookieName())?.value;
  if (sessionId) await prisma.session.deleteMany({ where: { id: sessionId } });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName(), "", sessionCookieOptions(new Date(0)));
  return response;
}
