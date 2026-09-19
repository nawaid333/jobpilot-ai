import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

test("lint command is non-interactive and uses a flat-compatible Next.js config", async () => {
  assert.equal(packageJson.scripts.lint, "eslint .");
  assert.ok(packageJson.devDependencies.globals, "Node globals package must be available to ESLint");
  assert.ok(packageJson.devDependencies["@eslint/eslintrc"], "FlatCompat dependency must be explicit");

  const config = await readFile(new URL("../eslint.config.mjs", import.meta.url), "utf8");
  assert.match(config, /FlatCompat/);
  assert.match(config, /compat\.extends\("next\/core-web-vitals"\)/);
  assert.match(config, /\.\.\.compat\.extends/);
  assert.doesNotMatch(config, /eslint-config-next\/core-web-vitals\.js/);
  assert.match(config, /globals\.node/);
  assert.match(config, /tests\/\*\*\/\*\.js/);
  assert.match(config, /scripts\/\*\*\/\*\.mjs/);
  assert.match(config, /\.next\/\*\*/);
  assert.match(config, /node_modules\/\*\*/);
});

test("linted pages escape apostrophes in JSX text", async () => {
  const pages = [
    ["automation", "employer's", "employer&apos;s"],
    ["dashboard", "Don't guess", "Don&apos;t guess"],
    ["jobs", "Don't just find jobs", "Don&apos;t just find jobs"],
    ["profile", "what you're looking for", "what you&apos;re looking for"],
    ["tailor", "You'll get", "You&apos;ll get"],
    ["tailor", "employer's application", "employer&apos;s application"],
  ];

  for (const [page, rawText, escapedText] of pages) {
    const content = await readFile(new URL(`../src/app/${page}/page.tsx`, import.meta.url), "utf8");
    assert.doesNotMatch(content, new RegExp(`<[^>]+>[^<]*${rawText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(content, new RegExp(escapedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
