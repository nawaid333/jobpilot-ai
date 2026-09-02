import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { sessionCookieName, sessionExpiry } from "@/lib/auth";

function hashPassword(password: string) { return createHash("sha256").update(password).digest("hex"); }

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || user.passwordHash !== hashPassword(String(password || ""))) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    const expiresAt = sessionExpiry();
    const session = await prisma.session.create({ data: { userId: user.id, expiresAt } });
    const response = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
    response.cookies.set(sessionCookieName(), session.id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
    return response;
  } catch { return NextResponse.json({ error: "Unable to sign in." }, { status: 400 }); }
}
