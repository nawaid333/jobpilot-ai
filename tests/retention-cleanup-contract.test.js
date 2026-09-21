import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const script = fs.readFileSync(new URL("../scripts/retention-cleanup.mjs", import.meta.url), "utf8");
const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("retention cleanup is dry-run by default", () => {
  assert.match(script, /const\s+dryRun\s*=\s*!hasFlag\(\s*["']--execute["']\s*\)/);
  assert.match(script, /mode:\s*dryRun\s*\?\s*["']dry-run["']\s*:\s*["']execute["']/);
});

test("destructive cleanup requires an explicit maintenance enablement and credential", () => {
  assert.match(script, /RETENTION_CLEANUP_ENABLED\s*!==\s*["']true["']/);
  assert.match(script, /!process\.env\.RETENTION_CLEANUP_TOKEN/);
  assert.match(script, /RETENTION_CLEANUP_EXPECTED_TOKEN/);
});

test("cleanup is bounded and never deletes application records", () => {
  assert.match(script, /const\s+BATCH_SIZE\s*=\s*100/);
  assert.match(script, /take:\s*batchSize/);
  assert.doesNotMatch(script, /application\.deleteMany|application\.delete/);
  assert.match(script, /applications:\s*\{\s*none:\s*\{\s*\}\s*\}/);
});

test("cleanup rechecks mutable retention predicates before destructive deletion", () => {
  assert.match(script, /expiresAt:\s*\{\s*lt:\s*cutoffs\.sessionExpiresBefore\s*\}/);
  assert.match(script, /createdAt:\s*\{\s*lt:\s*cutoffs\.emailSignalCreatedBefore\s*\}/);
  assert.match(script, /month:\s*\{\s*lt:\s*cutoffs\.aiUsageMonthBefore\s*\}/);
  assert.match(script, /lastSeenAt:\s*\{\s*lt:\s*cutoffs\.jobLastSeenBefore\s*\}/);
  assert.match(script, /applications:\s*\{\s*none:\s*\{\s*\}\s*\}/);
});

test("cleanup targets only documented retention data", () => {
  assert.match(script, /prisma\.session\.findMany/);
  assert.match(script, /prisma\.emailSignal\.findMany/);
  assert.match(script, /prisma\.aiUsage\.findMany/);
  assert.match(script, /prisma\.job\.findMany/);
  assert.doesNotMatch(script, /gmailConnection\.deleteMany|gmailConnection\.delete/);
});

test("retention cleanup is exposed as an explicit maintenance command", () => {
  assert.equal(packageJson.scripts["retention:cleanup"], "node scripts/retention-cleanup.mjs");
});
