const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const PDF_ROUTE = path.join(process.cwd(), "src", "app", "api", "applications", "export-pdf", "route.ts");

test("PDF resume export requires an application id and scopes the lookup to the authenticated user", () => {
  const source = fs.readFileSync(PDF_ROUTE, "utf8");

  assert.match(
    source,
    /const id=clean\(p\.get\("applicationId"\)\)/,
    "PDF export must read the requested application id",
  );
  assert.match(
    source,
    /if\(!id\|\|id\.length>100\)return NextResponse\.json\(\{error:"applicationId is required"\},\{status:400\}\)/,
    "PDF export must reject a missing or oversized application id",
  );
  assert.match(
    source,
    /prisma\.application\.findFirst\(\{where:\{id,userId:user\.id\}/,
    "PDF export must only load an application owned by the authenticated user",
  );
  assert.doesNotMatch(
    source,
    /prisma\.application\.findFirst\(\{where:\{userId:user\.id\}/,
    "PDF export must not select an arbitrary application from the user's records",
  );
});
