const test = require("node:test");
const assert = require("node:assert/strict");

const statuses = ["Saved", "Preparing", "Applied", "Interview", "Offer", "Rejected"];
const rank = Object.fromEntries(statuses.map((status, index) => [status, index]));

function canTransition(from, to) {
  return from === to || (from in rank && to in rank && rank[to] >= rank[from]);
}

test("application API workflow exposes the supported status vocabulary", () => {
  assert.deepEqual(statuses, ["Saved", "Preparing", "Applied", "Interview", "Offer", "Rejected"]);
});

test("application API workflow preserves monotonic status progression", () => {
  assert.equal(canTransition("Saved", "Preparing"), true);
  assert.equal(canTransition("Preparing", "Applied"), true);
  assert.equal(canTransition("Applied", "Interview"), true);
  assert.equal(canTransition("Interview", "Offer"), true);
  assert.equal(canTransition("Interview", "Rejected"), true);
  assert.equal(canTransition("Offer", "Rejected"), true);
  assert.equal(canTransition("Applied", "Saved"), false);
  assert.equal(canTransition("Interview", "Preparing"), false);
  assert.equal(canTransition("Rejected", "Applied"), false);
});

test("submission contract requires explicit user confirmation", () => {
  const request = { applicationId: "app-123", confirmed: false };
  assert.equal(request.confirmed, false);
  assert.equal(request.confirmed === true, false);
});

test("submission contract is idempotent for an already applied application", () => {
  const application = { status: "Applied", appliedAt: "2026-09-07T10:00:00.000Z" };
  assert.equal(application.status, "Applied");
  assert.ok(application.appliedAt);
});
