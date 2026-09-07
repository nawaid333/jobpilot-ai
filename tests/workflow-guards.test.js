const test = require("node:test");
const assert = require("node:assert/strict");

const RANK = { Saved: 0, Preparing: 1, Applied: 2, Interview: 3, Offer: 4, Rejected: 4 };
const ALLOWED = Object.keys(RANK);

function canTransition(from, to) {
  return ALLOWED.includes(from) && ALLOWED.includes(to) && RANK[to] >= RANK[from];
}

test("allows normal application progression", () => {
  assert.equal(canTransition("Saved", "Preparing"), true);
  assert.equal(canTransition("Preparing", "Applied"), true);
  assert.equal(canTransition("Applied", "Interview"), true);
  assert.equal(canTransition("Interview", "Offer"), true);
});

test("allows terminal outcomes from interview", () => {
  assert.equal(canTransition("Interview", "Rejected"), true);
  assert.equal(canTransition("Interview", "Offer"), true);
});

test("blocks backward application transitions", () => {
  assert.equal(canTransition("Interview", "Applied"), false);
  assert.equal(canTransition("Offer", "Preparing"), false);
  assert.equal(canTransition("Rejected", "Saved"), false);
});

test("rejects unknown statuses", () => {
  assert.equal(canTransition("Saved", "Unknown"), false);
  assert.equal(canTransition("Unknown", "Applied"), false);
});
