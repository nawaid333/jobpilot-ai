import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateServerEnv } from "@/lib/env";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "anonymous";
}

export async function GET(request: Request) {
  const limited = rateLimit(`health:${clientKey(request)}`, 30, 60_000);
  const rateResponse = rateLimitResponse(limited);
  if (rateResponse) return rateResponse;

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
  return NextResponse.json(
    { ok, checks, timestamp: new Date().toISOString() },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
