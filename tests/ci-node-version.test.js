import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function workflow(path) {
  return fs.readFileSync(path, "utf8");
}

test("quality CI uses supported Node 22", () => {
  const yaml = workflow(".github/workflows/quality.yml");
  assert.match(yaml, /uses:\s*actions\/setup-node@v4/);
  assert.match(yaml, /node-version:\s*22/);
  assert.doesNotMatch(yaml, /node-version:\s*20(?:\D|$)/);
});

test("build CI uses the same Node major version", () => {
  const yaml = workflow(".github/workflows/ci.yml");
  assert.match(yaml, /uses:\s*actions\/setup-node@v4/);
  assert.match(yaml, /node-version:\s*22/);
  assert.doesNotMatch(yaml, /node-version:\s*20(?:\D|$)/);
});
