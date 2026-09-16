import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const component = readFileSync(resolve(projectRoot, "src/components/agent-brief-metrics.tsx"), "utf8");

test("Daily Brief metrics use descriptive definition-list semantics", () => {
  assert.match(component, /<dl className="trust-points" aria-label="Daily Brief status summary">/);
  assert.equal((component.match(/<dt>/g) ?? []).length, 4);
  assert.equal((component.match(/<dd>/g) ?? []).length, 4);
  assert.match(component, /<dt>Visible<\/dt>/);
  assert.match(component, /<dt>Dismissed<\/dt>/);
  assert.match(component, /<dt>Snoozed<\/dt>/);
  assert.match(component, /<dt>Total<\/dt>/);
});
