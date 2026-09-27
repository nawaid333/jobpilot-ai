export type AgentBriefAction = {
  id: string;
  priority: number;
  title: string;
  company: string;
  reason: string;
  dueAt?: string | Date | null;
};

export function buildDailyBrief<T extends AgentBriefAction>(actions: T[], limit = 3): T[] {
  return [...actions]
    .sort((a, b) => b.priority - a.priority || ((a.dueAt ? new Date(a.dueAt).getTime() : Infinity) - (b.dueAt ? new Date(b.dueAt).getTime() : Infinity)))
    .slice(0, Math.max(0, limit));
}

export function briefLabel(priority: number): "Do first" | "Do today" | "Plan next" {
  if (priority >= 5) return "Do first";
  if (priority >= 4) return "Do today";
  return "Plan next";
}
