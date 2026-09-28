import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { buildProactiveInsights } from "@/lib/proactive-intelligence.mjs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(`agent-insights:${user.id}`, 60, 60_000);
  const limitedResponse = rateLimitResponse(limited);
  if (limitedResponse) return limitedResponse;

  const [applications, signals] = await Promise.all([
    prisma.application.findMany({
      where: { userId: user.id },
      include: { job: true, tailoredApplication: true },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
    prisma.emailSignal.findMany({
      where: { userId: user.id },
      orderBy: { receivedAt: "desc" },
      take: 100,
    }),
  ]);

  const insights = buildProactiveInsights(applications, signals);
  return NextResponse.json({
    insights,
    generatedAt: new Date().toISOString(),
    policy: "Insights are recommendations based on recorded workspace data. No application or email is sent automatically.",
  });
}
