import { NextResponse } from "next/server";

export async function GET() {
  const companies = (process.env.JOBPILOT_LEVER_COMPANIES || "").split(",").map(x => x.trim()).filter(Boolean);
  return NextResponse.json({
    ok: true,
    configured: companies.length > 0,
    sourceCount: Math.min(companies.length, 20),
    source: "Lever",
    checkedAt: new Date().toISOString(),
  });
}
