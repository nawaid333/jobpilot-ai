import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {
    app: "ok",
    database: "unknown",
    config: "unknown",
    ai: process.env.OPENAI_API_KEY ? "configured" : "fallback-mode",
    jobs: process.env.JOBPILOT_LEVER_COMPANIES ? "configured" : "not-configured",
    payments: "disabled",
  };

  try {
    validateServerEnv();
    checks.config = "ok";
  } catch {
    checks.config = "error";
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  const ok = checks.database === "ok" && checks.config === "ok";
  return NextResponse.json({ ok, checks, timestamp: new Date().toISOString() }, { status: ok ? 200 : 503 });
}
