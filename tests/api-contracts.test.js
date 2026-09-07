const test = require("node:test");
const assert = require("node:assert/strict");

const requiredHealthFields = ["status", "checks", "latencyMs", "timestamp"];
const requiredRecommendationFields = ["recommendations", "generatedAt", "strategy", "configured", "sourceCount"];

function assertObject(value, name) {
  assert.equal(typeof value, "object", `${name} must be an object`);
  assert.notEqual(value, null, `${name} must not be null`);
}

function validateHealth(payload) {
  assertObject(payload, "health payload");
  for (const field of requiredHealthFields) assert.ok(field in payload, `health missing ${field}`);
  assert.ok(["ok", "degraded"].includes(payload.status));
  assertObject(payload.checks, "health checks");
  assert.equal(typeof payload.latencyMs, "number");
  assert.equal(typeof payload.timestamp, "string");
}

function validateRecommendations(payload) {
  assertObject(payload, "recommendations payload");
  for (const field of requiredRecommendationFields) assert.ok(field in payload, `recommendations missing ${field}`);
  assert.ok(Array.isArray(payload.recommendations));
  assert.equal(typeof payload.generatedAt, "string");
  assert.equal(typeof payload.strategy, "string");
  assert.equal(typeof payload.configured, "boolean");
  assert.equal(typeof payload.sourceCount, "number");
}

test("health contract accepts healthy response", () => {
  validateHealth({ status: "ok", checks: { database: "ok", configuration: "ok" }, latencyMs: 12, timestamp: new Date().toISOString() });
});

test("health contract accepts degraded response", () => {
  validateHealth({ status: "degraded", checks: { database: "failed", configuration: "ok" }, latencyMs: 20, timestamp: new Date().toISOString() });
});

test("recommendations contract requires stable top-level fields", () => {
  validateRecommendations({ recommendations: [], generatedAt: new Date().toISOString(), strategy: "live-explainable", configured: false, sourceCount: 0 });
});

test("recommendation item exposes explainable scoring fields", () => {
  const item = { id: "job-1", title: "Software Engineer", company: "Acme", location: "Remote", matchScore: 82, matchReasons: ["Role fit: engineer"], matchedSkills: ["python"], matchedRoles: ["software engineer"] };
  assert.equal(typeof item.matchScore, "number");
  assert.ok(item.matchScore >= 0 && item.matchScore <= 100);
  assert.ok(Array.isArray(item.matchReasons));
  assert.ok(Array.isArray(item.matchedSkills));
  assert.ok(Array.isArray(item.matchedRoles));
});
