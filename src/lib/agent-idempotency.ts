export function buildAgentIdempotencyKey(
  action: string,
  applicationId: string,
  followUpDays: number,
  currentDueAt: Date | null,
  now = new Date(),
): string {
  const day = now.toISOString().slice(0, 10);
  const due = currentDueAt ? currentDueAt.toISOString() : "none";
  if (action === "follow-up") return `agent:${action}:${applicationId}:${day}`;
  if (action === "snooze-follow-up") return `agent:${action}:${applicationId}:${due}:${followUpDays}`;
  if (action === "complete-follow-up") return `agent:${action}:${applicationId}:${due}`;
  return `agent:${action}:${applicationId}:${day}`;
}

export function scopeAgentIdempotencyKey(
  userId: string,
  applicationId: string,
  action: string,
  suppliedKey: string,
): string {
  return `agent:${userId}:${applicationId}:${action}:${suppliedKey}`;
}
