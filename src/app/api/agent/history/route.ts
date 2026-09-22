import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function parseLimit(value: string | null) {
  if (!value) return DEFAULT_LIMIT;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(`agent-history:${user.id}`, 60, 60_000);
  const response = rateLimitResponse(limited);
  if (response) return response;

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get("limit"));
  const cursor = url.searchParams.get("cursor") || undefined;

  const rows = await prisma.agentAction.findMany({
    where: { userId: user.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { application: { include: { job: true } } },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;

  return NextResponse.json({
    actions: page.map(action => ({
      id: action.id,
      actionType: action.actionType,
      status: action.status,
      result: action.result,
      applicationId: action.applicationId,
      company: action.application?.job.company ?? null,
      role: action.application?.job.title ?? null,
      createdAt: action.createdAt,
      completedAt: action.completedAt,
    })),
    page: { limit, hasMore, nextCursor },
    policy: "Agent history is read-only and scoped to the authenticated user. JobPilot does not submit applications or send emails automatically.",
  });
}
