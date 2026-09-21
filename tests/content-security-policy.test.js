import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const policyPath = path.join(process.cwd(), "src", "lib", "content-security-policy.ts");
const middlewarePath = path.join(process.cwd(), "src", "middleware.ts");

const policySource = fs.readFileSync(policyPath, "utf8");
const middlewareSource = fs.readFileSync(middlewarePath, "utf8");

test("production CSP blocks framing, plugins, and cross-origin connections", () => {
  assert.match(policySource, /default-src 'self'/);
  assert.match(policySource, /base-uri 'self'/);
  assert.match(policySource, /frame-ancestors 'none'/);
  assert.match(policySource, /frame-src 'none'/);
  assert.match(policySource, /form-action 'self'/);
  assert.match(policySource, /object-src 'none'/);
  assert.match(policySource, /connect-src 'self'/);
  assert.match(policySource, /upgrade-insecure-requests/);
  assert.match(policySource, /headers\.set\(["']Content-Security-Policy["'],\s*PRODUCTION_CONTENT_SECURITY_POLICY\)/);
});

test("CSP is enforced only in production", () => {
  assert.match(
    middlewareSource,
    /if\s*\(process\.env\.NODE_ENV === "production"\)\s*\{[\s\S]*setProductionContentSecurityPolicy\(response\.headers\);[\s\S]*\}/,
  );
  assert.match(middlewareSource, /@\/lib\/content-security-policy/);
});
