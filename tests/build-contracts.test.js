import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Next ESLint config adapts legacy Next configs through FlatCompat", () => {
  const config = fs.readFileSync("eslint.config.mjs", "utf8");
  assert.match(config, /FlatCompat/);
  assert.match(config, /compat\.extends\("next\/core-web-vitals", "next\/typescript"\)/);
  assert.doesNotMatch(config, /\.\.\.nextVitals/);
  assert.doesNotMatch(config, /\.\.\.nextTs/);
});

test("AI usage creation supplies the required persisted id", () => {
  const billing = fs.readFileSync("src/lib/billing.ts", "utf8");
  assert.match(billing, /create:\s*\{\s*id:\s*crypto\.randomUUID\(\)/);
  assert.match(billing, /import crypto from "node:crypto"/);
});
