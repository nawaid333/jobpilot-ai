import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const agentPage = readFileSync(resolve(projectRoot, "src/app/agent/page.tsx"), "utf8");

test("Agent page wires Daily Brief metrics to the live action queue", () => {
  assert.match(agentPage, /import \{ AgentBriefMetrics \} from "@\/components\/agent-brief-metrics"/);
  assert.match(agentPage, /import \{ getAgentBriefMetrics \} from "@\/lib\/agent-brief-metrics"/);
  assert.match(agentPage, /const actionIds = useMemo\(\(\) => data \? data\.actions\.map\(\(action: any\) => action\.id\) : \[\], \[data\]\)/);
  assert.match(agentPage, /const briefMetrics = useMemo\(\(\) => getAgentBriefMetrics\(actionIds, briefPreferences\), \[actionIds, briefPreferences\]\)/);
  assert.match(agentPage, /<AgentBriefMetrics metrics=\{briefMetrics\} \/>/);
});

test("Agent page keeps metrics derived from preferences rather than mutating the queue", () => {
  const metricsSection = agentPage.match(/const actionIds[\s\S]*?<AgentBriefMetrics metrics=\{briefMetrics\} \/>/)?.[0] ?? "";
  assert.ok(metricsSection.includes("getAgentBriefMetrics(actionIds, briefPreferences)"));
  assert.ok(!metricsSection.includes("dismissAgentBriefAction"));
  assert.ok(!metricsSection.includes("snoozeAgentBriefAction"));
});
