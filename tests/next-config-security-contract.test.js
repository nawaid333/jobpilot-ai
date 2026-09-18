import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const nextConfig = readFileSync(resolve(projectRoot, "next.config.ts"), "utf8");

test("Next.js security headers include a production CSP", () => {
  assert.match(nextConfig, /Content-Security-Policy/);
  assert.match(nextConfig, /process\.env\.NODE_ENV === "production"/);
  for (const directive of [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
  ]) {
    assert.match(nextConfig, new RegExp(directive.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("production CSP keeps browser network access same-origin by default", () => {
  assert.match(nextConfig, /connect-src 'self' https:/);
  assert.match(nextConfig, /img-src 'self' data: blob: https:/);
  assert.match(nextConfig, /font-src 'self' data:/);
});
