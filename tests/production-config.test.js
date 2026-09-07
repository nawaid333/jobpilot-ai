const test = require("node:test");
const assert = require("node:assert/strict");

// Keep this contract test dependency-free so it can run before Prisma/Next builds.
function validateProductionConfig(env) {
  const required = ["DATABASE_URL", "OPENAI_API_KEY", "NEXT_PUBLIC_APP_URL"];
  const missing = required.filter((key) => !env[key]?.trim());
  const invalid = [];
  const appUrl = env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      if (new URL(appUrl).protocol !== "https:") invalid.push("NEXT_PUBLIC_APP_URL");
    } catch {
      invalid.push("NEXT_PUBLIC_APP_URL");
    }
  }
  return { ok: missing.length === 0 && invalid.length === 0, missing, invalid };
}

test("accepts complete production configuration", () => {
  const result = validateProductionConfig({ DATABASE_URL: "postgres://db", OPENAI_API_KEY: "test-key", NEXT_PUBLIC_APP_URL: "https://jobpilot.example" });
  assert.deepEqual(result, { ok: true, missing: [], invalid: [] });
});

test("reports all missing required production variables", () => {
  const result = validateProductionConfig({});
  assert.deepEqual(result.missing, ["DATABASE_URL", "OPENAI_API_KEY", "NEXT_PUBLIC_APP_URL"]);
  assert.equal(result.ok, false);
});

test("rejects non-HTTPS production app URLs", () => {
  const result = validateProductionConfig({ DATABASE_URL: "postgres://db", OPENAI_API_KEY: "test-key", NEXT_PUBLIC_APP_URL: "http://jobpilot.example" });
  assert.deepEqual(result.invalid, ["NEXT_PUBLIC_APP_URL"]);
  assert.equal(result.ok, false);
});

test("rejects malformed production app URLs", () => {
  const result = validateProductionConfig({ DATABASE_URL: "postgres://db", OPENAI_API_KEY: "test-key", NEXT_PUBLIC_APP_URL: "not-a-url" });
  assert.deepEqual(result.invalid, ["NEXT_PUBLIC_APP_URL"]);
  assert.equal(result.ok, false);
});
