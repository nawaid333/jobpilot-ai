const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const PDF_ROUTE = path.join(process.cwd(), "src", "app", "api", "applications", "export-pdf", "route.ts");

test("PDF resume export requires an application id and scopes the lookup to the authenticated user", () => {
  const source = fs.readFileSync(PDF_ROUTE, "utf8");

  assert.match(
    source,
    /const\s+id\s*=\s*clean\(p\.get\("applicationId"\)\)/,
    "PDF export must read the requested application id",
  );
  assert.match(
    source,
    /if\s*\(!id\s*\|\|\s*id\.length\s*>\s*100\)\s*\{\s*return NextResponse\.json\(\{\s*error:\s*"applicationId is required"\s*\},\s*\{\s*status:\s*400\s*\}\)/s,
    "PDF export must reject a missing or oversized application id",
  );
  assert.match(
    source,
    /prisma\.application\.findFirst\(\{\s*where:\s*\{\s*id\s*,\s*userId:\s*user\.id\s*\}/s,
    "PDF export must only load an application owned by the authenticated user",
  );
  assert.doesNotMatch(
    source,
    /prisma\.application\.findFirst\(\{\s*where:\s*\{\s*userId:\s*user\.id\s*\}/s,
    "PDF export must not select an arbitrary application from the user's records",
  );
});
