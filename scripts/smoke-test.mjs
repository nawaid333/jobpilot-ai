import { spawn } from "node:child_process";

const port = process.env.SMOKE_PORT || "3100";
const base = `http://127.0.0.1:${port}`;
const publicRoutes = ["/", "/jobs", "/tailor", "/tracker"];
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
    console.error(`Smoke server failed to spawn: ${error.message}`);
    process.exitCode = 1;
  }
});

async function request(path) {
  return fetch(`${base}${path}`, { redirect: "manual", signal: AbortSignal.timeout(5000) });
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
  if (healthBody.status !== "ok" || healthBody.checks?.database !== "ok" || healthBody.checks?.config !== "ok") {
    throw new Error(`Health check is not healthy: ${JSON.stringify(healthBody)}`);
  }
  console.log("PASS /api/health (200, database + configuration healthy)");

  for (const route of publicRoutes) {
    const response = await request(route);
    if (response.status >= 500) throw new Error(`${route} returned HTTP ${response.status}`);
    const headers = response.headers;
    const security = {
      "x-content-type-options": headers.get("x-content-type-options"),
      "x-frame-options": headers.get("x-frame-options"),
      "referrer-policy": headers.get("referrer-policy"),
    };
    for (const [name, value] of Object.entries(security)) if (!value) throw new Error(`${route} missing ${name}`);
    console.log(`PASS ${route} (${response.status}, security headers present)`);
  }

  const unauth = await request("/api/applications");
  if (![401, 403].includes(unauth.status)) throw new Error(`/api/applications expected auth protection, got HTTP ${unauth.status}`);
  console.log(`PASS /api/applications auth protection (${unauth.status})`);

  console.log("Smoke test passed: health, public routes, security headers, and auth protection are healthy.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  console.error(output.slice(-4000));
  process.exitCode = 1;
} finally {
  await stopServer();
}
