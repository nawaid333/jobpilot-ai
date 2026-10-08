import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (process.env.VERCEL_ENV === "production") {
  console.log("Production deployment: applying Prisma migrations.");
  run("npx", ["prisma", "migrate", "deploy"]);
} else {
  console.log(
    "Non-production deployment: skipping Prisma migrations; the Preview database schema is provisioned separately.",
  );
}

run("npm", ["run", "build"]);
