import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const workflow = fs.readFileSync(".github/workflows/quality.yml", "utf8");

test("quality workflow keeps Node setup non-blocking only with a strict runtime gate", () => {
  assert.match(workflow, /id: setup-node/);
  assert.match(workflow, /continue-on-error: true/);
  assert.match(workflow, /node-version: 22/);
  assert.match(workflow, /node --version/);
  assert.match(workflow, /major < 22/);
  assert.match(workflow, /steps\.setup-node\.outcome == 'failure'/);
});

test("quality workflow uses npm install because the repository has no lockfile", () => {
  const verifyIndex = workflow.indexOf("- name: Verify Node and npm");
  const installIndex = workflow.indexOf("- name: Install dependencies");
  assert.ok(verifyIndex >= 0);
  assert.ok(installIndex > verifyIndex);
  assert.match(workflow.slice(installIndex, installIndex + 150), /run: npm install --no-audit --no-fund/);
  assert.doesNotMatch(workflow, /cache:\s*npm/);
  assert.doesNotMatch(workflow, /run: npm ci/);
});
