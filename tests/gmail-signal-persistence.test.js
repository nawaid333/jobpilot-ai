import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("src/app/api/gmail/scan/route.ts", "utf8");

test("Gmail signal creation supplies the required primary id", () => {
  assert.match(route, /prisma\.emailSignal\.create\(\{data:\{id:crypto\.randomUUID\(\)/);
});

test("Gmail scan keeps duplicate detection scoped by user and Gmail message", () => {
  assert.match(route, /userId_gmailMessageId/);
});
