import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { DEFAULT_AGENT_BRIEF_PREFERENCES, normalizeAgentBriefPreferences } from "@/lib/agent-brief-preferences";

const LIMIT = 60;

function guard(userId: string) {
  return rateLimit(`agent-brief-preferences:${userId}`, LIMIT, 60_000);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimitResponse(guard(user.id));
  if (limited) return limited;

  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { agentBriefPreferences: true } });
  return NextResponse.json(normalizeAgentBriefPreferences(record?.agentBriefPreferences ?? DEFAULT_AGENT_BRIEF_PREFERENCES));
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimitResponse(guard(user.id));
  if (limited) return limited;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid preferences payload." }, { status: 400 });

  const preferences = normalizeAgentBriefPreferences(body);
  await prisma.user.update({ where: { id: user.id }, data: { agentBriefPreferences: preferences } });
  return NextResponse.json(preferences);
}
