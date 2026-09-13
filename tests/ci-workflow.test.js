import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(new URL("../.github/workflows/quality.yml", import.meta.url), "utf8");

test("CI pins Node 20 without check-latest network resolution", () => {
  assert.match(workflow, /node-version:\s*20\b/);
  assert.doesNotMatch(workflow, /check-latest:\s*true/);
});

test("CI keeps dependency caching compatible with npm ci", () => {
  assert.match(workflow, /uses:\s*actions\/setup-node@v4/);
  assert.match(workflow, /cache:\s*npm/);
  assert.match(workflow, /run:\s*npm ci/);
});
