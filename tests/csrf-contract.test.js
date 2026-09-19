const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const csrfSource = fs.readFileSync(path.join(root, "src/lib/csrf.ts"), "utf8");
const middlewareSource = fs.readFileSync(path.join(root, "src/middleware.ts"), "utf8");

test("CSRF policy requires an explicit Origin and exact allowlist match", () => {
  assert.match(csrfSource, /const origin = request\.headers\.get\("origin"\);/);
  assert.match(csrfSource, /if \(!origin\) return false;/);
  assert.match(csrfSource, /return allowedOrigins\(\)\.has\(origin\.replace\(/);
  assert.match(csrfSource, /replace\(\/\\\/\$\/, ""\)/);
});

test("CSRF policy includes local, configured, and Vercel deployment origins", () => {
  assert.match(csrfSource, /DEFAULT_LOCAL_ORIGINS/);
  assert.match(csrfSource, /NEXT_PUBLIC_APP_URL/);
  assert.match(csrfSource, /VERCEL_URL/);
});

test("middleware applies origin protection only to API mutations", () => {
  assert.match(middlewareSource, /request\.nextUrl\.pathname\.startsWith\("\/api\/"\) && isMutation\(request\)/);
  assert.match(middlewareSource, /if \(!isAllowedOrigin\(request\)\)/);
  assert.match(middlewareSource, /status: 403/);
  assert.match(middlewareSource, /Cross-site request blocked\./);
});

test("CSRF mutation methods cover all state-changing HTTP verbs", () => {
  assert.match(csrfSource, /\["POST", "PUT", "PATCH", "DELETE"\]/);
});
