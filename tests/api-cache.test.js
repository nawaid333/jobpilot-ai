const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PRIVATE_API_CACHE_CONTROL,
  setPrivateApiCacheHeaders,
} = require("../src/lib/api-cache.ts");

test("API cache policy is private and non-storable", () => {
  assert.equal(PRIVATE_API_CACHE_CONTROL, "private, no-store, max-age=0");

  const headers = new Headers({ "Cache-Control": "public, max-age=3600" });
  setPrivateApiCacheHeaders(headers);

  assert.equal(headers.get("Cache-Control"), PRIVATE_API_CACHE_CONTROL);
});
