export type FollowUpState = "overdue" | "today" | "upcoming";

const DAY = 86_400_000;

export function followUpState(date: Date | null, now = Date.now()): FollowUpState | null {
  if (!date) return null;
  const due = date.getTime();
  if (due < now - DAY / 2) return "overdue";
  if (due <= now + DAY) return "today";
  return "upcoming";
}

export function followUpPriority(state: FollowUpState): number {
  return state === "overdue" ? 5 : state === "today" ? 4 : 3;
}

export function sortActions<T extends { priority: number; dueAt?: string | Date | null }>(actions: T[]): T[] {
  return [...actions].sort((a, b) => b.priority - a.priority || ((a.dueAt ? new Date(a.dueAt).getTime() : Infinity) - (b.dueAt ? new Date(b.dueAt).getTime() : Infinity)));
}
