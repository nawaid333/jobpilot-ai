import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const schema = execFileSync("npx", ["prisma", "validate"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
assert.match(schema, /schema\.prisma is valid|valid/i);

const packageJson = JSON.parse(execFileSync("node", ["-e", "process.stdout.write(require('fs').readFileSync('package.json','utf8'))"], { encoding: "utf8" }));
assert.equal(packageJson.scripts["test:interview-history"], "node --test scripts/interview-history-regression.mjs");

console.log("Interview history schema and regression script configuration are valid.");
