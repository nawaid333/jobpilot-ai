import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const vercelConfig = JSON.parse(
  fs.readFileSync(new URL("../vercel.json", import.meta.url), "utf8"),
);

function repositoryHasLockfile() {
  return ["package-lock.json", "npm-shrinkwrap.json"].some((name) =>
    fs.existsSync(new URL(`../${name}`, import.meta.url)),
  );
}

test("Vercel install command is compatible with the repository dependency lock state", () => {
  const installCommand = vercelConfig.installCommand;
  assert.equal(typeof installCommand, "string");

  if (!repositoryHasLockfile()) {
    assert.doesNotMatch(
      installCommand,
      /\bnpm\s+ci\b/,
      "npm ci requires a committed npm lockfile",
    );
  }
});

test("Vercel uses the environment-aware build script", () => {
  assert.equal(vercelConfig.buildCommand, "npm run vercel-build");
  const buildScript = fs.readFileSync(new URL("../scripts/vercel-build.mjs", import.meta.url), "utf8");
  assert.match(buildScript, /VERCEL_ENV === "production"/);
  assert.match(buildScript, /prisma",\s*"migrate",\s*"deploy/);
  assert.match(buildScript, /npm",\s*"run",\s*"build/);
});
