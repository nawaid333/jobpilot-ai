import { prisma } from "@/lib/prisma";

export const PLAN_LIMITS = { free: 5, pro: 100 } as const;

export async function getEntitlement(userId: string) {
  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  const plan = subscription?.plan === "pro" && ["active", "trialing"].includes(subscription.status) ? "pro" : "free";
  const month = new Date().toISOString().slice(0, 7);
  const usage = await prisma.aiUsage.findUnique({ where: { userId_month: { userId, month } } });
  const limit = PLAN_LIMITS[plan];
  return { plan, limit, used: usage?.credits ?? 0, remaining: Math.max(0, limit - (usage?.credits ?? 0)), month, subscription };
}

export async function consumeAiCredit(userId: string, amount = 1) {
  const entitlement = await getEntitlement(userId);
  if (entitlement.remaining < amount) return { ok: false as const, entitlement };
  const usage = await prisma.aiUsage.upsert({
    where: { userId_month: { userId, month: entitlement.month } },
    create: { userId, month: entitlement.month, credits: amount },
    update: { credits: { increment: amount } },
  });
  return { ok: true as const, entitlement: { ...entitlement, used: usage.credits, remaining: entitlement.limit - usage.credits } };
}
