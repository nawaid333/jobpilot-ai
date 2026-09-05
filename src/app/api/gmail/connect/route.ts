import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { googleAuthUrl } from "@/lib/gmail";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

function invalidOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const expected = new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").origin;
    return new URL(origin).origin !== expected;
  } catch {
    return true;
  }
}

export async function GET(req: Request){
  const user=await getCurrentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const limited=rateLimitResponse(rateLimit(`gmail-connect:${user.id}`,10,60_000));
  if(limited)return limited;
  if(invalidOrigin(req))return NextResponse.json({error:"Invalid request origin."},{status:403});
  const state=crypto.randomBytes(32).toString("hex");
  const c=await cookies();
  c.set("jobpilot-gmail-state",`${user.id}.${state}`,{
    httpOnly:true,
    secure:process.env.NODE_ENV==="production",
    sameSite:"lax",
    maxAge:600,
    path:"/",
  });
  return NextResponse.redirect(googleAuthUrl(state));
}
