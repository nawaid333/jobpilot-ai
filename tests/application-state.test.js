import test from "node:test";
import assert from "node:assert/strict";

const allowed = ["Saved", "Preparing", "Applied", "Interview", "Offer", "Rejected"];
const rank = { Saved: 0, Preparing: 1, Applied: 2, Interview: 3, Offer: 4, Rejected: 4 };
const canTransition = (from, to) => from === to || (from in rank && to in rank && rank[to] >= rank[from]);

test("application statuses have a monotonic workflow order", () => {
  assert.deepEqual(allowed, ["Saved", "Preparing", "Applied", "Interview", "Offer", "Rejected"]);
  for (let i = 0; i < allowed.length; i++) {
    for (let j = 0; j < allowed.length; j++) {
      assert.equal(canTransition(allowed[i], allowed[j]), j >= i || (allowed[i] === "Interview" && allowed[j] === "Rejected") || (allowed[i] === "Offer" && allowed[j] === "Rejected"));
    }
  }
});

test("application workflow rejects backward transitions", () => {
  assert.equal(canTransition("Applied", "Saved"), false);
  assert.equal(canTransition("Interview", "Preparing"), false);
  assert.equal(canTransition("Offer", "Applied"), false);
  assert.equal(canTransition("Rejected", "Saved"), false);
});

test("application workflow permits forward transitions and terminal outcomes", () => {
  assert.equal(canTransition("Saved", "Preparing"), true);
  assert.equal(canTransition("Preparing", "Applied"), true);
  assert.equal(canTransition("Applied", "Interview"), true);
  assert.equal(canTransition("Interview", "Offer"), true);
  assert.equal(canTransition("Interview", "Rejected"), true);
  assert.equal(canTransition("Offer", "Rejected"), true);
  assert.equal(canTransition("Saved", "Saved"), true);
});
