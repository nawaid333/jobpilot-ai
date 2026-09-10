import test from "node:test";
import assert from "node:assert/strict";

const allowed = ["Saved", "Preparing", "Applied", "Interview", "Offer", "Rejected"];
const rank = { Saved: 0, Preparing: 1, Applied: 2, Interview: 3, Offer: 4, Rejected: 4 };
const terminal = new Set(["Offer", "Rejected"]);
const canTransition = (from, to) => from === to || (from in rank && to in rank && !terminal.has(from) && rank[to] >= rank[from]);

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
