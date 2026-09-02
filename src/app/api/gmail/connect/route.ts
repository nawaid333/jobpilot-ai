import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { googleAuthUrl } from "@/lib/gmail";

export async function GET(){const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});const state=crypto.randomBytes(32).toString("hex");const c=await cookies();c.set("jobpilot-gmail-state",`${user.id}.${state}`,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",maxAge:600,path:"/"});return NextResponse.redirect(googleAuthUrl(state));}
