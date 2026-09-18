import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

test("lint command is non-interactive and uses the repository ESLint config", async () => {
  assert.equal(packageJson.scripts.lint, "eslint .");

  const config = await readFile(new URL("../eslint.config.mjs", import.meta.url), "utf8");
  assert.match(config, /eslint-config-next\/core-web-vitals/);
  assert.match(config, /\.next\/\*\*/);
  assert.match(config, /node_modules\/\*\*/);
});
