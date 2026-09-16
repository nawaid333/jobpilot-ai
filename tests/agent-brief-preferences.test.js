import test from "node:test";
import assert from "node:assert/strict";

function isHidden(actionId, state, now = new Date()) {
  if (state.dismissed.includes(actionId)) return true;
  const value = state.snoozedUntil[actionId];
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp > now.getTime();
}

function dismiss(state, actionId) {
  return {
    dismissed: Array.from(new Set([...state.dismissed, actionId])),
    snoozedUntil: Object.fromEntries(Object.entries(state.snoozedUntil).filter(([key]) => key !== actionId)),
  };
}

function snooze(state, actionId, until) {
  return {
    dismissed: state.dismissed.filter((id) => id !== actionId),
    snoozedUntil: { ...state.snoozedUntil, [actionId]: until.toISOString() },
  };
}

test("dismissed actions remain hidden", () => {
  assert.equal(isHidden("a", dismiss({ dismissed: [], snoozedUntil: {} }, "a")), true);
});

test("snoozed actions stay hidden only until their expiry", () => {
  const now = new Date("2026-09-16T12:00:00Z");
  const state = snooze({ dismissed: [], snoozedUntil: {} }, "a", new Date("2026-09-17T12:00:00Z"));
  assert.equal(isHidden("a", state, now), true);
  assert.equal(isHidden("a", state, new Date("2026-09-18T12:00:00Z")), false);
});

test("dismissing an action clears its snooze and deduplicates IDs", () => {
  const state = dismiss({ dismissed: ["a"], snoozedUntil: { a: "2026-09-17T12:00:00Z" } }, "a");
  assert.deepEqual(state, { dismissed: ["a"], snoozedUntil: {} });
});
