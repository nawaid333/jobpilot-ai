import { spawnSync } from "node:child_process";

const checks = [
  ["typecheck", "npm", ["run", "typecheck"]],
  ["production build", "npm", ["run", "build"]],
  ["security smoke", "npm", ["run", "test:security"]],
  ["application status regression", "npm", ["run", "test:application-status"]],
];

let failed = false;
for (const [name, command, args] of checks) {
  console.log(`\n=== ${name} ===`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    failed = true;
    console.error(`✗ ${name} failed`);
  } else {
    console.log(`✓ ${name} passed`);
  }
}

if (failed) process.exit(1);
console.log("\nQA preflight passed: typecheck, production build, security, and regression suites are green.");
