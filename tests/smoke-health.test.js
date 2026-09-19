const test = require("node:test");
const assert = require("node:assert/strict");

function isHealthyHealthPayload(payload) {
  const checks = payload?.checks ?? {};
  const configurationStatus = checks.configuration ?? checks.config;
  return payload?.status === "ok" && checks.database === "ok" && configurationStatus === "ok";
}

test("smoke health validation accepts the canonical configuration check", () => {
  assert.equal(isHealthyHealthPayload({ status: "ok", checks: { database: "ok", configuration: "ok" } }), true);
});

test("smoke health validation remains compatible with the legacy config key", () => {
  assert.equal(isHealthyHealthPayload({ status: "ok", checks: { database: "ok", config: "ok" } }), true);
});

test("smoke health validation rejects unhealthy database or configuration", () => {
  assert.equal(isHealthyHealthPayload({ status: "ok", checks: { database: "failed", configuration: "ok" } }), false);
  assert.equal(isHealthyHealthPayload({ status: "ok", checks: { database: "ok", configuration: "failed" } }), false);
});
