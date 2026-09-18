import test from "node:test";
import assert from "node:assert/strict";

function dueTime(value) {
  if (!value) return Infinity;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Infinity;
}

function buildDailyBrief(actions, limit = 3) {
  return [...actions]
    .sort((a, b) => b.priority - a.priority || dueTime(a.dueAt) - dueTime(b.dueAt) || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, limit));
}
function briefLabel(priority) { return priority >= 5 ? "Do first" : priority >= 4 ? "Do today" : "Plan next"; }

test("daily brief returns at most three actions", () => {
  const actions = [
    { id: "a", priority: 3, dueAt: "2026-09-20T12:00:00Z" },
    { id: "b", priority: 5, dueAt: "2026-09-13T12:00:00Z" },
    { id: "c", priority: 4, dueAt: "2026-09-13T12:00:00Z" },
    { id: "d", priority: 2 }
  ];
  assert.deepEqual(buildDailyBrief(actions).map(x => x.id), ["b", "c", "a"]);
});

test("daily brief keeps earlier due action first when priorities tie", () => {
  const actions = [
    { id: "later", priority: 4, dueAt: "2026-09-15T12:00:00Z" },
    { id: "earlier", priority: 4, dueAt: "2026-09-14T12:00:00Z" }
  ];
  assert.deepEqual(buildDailyBrief(actions, 2).map(x => x.id), ["earlier", "later"]);
});

test("invalid due dates sort after valid dates", () => {
  const actions = [
    { id: "invalid", priority: 4, dueAt: "not-a-date" },
    { id: "valid", priority: 4, dueAt: "2026-09-14T12:00:00Z" },
    { id: "none", priority: 4 }
  ];
  assert.deepEqual(buildDailyBrief(actions, 3).map(x => x.id), ["valid", "invalid", "none"]);
});

test("equal priority and due dates use deterministic id ordering", () => {
  const actions = [
    { id: "zeta", priority: 4, dueAt: "2026-09-14T12:00:00Z" },
    { id: "alpha", priority: 4, dueAt: "2026-09-14T12:00:00Z" }
  ];
  assert.deepEqual(buildDailyBrief(actions, 2).map(x => x.id), ["alpha", "zeta"]);
});

test("brief labels map urgency to an actionable instruction", () => {
  assert.equal(briefLabel(5), "Do first");
  assert.equal(briefLabel(4), "Do today");
  assert.equal(briefLabel(3), "Plan next");
});

test("zero or negative brief limits return no actions", () => {
  const actions = [{ id: "a", priority: 5 }];
  assert.deepEqual(buildDailyBrief(actions, 0), []);
});
