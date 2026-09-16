import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const middleware = readFileSync(resolve(projectRoot, "src/middleware.ts"), "utf8");

test("middleware emits baseline browser security headers", () => {
  for (const header of [
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Cross-Origin-Opener-Policy",
  ]) {
    assert.match(middleware, new RegExp(`response\\.headers\\.set\\(\\"${header}\\"`));
  }
});

test("middleware applies HSTS only in production", () => {
  assert.match(middleware, /process\.env\.NODE_ENV === \"production\"/);
  assert.match(middleware, /Strict-Transport-Security/);
});

test("state-changing API requests enforce the origin policy", () => {
  assert.match(middleware, /pathname\.startsWith\(\"\/api\/\"\)/);
  assert.match(middleware, /isMutation\(request\)/);
  assert.match(middleware, /isAllowedOrigin\(request\)/);
  assert.match(middleware, /status: 403/);
});
