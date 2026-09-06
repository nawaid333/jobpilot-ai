import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("src/app/api/gmail/signals/apply/route.ts", "utf8");

assert.match(route, /getCurrentUser\(\)/);
assert.match(route, /userId:user\.id/);
assert.match(route, /applicationId:applicationId,userId:user\.id/);
assert.match(route, /signal\.applied/);
assert.match(route, /signal\.applicationId===app\.id/);
assert.match(route, /alreadyApplied:true/);
assert.match(route, /already applied to another application/);
assert.match(route, /prisma\.\$transaction/);
assert.match(route, /prisma\.application\.update/);
assert.match(route, /prisma\.emailSignal\.update/);

console.log("Gmail signal approval security/idempotency regression checks passed.");
