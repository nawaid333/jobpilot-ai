import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sessionCookieName } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(sessionCookieName())?.value;
  if (sessionId) await prisma.session.deleteMany({ where: { id: sessionId } });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName(), "", { httpOnly: true, expires: new Date(0), sameSite: "lax", path: "/" });
  return response;
}
