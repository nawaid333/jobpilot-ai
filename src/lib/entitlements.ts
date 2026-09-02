import { prisma } from "@/lib/prisma";
import { getPlan, monthKey, type PlanKey } from "@/lib/plans";

export async function getEntitlements(userId: string) {
  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  const planKey: PlanKey = subscription?.plan === "pro" && subscription.status === "active" ? "pro" : "free";
  const plan = getPlan(planKey);
  const month = monthKey();
  const usage = await prisma.aiUsage.findUnique({ where: { userId_month: { userId, month } } });
  return { planKey, plan, usage: usage?.credits ?? 0, remainingAi: Math.max(0, plan.monthlyAiCredits - (usage?.credits ?? 0)) };
}

export async function consumeAiCredit(userId: string) {
  const entitlements = await getEntitlements(userId);
  if (entitlements.remainingAi <= 0) return { ok: false as const, entitlements };
  const month = monthKey();
  const usage = await prisma.aiUsage.upsert({
    where: { userId_month: { userId, month } },
    create: { userId, month, credits: 1 },
    update: { credits: { increment: 1 } },
  });
  return { ok: true as const, entitlements: { ...entitlements, usage: usage.credits, remainingAi: Math.max(0, entitlements.plan.monthlyAiCredits - usage.credits) } };
}
