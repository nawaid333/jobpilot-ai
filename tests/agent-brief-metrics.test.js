import test from "node:test";
import assert from "node:assert/strict";

function getMetrics(actionIds, state, now = new Date()) {
  const uniqueIds = Array.from(new Set(actionIds));
  const dismissed = uniqueIds.filter((id) => state.dismissed.includes(id));
  const snoozed = uniqueIds.filter((id) => {
    if (state.dismissed.includes(id)) return false;
    const timestamp = new Date(state.snoozedUntil[id] ?? "").getTime();
    return Number.isFinite(timestamp) && timestamp > now.getTime();
  });
  return { total: uniqueIds.length, visible: uniqueIds.length - dismissed.length - snoozed.length, dismissed: dismissed.length, snoozed: snoozed.length };
}

test("metrics deduplicate action IDs and count visible actions", () => {
  assert.deepEqual(getMetrics(["a", "a", "b"], { dismissed: [], snoozedUntil: {} }), { total: 2, visible: 2, dismissed: 0, snoozed: 0 });
});

test("metrics exclude dismissed actions from snoozed count", () => {
  const state = { dismissed: ["a"], snoozedUntil: { a: "2026-09-18T00:00:00Z", b: "2026-09-18T00:00:00Z" } };
  assert.deepEqual(getMetrics(["a", "b", "c"], state, new Date("2026-09-16T00:00:00Z")), { total: 3, visible: 1, dismissed: 1, snoozed: 1 });
});

test("expired and invalid snoozes remain visible", () => {
  const state = { dismissed: [], snoozedUntil: { a: "2026-09-15T00:00:00Z", b: "invalid" } };
  assert.deepEqual(getMetrics(["a", "b"], state, new Date("2026-09-16T00:00:00Z")), { total: 2, visible: 2, dismissed: 0, snoozed: 0 });
});
