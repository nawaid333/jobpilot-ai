import test from "node:test";
import assert from "node:assert/strict";

const supportedActions = ["prepare", "mark-preparing", "mark-applied", "follow-up", "interview", "assessment", "offer"];
const terminalStatuses = new Set(["Interview", "Offer", "Rejected"]);
const rank = { Saved: 0, Preparing: 1, Applied: 2, Interview: 3, Offer: 4, Rejected: 4 };

function validate(action, applicationId) {
  return Boolean(applicationId && typeof applicationId === "string" && supportedActions.includes(action));
}
function canPrepare(status) { return !terminalStatuses.has(status) && rank[status] < rank.Preparing; }
function canApply(status) { return !terminalStatuses.has(status) && status !== "Applied"; }

test("all supported agent actions are explicitly allowlisted", () => {
  assert.deepEqual(supportedActions, ["prepare", "mark-preparing", "mark-applied", "follow-up", "interview", "assessment", "offer"]);
});

test("invalid actions or application ids are rejected by validation", () => {
  assert.equal(validate("send-email", "app-1"), false);
  assert.equal(validate("prepare", ""), false);
  assert.equal(validate("prepare", null), false);
  assert.equal(validate("prepare", "app-1"), true);
});

test("terminal applications cannot be prepared or marked applied", () => {
  for (const status of ["Interview", "Offer", "Rejected"]) {
    assert.equal(canPrepare(status), false);
    assert.equal(canApply(status), false);
  }
});

test("already Applied applications are not re-applied", () => {
  assert.equal(canApply("Applied"), false);
});

test("Saved applications can move into Preparing", () => {
  assert.equal(canPrepare("Saved"), true);
});
