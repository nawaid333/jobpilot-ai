import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function parseLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return DEFAULT_LIMIT;
  return Math.min(Math.max(parsed, 1), MAX_LIMIT);
}

function safeResultSummary(result: unknown) {
  if (!result || typeof result !== "object") return null;
  const stored = result as Record<string, unknown>;
  return {
    message: typeof stored.message === "string" ? stored.message : null,
    next: typeof stored.next === "string" ? stored.next : null,
    followUpDueAt: typeof stored.followUpDueAt === "string" ? stored.followUpDueAt : null,
  };
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(`agent-history:${user.id}`, 60, 60_000);
  const rateResponse = rateLimitResponse(limited);
  if (rateResponse) return rateResponse;

  const limit = parseLimit(request.nextUrl.searchParams.get("limit"));
  const actions = await prisma.agentAction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    include: { application: { include: { job: true } } },
  });

  const hasMore = actions.length > limit;
  const page = hasMore ? actions.slice(0, limit) : actions;

  return NextResponse.json({
    actions: page.map((action) => ({
      id: action.id,
      actionType: action.actionType,
      status: action.status,
      createdAt: action.createdAt.toISOString(),
      completedAt: action.completedAt?.toISOString() ?? null,
      application: action.application
        ? {
            id: action.application.id,
            status: action.application.status,
            job: {
              title: action.application.job.title,
              company: action.application.job.company,
            },
          }
        : null,
      result: safeResultSummary(action.result),
    })),
    pagination: { limit, hasMore },
    policy: "Agent history records actions performed by JobPilot. It never represents automatic application submission or recruiter email sending.",
  });
}
