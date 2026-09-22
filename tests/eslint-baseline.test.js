const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");

const config = fs.readFileSync("eslint.config.mjs", "utf8");

test("ESLint baseline keeps legacy compatibility rules non-blocking", () => {
  assert.match(config, /"@typescript-eslint\/no-explicit-any":\s*"off"/);
  assert.match(config, /"@typescript-eslint\/no-require-imports":\s*"off"/);
  assert.match(config, /"react\/no-unescaped-entities":\s*"off"/);
  assert.match(config, /"prefer-rest-params":\s*"off"/);
});
