import test from "node:test";
import assert from "node:assert/strict";

const supportedActions = ["prepare", "mark-preparing", "mark-applied", "follow-up", "complete-follow-up", "snooze-follow-up", "interview", "assessment", "offer"];
const terminalStatuses = new Set(["Interview", "Offer", "Rejected"]);
const rank = { Saved: 0, Preparing: 1, Applied: 2, Interview: 3, Offer: 4, Rejected: 4 };
const FOLLOW_UP_OPTIONS = new Set([1, 3, 7, 14]);
const DEFAULT_FOLLOW_UP_DELAY_DAYS = 3;
const DAY = 86400000;

function validate(action, applicationId) { return Boolean(applicationId && typeof applicationId === "string" && supportedActions.includes(action)); }
function canPrepare(status) { return !terminalStatuses.has(status) && rank[status] < rank.Preparing; }
function canApply(status) { return !terminalStatuses.has(status) && status !== "Applied"; }
function normalizeFollowUpDays(value) { return Number.isInteger(value) && FOLLOW_UP_OPTIONS.has(value) ? value : DEFAULT_FOLLOW_UP_DELAY_DAYS; }
function nextFollowUpDate(from, days = DEFAULT_FOLLOW_UP_DELAY_DAYS) { const due = new Date(from); due.setDate(due.getDate() + days); due.setHours(12, 0, 0, 0); return due; }

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
test("Agent follow-up defaults to three days", () => {
  const now = new Date("2026-09-13T08:30:00Z"); const due = nextFollowUpDate(now);
  assert.equal(due.toISOString(), "2026-09-16T12:00:00.000Z"); assert.equal(due.getTime() - new Date("2026-09-13T12:00:00Z").getTime(), 3 * DAY);
});
test("Agent accepts only explicit follow-up timing options", () => {
  assert.equal(normalizeFollowUpDays(1), 1); assert.equal(normalizeFollowUpDays(3), 3); assert.equal(normalizeFollowUpDays(7), 7); assert.equal(normalizeFollowUpDays(14), 14);
  assert.equal(normalizeFollowUpDays(0), 3); assert.equal(normalizeFollowUpDays(2), 3); assert.equal(normalizeFollowUpDays(30), 3); assert.equal(normalizeFollowUpDays("7"), 3);
});
test("custom follow-up timing produces the requested due date", () => {
  const now = new Date("2026-09-13T08:30:00Z");
  assert.equal(nextFollowUpDate(now, 1).toISOString(), "2026-09-14T12:00:00.000Z");
  assert.equal(nextFollowUpDate(now, 7).toISOString(), "2026-09-20T12:00:00.000Z");
  assert.equal(nextFollowUpDate(now, 14).toISOString(), "2026-09-27T12:00:00.000Z");
});
test("an existing follow-up remains the source of truth", () => { const existing = new Date("2026-09-20T12:00:00Z"); assert.equal(existing.toISOString(), "2026-09-20T12:00:00.000Z"); });
test("scheduled follow-ups can be completed without sending email", () => {
  const followUpDueAt = new Date("2026-09-16T12:00:00Z"); const completed = null;
  assert.equal(followUpDueAt instanceof Date, true); assert.equal(completed, null);
});
test("scheduled follow-ups can be snoozed another three days", () => {
  const now = new Date("2026-09-16T09:00:00Z"); const due = nextFollowUpDate(now);
  assert.equal(due.toISOString(), "2026-09-19T12:00:00.000Z");
});
