import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const route = await readFile(new URL("../src/app/api/agent/history/route.ts", import.meta.url), "utf8");

test("Agent history API requires authentication and scopes reads by user", () => {
  assert.match(route, /getCurrentUser\(\)/);
  assert.match(route, /where:\s*\{\s*userId:\s*user\.id\s*\}/);
});

test("Agent history API uses bounded cursor pagination", () => {
  assert.match(route, /const MAX_LIMIT = 50/);
  assert.match(route, /take: limit \+ 1/);
  assert.match(route, /cursor:\s*\{\s*id:\s*cursor\s*\}/);
  assert.match(route, /nextCursor/);
});

test("Agent history API returns audit-safe lifecycle fields", () => {
  for (const field of ["id", "actionType", "status", "applicationId", "createdAt", "completedAt"]) {
    assert.match(route, new RegExp(`\\b${field}\\b`));
  }
});
