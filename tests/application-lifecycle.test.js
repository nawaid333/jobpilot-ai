import test from "node:test";
import assert from "node:assert/strict";

const RANK = { Saved: 0, Preparing: 1, Applied: 2, Interview: 3, Offer: 4, Rejected: 4 };
const TERMINAL = new Set(["Offer", "Rejected"]);

function canTransition(from, to) {
  return from === to || (from in RANK && to in RANK && RANK[to] >= RANK[from]);
}

function effectiveStatus(current, requested, interviewCompleted) {
  if (interviewCompleted && RANK[requested] < RANK.Interview) return "Interview";
  return requested;
}

test("application can progress through the normal lifecycle", () => {
  assert.equal(canTransition("Saved", "Preparing"), true);
  assert.equal(canTransition("Preparing", "Applied"), true);
  assert.equal(canTransition("Applied", "Interview"), true);
  assert.equal(canTransition("Interview", "Offer"), true);
});

test("interview completion cannot leave application below Interview", () => {
  assert.equal(effectiveStatus("Applied", "Applied", true), "Interview");
  assert.equal(effectiveStatus("Preparing", "Preparing", true), "Interview");
});

test("offer and rejection are terminal states", () => {
  for (const terminal of TERMINAL) {
    assert.equal(canTransition(terminal, "Saved"), false);
    assert.equal(canTransition(terminal, "Preparing"), false);
    assert.equal(canTransition(terminal, "Applied"), false);
    assert.equal(canTransition(terminal, "Interview"), false);
  }
});

test("backward transitions are rejected", () => {
  assert.equal(canTransition("Interview", "Applied"), false);
  assert.equal(canTransition("Offer", "Interview"), false);
  assert.equal(canTransition("Rejected", "Applied"), false);
});
