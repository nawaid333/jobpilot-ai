import assert from "node:assert/strict";
import test from "node:test";
import { actionKey, canCompleteAction, canDismissAction, isTerminal } from "./agent-actions";

test("agent action lifecycle", async (t) => {
  await t.test("creates stable keys for the same application action", () => {
    const input = { applicationId: "app-1", signalId: null, type: "follow-up" };
    assert.equal(actionKey(input), actionKey(input));
  });

  await t.test("allows only pending actions to be completed or dismissed", () => {
    assert.equal(canCompleteAction("pending"), true);
    assert.equal(canDismissAction("pending"), true);
    assert.equal(canCompleteAction("completed"), false);
    assert.equal(canDismissAction("dismissed"), false);
  });

  await t.test("recognizes terminal states", () => {
    assert.equal(isTerminal("completed"), true);
    assert.equal(isTerminal("dismissed"), true);
    assert.equal(isTerminal("pending"), false);
  });
});
