const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";

const checks = [
  { name: "health", path: "/api/health", expected: 200 },
  { name: "applications requires auth", path: "/api/applications", expected: 401 },
  { name: "recommendations requires auth", path: "/api/jobs/recommend", expected: 401 },
  { name: "tailoring requires auth", path: "/api/tailor", expected: 401 },
  { name: "agent requires auth", path: "/api/agent/execute", expected: 401 },
];

const requiredHeaders = ["x-content-type-options", "x-frame-options", "referrer-policy"];
let failed = false;

async function runCheck(check) {
  const response = await fetch(`${base}${check.path}`, { redirect: "manual", signal: AbortSignal.timeout(5000) });
  const body = await response.text();
  if (response.status !== check.expected) {
    throw new Error(`expected HTTP ${check.expected}, got ${response.status}: ${body.slice(0, 300)}`);
  }
  for (const header of requiredHeaders) {
    if (!response.headers.get(header)) throw new Error(`missing security header ${header}`);
  }
  console.log(`PASS ${check.name}: ${response.status}`);
}

for (const check of checks) {
  try {
    await runCheck(check);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${check.name}: ${error instanceof Error ? error.message : error}`);
  }
}

if (failed) process.exit(1);
console.log("API smoke checks passed: health, auth boundaries, and security headers.");
