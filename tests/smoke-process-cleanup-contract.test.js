import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const smokeScript = await readFile(new URL("../scripts/smoke-test.mjs", import.meta.url), "utf8");
const mvpSmokeScript = await readFile(new URL("../scripts/mvp-smoke.mjs", import.meta.url), "utf8");

function assertProcessGroupCleanup(script, name) {
  assert.match(script, /detached:\s*process\.platform !== "win32"/,
    `${name} must create a Unix process group for cleanup`);
  assert.match(script, /process\.kill\(-server\.pid, "SIGTERM"\)/,
    `${name} must terminate the complete Unix process group`);
  assert.match(script, /process\.kill\(-server\.pid, "SIGKILL"\)/,
    `${name} must force-kill a stuck Unix process group`);
  assert.match(script, /finally\s*\{\s*await stopServer\(\);\s*\}/s,
    `${name} must clean up in finally`);
}

test("critical smoke cleans up its complete child server process group", () => {
  assertProcessGroupCleanup(smokeScript, "Critical smoke");
});

test("MVP smoke cleans up its complete child server process group", () => {
  assertProcessGroupCleanup(mvpSmokeScript, "MVP smoke");
});
