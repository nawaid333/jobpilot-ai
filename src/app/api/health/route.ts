import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {
    app: "ok",
    database: "unknown",
    ai: process.env.OPENAI_API_KEY ? "configured" : "fallback-mode",
    jobs: process.env.JOBPILOT_LEVER_COMPANIES ? "configured" : "not-configured",
    payments: "disabled",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
    return NextResponse.json({ ok: true, checks, timestamp: new Date().toISOString() });
  } catch {
    checks.database = "error";
    return NextResponse.json({ ok: false, checks, timestamp: new Date().toISOString() }, { status: 503 });
  }
}
