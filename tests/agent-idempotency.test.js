import test from "node:test";
import assert from "node:assert/strict";

function buildAgentIdempotencyKey(action, applicationId, followUpDays, currentDueAt, now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  const due = currentDueAt ? currentDueAt.toISOString() : "none";
  if (action === "follow-up") return `agent:${action}:${applicationId}:${day}`;
  if (action === "snooze-follow-up") return `agent:${action}:${applicationId}:${due}:${followUpDays}`;
  if (action === "complete-follow-up") return `agent:${action}:${applicationId}:${due}`;
  return `agent:${action}:${applicationId}:${day}`;
}

function scopeAgentIdempotencyKey(userId, applicationId, action, suppliedKey) {
  return `agent:${userId}:${applicationId}:${action}:${suppliedKey}`;
}

test("same Agent action on the same day gets the same fallback key", () => {
  const now = new Date("2026-09-13T10:00:00Z");
  assert.equal(buildAgentIdempotencyKey("follow-up", "app-1", 3, null, now), buildAgentIdempotencyKey("follow-up", "app-1", 7, null, new Date("2026-09-13T18:00:00Z")));
});

test("different applications never share an Agent idempotency key", () => {
  const now = new Date("2026-09-13T10:00:00Z");
  assert.notEqual(buildAgentIdempotencyKey("follow-up", "app-1", 3, null, now), buildAgentIdempotencyKey("follow-up", "app-2", 3, null, now));
});

test("snooze keys include the current due date and selected delay", () => {
  const due = new Date("2026-09-16T12:00:00Z");
  const key = buildAgentIdempotencyKey("snooze-follow-up", "app-1", 7, due);
  assert.match(key, /2026-09-16T12:00:00\.000Z/);
  assert.match(key, /:7$/);
});

test("completing a newly scheduled follow-up creates a different key after rescheduling", () => {
  const first = new Date("2026-09-16T12:00:00Z");
  const second = new Date("2026-09-20T12:00:00Z");
  assert.notEqual(buildAgentIdempotencyKey("complete-follow-up", "app-1", 3, first), buildAgentIdempotencyKey("complete-follow-up", "app-1", 3, second));
});

test("different explicit follow-up timing can be distinguished for snoozes", () => {
  const due = new Date("2026-09-16T12:00:00Z");
  assert.notEqual(buildAgentIdempotencyKey("snooze-follow-up", "app-1", 3, due), buildAgentIdempotencyKey("snooze-follow-up", "app-1", 7, due));
});

test("explicit idempotency keys are scoped to the authenticated user, application, and action", () => {
  const key = scopeAgentIdempotencyKey("user-1", "app-1", "follow-up", "request-123");
  assert.equal(key, "agent:user-1:app-1:follow-up:request-123");
  assert.notEqual(key, scopeAgentIdempotencyKey("user-2", "app-1", "follow-up", "request-123"));
  assert.notEqual(key, scopeAgentIdempotencyKey("user-1", "app-2", "follow-up", "request-123"));
  assert.notEqual(key, scopeAgentIdempotencyKey("user-1", "app-1", "snooze-follow-up", "request-123"));
});
