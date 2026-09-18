import { spawn } from "node:child_process";

const port = process.env.MVP_SMOKE_PORT || "3200";
const base = `http://127.0.0.1:${port}`;
const appRoutes = [
  "/",
  "/jobs",
  "/discover",
  "/analyze",
  "/tailor",
  "/tracker",
  "/application",
  "/interview",
  "/agent",
  "/dashboard",
  "/copilot",
  "/intelligence",
  "/analytics",
];
const protectedApis = [
  "/api/applications",
  "/api/agent",
  "/api/gmail/scan",
  "/api/interview",
];

const server = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["next", "start", "-p", port], {
  env: { ...process.env, PORT: port },
  stdio: "pipe",
  detached: process.platform !== "win32",
});

let output = "";
let stopping = false;
server.stdout.on("data", chunk => { output += chunk.toString(); });
server.stderr.on("data", chunk => { output += chunk.toString(); });
server.on("error", error => {
  if (!stopping) {
    console.error(`MVP smoke server failed to spawn: ${error.message}`);
    process.exitCode = 1;
  }
});

async function request(path) {
  return fetch(`${base}${path}`, {
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await request("/api/health");
      if (response.status === 200) return response;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`Server did not start.\n${output.slice(-4000)}`);
}

function assertSecurityHeaders(response, path) {
  const required = [
    "x-content-type-options",
    "x-frame-options",
    "referrer-policy",
  ];
  for (const name of required) {
    if (!response.headers.get(name)) {
      throw new Error(`${path} missing ${name}`);
    }
  }
}

async function stopServer() {
  stopping = true;
  if (server.exitCode !== null || server.signalCode !== null) return;

  if (process.platform === "win32") {
    server.kill("SIGTERM");
    return;
  }

  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {}

  await Promise.race([
    new Promise(resolve => server.once("exit", resolve)),
    new Promise(resolve => setTimeout(resolve, 3000)),
  ]);

  if (server.exitCode === null && server.signalCode === null) {
    try {
      process.kill(-server.pid, "SIGKILL");
    } catch {}
  }
}

try {
  const health = await waitForServer();
  const healthBody = await health.json();
  if (
    healthBody.status !== "ok" ||
    healthBody.checks?.database !== "ok" ||
    healthBody.checks?.config !== "ok"
  ) {
    throw new Error(`Health check is not healthy: ${JSON.stringify(healthBody)}`);
  }
  console.log("PASS /api/health (database + configuration healthy)");

  for (const route of appRoutes) {
    const response = await request(route);
    if (response.status >= 500) {
      throw new Error(`${route} returned HTTP ${response.status}`);
    }
    assertSecurityHeaders(response, route);
    console.log(`PASS ${route} (${response.status}, security headers present)`);
  }

  for (const route of protectedApis) {
    const response = await request(route);
    if (![401, 403, 405].includes(response.status)) {
      throw new Error(`${route} expected auth/method protection, got HTTP ${response.status}`);
    }
    assertSecurityHeaders(response, route);
    console.log(`PASS ${route} protection (${response.status})`);
  }

  const robots = await request("/robots.txt");
  if (robots.status >= 500) throw new Error(`/robots.txt returned HTTP ${robots.status}`);
  console.log(`PASS /robots.txt (${robots.status})`);

  console.log("MVP smoke test passed: core UI routes, health, security headers, and protected API boundaries are healthy.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  console.error(output.slice(-4000));
  process.exitCode = 1;
} finally {
  await stopServer();
}
