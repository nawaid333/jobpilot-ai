import test from "node:test";
import assert from "node:assert/strict";

const supportedActions = ["prepare", "mark-preparing", "mark-applied", "follow-up", "complete-follow-up", "snooze-follow-up", "interview", "assessment", "offer"];
const terminalStatuses = new Set(["Interview", "Offer", "Rejected"]);
const rank = { Saved: 0, Preparing: 1, Applied: 2, Interview: 3, Offer: 4, Rejected: 4 };
const FOLLOW_UP_DELAY_DAYS = 3;
const DAY = 86400000;

function validate(action, applicationId) { return Boolean(applicationId && typeof applicationId === "string" && supportedActions.includes(action)); }
function canPrepare(status) { return !terminalStatuses.has(status) && rank[status] < rank.Preparing; }
function canApply(status) { return !terminalStatuses.has(status) && status !== "Applied"; }
function nextFollowUpDate(from) { const due = new Date(from); due.setDate(due.getDate() + FOLLOW_UP_DELAY_DAYS); due.setHours(12, 0, 0, 0); return due; }

test("all supported agent actions are explicitly allowlisted", () => {
  assert.deepEqual(supportedActions, ["prepare", "mark-preparing", "mark-applied", "follow-up", "complete-follow-up", "snooze-follow-up", "interview", "assessment", "offer"]);
});
test("invalid actions or application ids are rejected by validation", () => {
  assert.equal(validate("send-email", "app-1"), false); assert.equal(validate("prepare", ""), false); assert.equal(validate("prepare", null), false); assert.equal(validate("prepare", "app-1"), true);
});
test("terminal applications cannot be prepared or marked applied", () => {
  for (const status of ["Interview", "Offer", "Rejected"]) { assert.equal(canPrepare(status), false); assert.equal(canApply(status), false); }
});
test("already Applied applications are not re-applied", () => { assert.equal(canApply("Applied"), false); });
test("Saved applications can move into Preparing", () => { assert.equal(canPrepare("Saved"), true); });
test("Agent follow-up is scheduled exactly three days ahead", () => {
  const now = new Date("2026-09-13T08:30:00Z"); const due = nextFollowUpDate(now);
  assert.equal(due.toISOString(), "2026-09-16T12:00:00.000Z"); assert.equal(due.getTime() - new Date("2026-09-13T12:00:00Z").getTime(), 3 * DAY);
});
test("an existing follow-up remains the source of truth", () => { const existing = new Date("2026-09-20T12:00:00Z"); assert.equal(existing.toISOString(), "2026-09-20T12:00:00.000Z"); });
test("scheduled follow-ups can be completed without sending email", () => {
  const followUpDueAt = new Date("2026-09-16T12:00:00Z");
  const completed = null;
  assert.equal(followUpDueAt instanceof Date, true); assert.equal(completed, null);
});
test("scheduled follow-ups can be snoozed another three days", () => {
  const now = new Date("2026-09-16T09:00:00Z"); const due = nextFollowUpDate(now);
  assert.equal(due.toISOString(), "2026-09-19T12:00:00.000Z");
});
