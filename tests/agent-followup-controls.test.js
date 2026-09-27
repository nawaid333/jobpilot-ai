import test from "node:test";
import assert from "node:assert/strict";

function operationKey(actionId, actionType) {
  return `${actionId}:${actionType}`;
}

test("follow-up completion and snooze have independent idempotency scopes", () => {
  assert.notEqual(operationKey("followup-123", "complete-follow-up"), operationKey("followup-123", "snooze-follow-up"));
  assert.notEqual(operationKey("followup-123", "follow-up"), operationKey("followup-123", "complete-follow-up"));
});

test("the same follow-up operation remains idempotent across retries", () => {
  assert.equal(operationKey("followup-123", "complete-follow-up"), operationKey("followup-123", "complete-follow-up"));
  assert.equal(operationKey("followup-123", "snooze-follow-up"), operationKey("followup-123", "snooze-follow-up"));
});
