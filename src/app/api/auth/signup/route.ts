import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, sessionCookieName, sessionExpiry, sessionCookieOptions, cleanupExpiredSessions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const suppliedPassword = String(password || "");
    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    if (suppliedPassword.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    if (await prisma.user.findUnique({ where: { email: normalizedEmail } })) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

    const user = await prisma.user.create({ data: { email: normalizedEmail, name: String(name || "").trim() || null, passwordHash: hashPassword(suppliedPassword) } });
    await cleanupExpiredSessions();
    const expiresAt = sessionExpiry();
    const session = await prisma.session.create({ data: { userId: user.id, expiresAt } });
    const response = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } }, { status: 201 });
    response.cookies.set(sessionCookieName(), session.id, sessionCookieOptions(expiresAt));
    return response;
  } catch { return NextResponse.json({ error: "Unable to create your account." }, { status: 400 }); }
}
