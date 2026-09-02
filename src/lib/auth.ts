import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "jobpilot-session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;
  return session.user;
}

export function sessionCookieName() {
  return SESSION_COOKIE;
}

export function sessionExpiry() {
  return new Date(Date.now() + SESSION_TTL_MS);
}
