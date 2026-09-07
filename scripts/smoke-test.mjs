import { spawn } from "node:child_process";

const port = process.env.SMOKE_PORT || "3100";
const base = `http://127.0.0.1:${port}`;
const requiredRoutes = ["/", "/jobs", "/tailor", "/tracker", "/api/health"];

const server = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["next", "start", "-p", port], {
  env: { ...process.env, PORT: port },
  stdio: "pipe",
});

let output = "";
server.stdout.on("data", chunk => { output += chunk.toString(); });
server.stderr.on("data", chunk => { output += chunk.toString(); });

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(2000) });
      return response;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`Server did not start.\n${output.slice(-4000)}`);
}

try {
  await waitForServer();
  for (const route of requiredRoutes) {
    const response = await fetch(`${base}${route}`, { redirect: "manual", signal: AbortSignal.timeout(5000) });
    if (response.status >= 500) {
      throw new Error(`${route} returned HTTP ${response.status}`);
    }
    console.log(`PASS ${route} (${response.status})`);
  }
  console.log("Smoke test passed: critical public/app routes are responding without 5xx errors.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
}
