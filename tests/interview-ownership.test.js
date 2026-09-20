const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROUTE = path.join(process.cwd(), "src", "app", "api", "interview", "route.ts");

test("interview practice writes re-check application ownership inside the transaction", () => {
  const source = fs.readFileSync(ROUTE, "utf8");

  assert.match(
    source,
    /async function savePractice\(userId:string,applicationId:string,/,
    "savePractice must receive the authenticated user id",
  );
  assert.match(
    source,
    /tx\.application\.findFirst\(\{where:\{id:applicationId,userId\}/,
    "the transactional application lookup must be scoped to the authenticated user",
  );
  assert.match(
    source,
    /tx\.interviewPractice\.create\(\{data:\{applicationId:application\.id,/,
    "practice records must only be created after the owned application is resolved",
  );
  assert.doesNotMatch(
    source,
    /tx\.application\.findUnique\(\{where:\{id:applicationId\}/,
    "the transactional ownership check must not use an unscoped application id lookup",
  );
});
