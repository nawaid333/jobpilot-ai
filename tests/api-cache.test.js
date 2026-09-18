const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const helperPath = path.join(__dirname, "..", "src", "lib", "api-cache.ts");
const middlewarePath = path.join(__dirname, "..", "src", "middleware.ts");

const helperSource = fs.readFileSync(helperPath, "utf8");
const middlewareSource = fs.readFileSync(middlewarePath, "utf8");

test("API cache policy is private and non-storable", () => {
  assert.match(
    helperSource,
    /PRIVATE_API_CACHE_CONTROL\s*=\s*["']private, no-store, max-age=0["']\s*;/,
  );
  assert.match(
    helperSource,
    /headers\.set\(["']Cache-Control["'],\s*PRIVATE_API_CACHE_CONTROL\)/,
  );
});

test("middleware applies the private cache policy to API routes", () => {
  assert.match(middlewareSource, /@\/lib\/api-cache/);
  assert.match(
    middlewareSource,
    /pathname\.startsWith\(["']\/api\/["']\)\s*\{\s*setPrivateApiCacheHeaders\(response\.headers\);/s,
  );
});
