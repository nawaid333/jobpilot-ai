import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("src/app/intelligence/page.tsx", "utf8");
assert.match(page, /\/api\/gmail\/signals/);
assert.match(page, /\/api\/gmail\/signals\/apply/);
assert.match(page, /applicationId/);
assert.match(page, /ambiguous/);
assert.match(page, /Select a saved application/);
assert.match(page, /Approve →/);
assert.match(page, /JobPilot never sends this automatically/);

console.log("Email intelligence UI regression checks passed.");
