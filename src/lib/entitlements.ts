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
  try {
    const result = await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({ where: { userId } });
      const planKey: PlanKey = subscription?.plan === "pro" && subscription.status === "active" ? "pro" : "free";
      const plan = getPlan(planKey);
      const current = await tx.aiUsage.findUnique({ where: { userId_month: { userId, month } } });

      if ((current?.credits ?? 0) >= plan.monthlyAiCredits) return { ok: false as const, credits: current?.credits ?? 0, planKey };

      const usage = current
        ? await tx.aiUsage.update({ where: { id: current.id }, data: { credits: { increment: 1 } } })
        : await tx.aiUsage.create({ data: { userId, month, credits: 1 } });

      return { ok: true as const, credits: usage.credits, planKey };
    }, { isolationLevel: "Serializable" });

    if (!result.ok) {
      const plan = getPlan(result.planKey);
      return { ok: false as const, entitlements: { ...entitlements, planKey: result.planKey, plan, usage: result.credits, remainingAi: 0 } };
    }

    const plan = getPlan(result.planKey);
    return {
      ok: true as const,
      entitlements: {
        ...entitlements,
        planKey: result.planKey,
        plan,
        usage: result.credits,
        remainingAi: Math.max(0, plan.monthlyAiCredits - result.credits),
      },
    };
  } catch {
    return { ok: false as const, entitlements: { ...entitlements } };
  }
}
