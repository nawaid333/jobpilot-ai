import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const port = process.env.SMOKE_PORT || "3100";
const base = `http://127.0.0.1:${port}`;
const nextCli = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../node_modules/next/dist/bin/next");
const publicRoutes = ["/", "/jobs", "/tailor", "/tracker"];
const server = spawn(process.execPath, [nextCli, "start", "-p", port], {
  env: { ...process.env, PORT: port },
  stdio: "pipe",
});

let output = "";
server.stdout.on("data", chunk => { output += chunk.toString(); });
server.stderr.on("data", chunk => { output += chunk.toString(); });

async function request(pathname) {
  return fetch(`${base}${pathname}`, { redirect: "manual", signal: AbortSignal.timeout(5000) });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      return await request("/api/health");
    } catch {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`Server did not start.\n${output.slice(-4000)}`);
}

function stopServer() {
  if (server.exitCode !== null) return;
  server.kill("SIGTERM");
  setTimeout(() => {
    if (server.exitCode === null) server.kill("SIGKILL");
  }, 1000).unref();
}

try {
  const health = await waitForServer();
  if (health.status !== 200) throw new Error(`/api/health returned HTTP ${health.status}`);
  const healthBody = await health.json();
  const checks = healthBody.checks ?? {};
  const configurationStatus = checks.configuration ?? checks.config;
  if (healthBody.status !== "ok" || checks.database !== "ok" || configurationStatus !== "ok") {
    throw new Error(`Health check is not healthy: ${JSON.stringify(healthBody)}`);
  }
  console.log("PASS /api/health (200, database + configuration healthy)");

  for (const route of publicRoutes) {
    const response = await request(route);
    await response.arrayBuffer();
    if (response.status >= 500) throw new Error(`${route} returned HTTP ${response.status}`);
    const security = {
      "x-content-type-options": response.headers.get("x-content-type-options"),
      "x-frame-options": response.headers.get("x-frame-options"),
      "referrer-policy": response.headers.get("referrer-policy"),
    };
    for (const [name, value] of Object.entries(security)) {
      if (!value) throw new Error(`${route} missing ${name}`);
    }
    console.log(`PASS ${route} (${response.status}, security headers present)`);
  }

  const unauth = await request("/api/applications");
  await unauth.arrayBuffer();
  if (![401, 403].includes(unauth.status)) throw new Error(`/api/applications expected auth protection, got HTTP ${unauth.status}`);
  console.log(`PASS /api/applications auth protection (${unauth.status})`);
  console.log("Smoke test passed: health, public routes, security headers, and auth protection are healthy.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  console.error(output.slice(-4000));
  process.exitCode = 1;
} finally {
  stopServer();
}
