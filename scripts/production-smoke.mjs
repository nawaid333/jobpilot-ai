const base = process.env.SMOKE_BASE_URL;

if (!base) {
  console.error("SMOKE_BASE_URL is required for production smoke testing.");
  process.exit(2);
}

const origin = base.replace(/\/$/, "");
const checks = [
  { name: "health", path: "/api/health", expected: [200] },
  { name: "applications auth", path: "/api/applications", expected: [401, 403] },
  { name: "recommendations auth", path: "/api/jobs/recommend", expected: [401, 403] },
  { name: "tailoring auth", path: "/api/tailor", expected: [401, 403] },
  { name: "agent auth", path: "/api/agent/execute", expected: [401, 403] },
];

let failed = false;
for (const check of checks) {
  try {
    const response = await fetch(`${origin}${check.path}`, { redirect: "manual", signal: AbortSignal.timeout(10000) });
    const body = await response.text();
    if (!check.expected.includes(response.status)) {
      failed = true;
      console.error(`FAIL ${check.name}: expected ${check.expected.join(" or ")}, got ${response.status}`);
      console.error(body.slice(0, 1000));
      continue;
    }

    if (check.path === "/api/health") {
      let payload;
      try { payload = JSON.parse(body); } catch { payload = null; }
      if (!payload || payload.status !== "ok" || payload.checks?.database !== "ok" || payload.checks?.configuration !== "ok") {
        failed = true;
        console.error(`FAIL ${check.name}: unhealthy payload ${body.slice(0, 1000)}`);
        continue;
      }
    }

    console.log(`PASS ${check.name}: ${response.status}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${check.name}: ${error instanceof Error ? error.message : error}`);
  }
}

if (failed) process.exit(1);
console.log(`Production smoke test passed: ${origin}`);
