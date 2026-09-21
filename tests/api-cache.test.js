import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const helperPath = path.join(process.cwd(), "src", "lib", "api-cache.ts");
const middlewarePath = path.join(process.cwd(), "src", "middleware.ts");

const helperSource = fs.readFileSync(helperPath, "utf8");
const middlewareSource = fs.readFileSync(middlewarePath, "utf8");

test("API cache policy is private and non-storable", () => {
  assert.match(helperSource, /PRIVATE_API_CACHE_CONTROL\s*=\s*[\"']private, no-store, max-age=0[\"']\s*;/);
  assert.match(helperSource, /headers\.set\([\"']Cache-Control[\"'],\s*PRIVATE_API_CACHE_CONTROL\)/);
});

test("middleware applies the private cache policy only to API routes", () => {
  assert.match(middlewareSource, /@\/lib\/api-cache/);
  assert.match(
    middlewareSource,
    /if\s*\(request\.nextUrl\.pathname\.startsWith\([\"']\/api\/[\"']\)\)\s*\{\s*setPrivateApiCacheHeaders\(response\.headers\);\s*\}/s,
  );
});
