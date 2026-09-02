export type PlanKey = "free" | "pro";

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    monthlyAiCredits: 5,
    trackedApplications: 25,
    features: ["Career profile", "Job matching", "5 AI actions/month", "25 tracked applications"],
  },
  pro: {
    name: "Pro",
    price: 19,
    monthlyAiCredits: 100,
    trackedApplications: 500,
    features: ["Everything in Free", "100 AI actions/month", "500 tracked applications", "Gmail intelligence", "Interview Coach", "Priority AI processing"],
  },
} as const;

export function getPlan(key?: string | null) {
  return key === "pro" ? PLANS.pro : PLANS.free;
}

export function monthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
