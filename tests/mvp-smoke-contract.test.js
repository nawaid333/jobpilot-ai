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
  const routeLine = `  ${JSON.stringify(route)},`;
  assert.ok(
    smokeScript.includes(routeLine),
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

test("MVP smoke uses the live health response field names", () => {
  assert.match(smokeScript, /healthBody\.checks\?\.database\s*!==\s*["']ok["']/);
  assert.match(smokeScript, /healthBody\.checks\?\.config\s*!==\s*["']ok["']/);
  assert.doesNotMatch(smokeScript, /healthBody\.checks\?\.configuration\s*!==\s*["']ok["']/);
});

test("MVP smoke always cleans up its child server", () => {
  assert.match(smokeScript, /async function stopServer\(\)/);
  assert.match(smokeScript, /server\.kill\("SIGTERM"\)/);
  assert.match(smokeScript, /server\.kill\("SIGKILL"\)/);
  assert.match(smokeScript, /finally\s*\{\s*await stopServer\(\);\s*\}/s);
});

test("MVP smoke route contracts are unique and ordered", () => {
  for (const routes of [requiredUiRoutes, requiredProtectedApis]) {
    for (const route of routes) {
      assert.equal(
        smokeScript.split(`  ${JSON.stringify(route)},`).length - 1,
        1,
        `MVP smoke route ${route} must appear exactly once`,
      );
    }
  }
});
