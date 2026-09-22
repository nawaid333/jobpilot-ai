import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

function modelBlock(name) {
  const match = schema.match(new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`, "m"));
  assert.ok(match, `Prisma schema must define ${name}`);
  return match[1];
}

test("Agent activity has a bounded chronological query path", () => {
  const agent = modelBlock("AgentAction");
  assert.match(agent, /@@index\(\[userId, createdAt\]\)/);
  assert.match(agent, /@@index\(\[applicationId, createdAt\]\)/);
});

test("Agent activity records auditable lifecycle fields", () => {
  const agent = modelBlock("AgentAction");
  for (const field of ["userId", "applicationId", "actionType", "status", "result", "createdAt", "completedAt"]) {
    assert.match(agent, new RegExp(`\\b${field}\\b`), `AgentAction must retain ${field}`);
  }
});

test("Agent activity remains user-owned", () => {
  const agent = modelBlock("AgentAction");
  assert.match(agent, /user\s+User\s+@relation\(fields:\s*\[userId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/);
});

test("test runner includes Agent activity regression coverage", () => {
  assert.equal(packageJson.scripts.test, "node --test tests/*.test.js");
});
