const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";

const checks = [
  { name: "health", path: "/api/health", expected: 200 },
  { name: "applications requires auth", path: "/api/applications", expected: 401 },
  { name: "recommendations requires auth", path: "/api/jobs/recommend", expected: 401 },
  { name: "tailoring requires auth", path: "/api/tailor", expected: 401 },
  { name: "agent requires auth", path: "/api/agent/execute", expected: 401 },
];

let failed = false;
for (const check of checks) {
  try {
    const response = await fetch(`${base}${check.path}`, { redirect: "manual", signal: AbortSignal.timeout(5000) });
    const body = await response.text();
    if (response.status !== check.expected) {
      failed = true;
      console.error(`FAIL ${check.name}: expected ${check.expected}, got ${response.status}`);
      console.error(body.slice(0, 500));
    } else {
      console.log(`PASS ${check.name}: ${response.status}`);
    }
  } catch (error) {
    failed = true;
    console.error(`FAIL ${check.name}: ${error instanceof Error ? error.message : error}`);
  }
}

if (failed) process.exit(1);
console.log("API smoke checks passed.");
