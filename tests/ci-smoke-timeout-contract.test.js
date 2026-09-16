import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workflow = readFileSync(resolve(projectRoot, ".github/workflows/quality.yml"), "utf8");

test("quality workflow bounds every production smoke command", () => {
  assert.match(workflow, /run: timeout --signal=TERM --kill-after=10s 90s npm run smoke\n/);
  assert.match(workflow, /run: timeout --signal=TERM --kill-after=10s 90s npm run smoke:api\n/);
  assert.match(workflow, /run: timeout --signal=TERM --kill-after=10s 120s npm run smoke:mvp\n/);
});

test("quality workflow keeps a job-level timeout as a final safety boundary", () => {
  assert.match(workflow, /jobs:\n  quality:\n    runs-on: ubuntu-latest\n    timeout-minutes: 15\n/);
});
