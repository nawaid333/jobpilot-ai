import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const smoke = readFileSync(resolve(projectRoot, "scripts/api-smoke.mjs"), "utf8");

test("API smoke uses read-only methods for read-only endpoints", () => {
  assert.match(smoke, /path: "\/api\/health", method: "GET", expected: 200/);
  assert.match(smoke, /path: "\/api\/applications", method: "GET", expected: 401/);
  assert.match(smoke, /path: "\/api\/jobs\/recommend", method: "GET", expected: 401/);
});

test("API smoke uses POST for POST-only protected endpoints", () => {
  assert.match(smoke, /path: "\/api\/tailor", method: "POST", expected: 401, body: \{\}/);
  assert.match(smoke, /path: "\/api\/agent\/execute", method: "POST", expected: 401, body: \{\}/);
  assert.match(smoke, /if \(check\.body !== undefined\)/);
  assert.match(smoke, /init\.body = JSON\.stringify\(check\.body\)/);
});
