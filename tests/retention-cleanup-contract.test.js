import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const script = fs.readFileSync(new URL("../scripts/retention-cleanup.mjs", import.meta.url), "utf8");
const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("retention cleanup is dry-run by default", () => {
  assert.match(script, /const dryRun = !hasFlag\("--execute"\)/);
  assert.match(script, /mode: dryRun \? "dry-run" : "execute"/);
});

test("destructive cleanup requires an explicit maintenance enablement and credential", () => {
  assert.match(script, /if \(process\.env\.RETENTION_CLEANUP_ENABLED !== "true"\)/);
  assert.match(script, /if \(!process\.env\.RETENTION_CLEANUP_TOKEN\)/);
  assert.match(script, /RETENTION_CLEANUP_EXPECTED_TOKEN/);
});

test("cleanup is bounded and never deletes application records", () => {
  assert.match(script, /const BATCH_SIZE = 100/);
  assert.match(script, /take: batchSize/);
  assert.doesNotMatch(script, /application\.deleteMany|application\.delete/);
  assert.match(script, /applications: \{ none: \{\} \}/);
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
