import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("src/app/api/agent/execute/route.ts", "utf8");
const page = fs.readFileSync("src/app/agent/page.tsx", "utf8");

// The Agent execute endpoint must require authentication and enforce the same-user ownership boundary.
assert.match(route, /getCurrentUser\(\)/);
assert.match(route, /status: 401/);
assert.match(route, /id: applicationId, userId: user\.id/);
assert.match(route, /Application not found/);

// Only explicitly safe, user-confirmed state actions are executable.
assert.match(route, /safeActions = new Set\(\["prepare", "mark-preparing", "mark-applied"\]\)/);
assert.match(route, /Invalid action and application are required/);
assert.match(route, /originViolation\(request\)/);

// Preparation never submits an application automatically and only redirects to review.
assert.match(route, /Your tailored package is ready for review/);
assert.match(route, /did not submit the application/);

// The Agent UI must expose preparation as an explicit action and keep review links navigational.
assert.match(page, /onClick=\{\(\) => execute\(action\)\}/);
assert.match(page, /action\.type === "review" \? "Review" : "Open"/);
assert.match(page, /No automatic email sending/);
assert.match(page, /No automatic application submission/);

console.log("Agent action safety regression checks passed.");
