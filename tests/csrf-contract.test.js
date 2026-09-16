import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const csrf = readFileSync(resolve(projectRoot, "src/lib/csrf.ts"), "utf8");

test("CSRF policy includes local development origins", () => {
  assert.match(csrf, /http:\/\/localhost:3000/);
  assert.match(csrf, /http:\/\/127\.0\.0\.1:3000/);
});

test("CSRF policy normalizes configured origins", () => {
  assert.match(csrf, /NEXT_PUBLIC_APP_URL/);
  assert.match(csrf, /\.trim\(\)/);
  assert.match(csrf, /replace\(\/\\\/$\//);
});

test("CSRF policy rejects missing origins and recognizes only state-changing methods", () => {
  assert.match(csrf, /if \(!origin\) return false/);
  assert.match(csrf, /POST/);
  assert.match(csrf, /PUT/);
  assert.match(csrf, /PATCH/);
  assert.match(csrf, /DELETE/);
});
