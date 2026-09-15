import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const smokeScript = await readFile(new URL("../scripts/mvp-smoke.mjs", import.meta.url), "utf8");

const requiredUiRoutes = [
  "/",
  "/jobs",
  "/discover",
  "/analyze",
  "/tailor",
  "/tracker",
  "/application",
  "/interview",
  "/agent",
  "/dashboard",
  "/copilot",
  "/intelligence",
  "/analytics",
];

const requiredProtectedApis = [
  "/api/applications",
  "/api/agent",
  "/api/gmail/scan",
  "/api/interview",
];

function assertRoutePresent(route) {
  const routeLiteral = JSON.stringify(route);
  assert.ok(
    smokeScript.includes(routeLiteral) || smokeScript.includes(`'${route}'`) || smokeScript.includes(`\`${route}\``),
    `MVP smoke script must reference ${route}`,
  );
}

test("MVP smoke covers every critical UI surface", () => {
  for (const route of requiredUiRoutes) assertRoutePresent(route);
});

test("MVP smoke checks authentication boundaries without mutating application state", () => {
  for (const route of requiredProtectedApis) assertRoutePresent(route);
  assert.doesNotMatch(smokeScript, /method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i);
  assert.match(smokeScript, /\[401, 403, 405\]/);
});
