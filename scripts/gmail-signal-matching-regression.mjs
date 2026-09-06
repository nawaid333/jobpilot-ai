import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("src/app/api/gmail/signals/route.ts", "utf8");
const applyRoute = fs.readFileSync("src/app/api/gmail/signals/apply/route.ts", "utf8");

// Matching must be scoped to the authenticated user's signal and application.
assert.match(route, /signalId,applicationId/);
assert.match(route, /id:signalId,userId:user\.id/);
assert.match(route, /id:applicationId,userId:user\.id/);

// A retry against the same application is safe; applying to another is rejected.
assert.match(route, /alreadyMatched:true/);
assert.match(route, /already applied to another application/);
assert.match(route, /ambiguous:false/);
assert.match(route, /matchMethod:"manual"/);

// Approval must remain atomic and idempotent.
assert.match(applyRoute, /signal\.applied/);
assert.match(applyRoute, /alreadyApplied:true/);
assert.match(applyRoute, /prisma\.\$transaction/);
assert.match(applyRoute, /prisma\.application\.update/);
assert.match(applyRoute, /prisma\.emailSignal\.update/);

console.log("Gmail signal matching and approval regression checks passed.");
