import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

test("lint command is non-interactive and uses the repository ESLint config", async () => {
  assert.equal(packageJson.scripts.lint, "eslint .");
  assert.ok(packageJson.devDependencies.globals, "Node globals package must be available to ESLint");

  const config = await readFile(new URL("../eslint.config.mjs", import.meta.url), "utf8");
  assert.match(config, /eslint-config-next\/core-web-vitals\.js/);
  assert.match(config, /(?<!\.)\bnextVitals\b/);
  assert.doesNotMatch(config, /\.\.\.nextVitals/);
  assert.match(config, /globals\.node/);
  assert.match(config, /tests\/\*\*\/\*\.js/);
  assert.match(config, /scripts\/\*\*\/\*\.mjs/);
  assert.match(config, /\.next\/\*\*/);
  assert.match(config, /node_modules\/\*\*/);
});
