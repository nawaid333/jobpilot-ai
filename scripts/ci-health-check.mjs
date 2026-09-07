const url = process.env.CI_HEALTH_URL || "http://127.0.0.1:3000/api/health";

const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
const body = await response.text();

if (!response.ok) {
  console.error(`Health check failed with HTTP ${response.status}: ${body}`);
  process.exit(1);
}

let payload;
try {
  payload = JSON.parse(body);
} catch {
  console.error(`Health check returned non-JSON: ${body}`);
  process.exit(1);
}

const config = payload.checks?.config ?? payload.checks?.configuration;
const required = payload.ok === true && payload.status === "ok" && payload.checks?.database === "ok" && config === "ok";

if (!required) {
  console.error(`Health check returned an unhealthy payload: ${body}`);
  process.exit(1);
}

console.log(`Health check passed in ${payload.latencyMs}ms`);
