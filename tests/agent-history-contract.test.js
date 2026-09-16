import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("src/app/api/agent/history/route.ts", "utf8");
const page = fs.readFileSync("src/app/agent/history/page.tsx", "utf8");

test("Agent history requires an authenticated user and scopes queries by userId", () => {
  assert.match(route, /getCurrentUser\(\)/);
  assert.match(route, /if \(!user\) return NextResponse\.json\(\{ error: \"Unauthorized\" \}, \{ status: 401 \}\)/);
  assert.match(route, /where: \{ userId: user\.id \}/);
});

test("Agent history is newest-first and bounded to a safe page size", () => {
  assert.match(route, /const MAX_LIMIT = 50/);
  assert.match(route, /Math\.min\(Math\.max\(parsed, 1\), MAX_LIMIT\)/);
  assert.match(route, /orderBy: \{ createdAt: \"desc\" \}/);
  assert.match(route, /take: limit \+ 1/);
});

test("Agent history exposes application context without raw action results", () => {
  assert.match(route, /include: \{ application: \{ include: \{ job: true \} \} \}/);
  assert.match(route, /result: safeResultSummary\(action\.result\)/);
  assert.match(route, /message: typeof stored\.message === \"string\"/);
  assert.doesNotMatch(route, /result: action\.result/);
});

test("Agent history keeps the safety boundary explicit", () => {
  assert.match(route, /does not represent automatic application submission or recruiter email sending/);
  assert.match(page, /No automatic application submission/);
  assert.match(page, /No automatic recruiter email sending/);
});

test("Agent history provides a route back to the controlled Agent queue", () => {
  assert.match(page, /href=\"\/agent\"/);
  assert.match(page, /href=\{`\/application\/\$\{encodeURIComponent\(action\.application\.id\)\}`\}/);
});
