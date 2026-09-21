import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const schema = fs.readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../prisma/migrations/0004_retention_indexes/migration.sql", import.meta.url), "utf8");

const requiredIndexes = [
  ["Job", "lastSeenAt"],
  ["Application", "userId", "followUpDueAt"],
  ["EmailSignal", "userId", "createdAt"],
  ["AiUsage", "month"],
];

test("retention query indexes are declared in the Prisma schema", () => {
  for (const [model, ...fields] of requiredIndexes) {
    const modelMatch = schema.match(new RegExp(`model\\s+${model}\\s*\\{([\\s\\S]*?)\\n\\}`));
    assert.ok(modelMatch, `${model} model should exist`);
    const body = modelMatch[1];
    const index = fields.join(", ");
    assert.match(body, new RegExp(`@@index\\(\\[${index}\\]\\)`), `${model} should index [${index}]`);
  }
});

test("retention migration creates every required database index", () => {
  for (const [model, ...fields] of requiredIndexes) {
    const name = `${model}_${fields.join("_")}_idx`;
    assert.match(migration, new RegExp(`CREATE INDEX [^;]*\\"${name}\\"`), `${name} should be created`);
  }
});

test("retention indexes are additive and do not contain destructive SQL", () => {
  assert.doesNotMatch(migration, /\\bDROP\\s+(TABLE|INDEX|COLUMN)\\b/i);
  assert.doesNotMatch(migration, /\\bDELETE\\s+FROM\\b/i);
  assert.doesNotMatch(migration, /\\bTRUNCATE\\b/i);
});
