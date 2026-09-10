import test from "node:test";
import assert from "node:assert/strict";

const allowed = ["Saved", "Preparing", "Applied", "Interview", "Offer", "Rejected"];
const rank = { Saved: 0, Preparing: 1, Applied: 2, Interview: 3, Offer: 4, Rejected: 4 };
const terminal = new Set(["Offer", "Rejected"]);
const canTransition = (from, to) => from === to || (from in rank && to in rank && !terminal.has(from) && rank[to] >= rank[from]);
const completionStatus = (status) => ["Saved", "Preparing", "Applied", "Interview"].includes(status) ? "Interview" : status;
const completionTimestamp = (existing, now) => existing || now;

test("application statuses have a monotonic workflow order", () => {
  assert.deepEqual(allowed, ["Saved", "Preparing", "Applied", "Interview", "Offer", "Rejected"]);
});

test("application workflow rejects backward transitions", () => {
  for (const [from, to] of [["Preparing", "Saved"], ["Applied", "Saved"], ["Applied", "Preparing"], ["Interview", "Preparing"], ["Offer", "Applied"], ["Rejected", "Saved"]]) {
    assert.equal(canTransition(from, to), false, `${from} -> ${to} should be blocked`);
  }
});

test("terminal outcomes cannot be changed", () => {
  for (const from of ["Offer", "Rejected"]) {
    for (const to of allowed) {
      if (to !== from) assert.equal(canTransition(from, to), false, `${from} -> ${to} should be blocked`);
    }
  }
});

test("application workflow permits forward transitions", () => {
  for (const [from, to] of [["Saved", "Preparing"], ["Preparing", "Applied"], ["Applied", "Interview"], ["Interview", "Offer"], ["Interview", "Rejected"]]) {
    assert.equal(canTransition(from, to), true, `${from} -> ${to} should be allowed`);
  }
  assert.equal(canTransition("Saved", "Saved"), true);
});

test("interview completion moves non-terminal applications to Interview", () => {
  for (const status of ["Saved", "Preparing", "Applied", "Interview"]) {
    assert.equal(completionStatus(status), "Interview", `${status} should become Interview after completion`);
  }
});

test("interview completion preserves terminal outcomes", () => {
  assert.equal(completionStatus("Offer"), "Offer");
  assert.equal(completionStatus("Rejected"), "Rejected");
});

test("interview completion never overwrites an existing completion timestamp", () => {
  const existing = "2026-09-10T10:00:00.000Z";
  assert.equal(completionTimestamp(existing, "2026-09-10T11:00:00.000Z"), existing);
});

test("interview completion sets a timestamp when none exists", () => {
  const now = "2026-09-10T11:00:00.000Z";
  assert.equal(completionTimestamp(null, now), now);
});
