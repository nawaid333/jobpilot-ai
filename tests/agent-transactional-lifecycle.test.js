import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const routePath = new URL("../src/app/api/agent/execute/route.ts", import.meta.url);
const route = fs.readFileSync(routePath, "utf8");

test("successful Agent mutations use a Prisma transaction", () => {
  assert.ok(route.includes("await prisma.$transaction(async (db) => {"));
});

test("Agent application mutation is committed before action completion", () => {
  const transactionStart = route.indexOf("await prisma.$transaction(async (db) => {");
  const transactionEnd = route.indexOf("});", transactionStart);
  const transaction = route.slice(transactionStart, transactionEnd);
  assert.ok(transaction.includes("if (applyMutation) await applyMutation(db);"));
  assert.ok(transaction.indexOf("applyMutation(db)") < transaction.indexOf("finishAction(db"));
});

test("prepare guidance without a tailored package is still a completed Agent action", () => {
  assert.ok(route.includes('if (!application.tailoredApplication) response = { ok: true, next: "tailor"'));
});

test("Agent action failures preserve an explicit conflict status for replay", () => {
  assert.ok(route.includes('failAction(claimedId, response.error || "Agent action failed.", response.status || 400)'));
  assert.ok(route.includes('status = typeof stored.status === "number"'));
});

test("the Agent transaction does not introduce autonomous external side effects", () => {
  assert.equal(route.includes("nodemailer"), false);
  assert.equal(route.includes("sendMail"), false);
  assert.equal(route.includes("submitApplication"), false);
});
