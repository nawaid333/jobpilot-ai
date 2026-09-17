import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("src/app/api/gmail/callback/route.ts", "utf8");

test("Gmail callback supplies the required connection primary id", () => {
  assert.match(route, /import crypto from "node:crypto"/);
  assert.match(route, /create:\s*\{[\s\S]*id:\s*crypto\.randomUUID\(\)/);
});

test("Gmail callback preserves user-scoped upsert semantics", () => {
  assert.match(route, /upsert\(\{[\s\S]*where:\s*\{\s*userId:\s*user\.id\s*\}/);
  assert.match(route, /create:\s*\{[\s\S]*userId:\s*user\.id/);
});
