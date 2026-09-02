import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, sessionCookieName, sessionExpiry } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const suppliedPassword = String(password || "");
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

    let valid = verifyPassword(suppliedPassword, user.passwordHash);
    if (!valid && /^[a-f0-9]{64}$/i.test(user.passwordHash)) {
      const legacyHash = createHash("sha256").update(suppliedPassword).digest("hex");
      valid = legacyHash === user.passwordHash;
      if (valid) await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(suppliedPassword) } });
    }
    if (!valid) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

    const expiresAt = sessionExpiry();
    const session = await prisma.session.create({ data: { userId: user.id, expiresAt } });
    const response = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
    response.cookies.set(sessionCookieName(), session.id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
    return response;
  } catch { return NextResponse.json({ error: "Unable to sign in." }, { status: 400 }); }
}
