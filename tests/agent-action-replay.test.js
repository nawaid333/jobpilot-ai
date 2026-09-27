import test from "node:test";
import assert from "node:assert/strict";

function replayActionResult(result) {
  if (!result || typeof result !== "object") return null;
  const stored = result;
  const status = typeof stored.status === "number" && stored.status >= 100 && stored.status <= 599 ? stored.status : 200;
  return { body: stored, status };
}

test("completed Agent actions replay their stored response", () => {
  const result = replayActionResult({ ok: true, next: "follow-up", followUpDays: 7, message: "Follow-up scheduled." });
  assert.equal(result.status, 200);
  assert.equal(result.body.next, "follow-up");
  assert.equal(result.body.followUpDays, 7);
});

test("failed Agent actions replay their original conflict status", () => {
  const result = replayActionResult({ error: "No scheduled follow-up exists for this application.", status: 409 });
  assert.equal(result.status, 409);
  assert.equal(result.body.error, "No scheduled follow-up exists for this application.");
});

test("invalid persisted HTTP statuses cannot escape as response status", () => {
  assert.equal(replayActionResult({ ok: true, status: "409" }).status, 200);
  assert.equal(replayActionResult({ ok: true, status: 700 }).status, 200);
  assert.equal(replayActionResult({ ok: true, status: 99 }).status, 200);
});
