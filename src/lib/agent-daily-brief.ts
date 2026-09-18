export type AgentBriefAction = {
  id: string;
  priority: number;
  title: string;
  company: string;
  reason: string;
  dueAt?: string | Date | null;
};

function dueTime(value: AgentBriefAction["dueAt"]): number {
  if (!value) return Infinity;

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Infinity;
}

export function buildDailyBrief<T extends AgentBriefAction>(actions: T[], limit = 3): T[] {
  return [...actions]
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        dueTime(a.dueAt) - dueTime(b.dueAt) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, Math.max(0, limit));
}

export function briefLabel(priority: number): "Do first" | "Do today" | "Plan next" {
  if (priority >= 5) return "Do first";
  if (priority >= 4) return "Do today";
  return "Plan next";
}
