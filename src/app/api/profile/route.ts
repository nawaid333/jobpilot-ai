import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user=await getCurrentUser(); if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});
  const [profile,preferences]=await Promise.all([prisma.careerProfile.findUnique({where:{userId:user.id}}),prisma.jobPreferences.findUnique({where:{userId:user.id}})]);
  return NextResponse.json({profile,preferences});
}

export async function PUT(req:Request) {
  const user=await getCurrentUser(); if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});
  try {
    const body=await req.json(); const p=body.profile||{}; const pref=body.preferences||{};
    const profile=await prisma.careerProfile.upsert({where:{userId:user.id},create:{userId:user.id,atsScore:Number(p.atsScore)||0,headline:p.candidate?.headline||null,location:p.candidate?.location||null,summary:p.summary||"",skills:p.skills||[],targetRoles:p.targetRoles||[],experience:p.experience||[],education:p.education||[],strengths:p.strengths||[]},update:{atsScore:Number(p.atsScore)||0,headline:p.candidate?.headline||null,location:p.candidate?.location||null,summary:p.summary||"",skills:p.skills||[],targetRoles:p.targetRoles||[],experience:p.experience||[],education:p.education||[],strengths:p.strengths||[]}});
    const preferences=await prisma.jobPreferences.upsert({where:{userId:user.id},create:{userId:user.id,roles:pref.roles||"",locations:pref.locations||"",workMode:pref.workMode||"Any",seniority:pref.seniority||"Any",minSalary:pref.minSalary||"",keywords:pref.keywords||""},update:{roles:pref.roles||"",locations:pref.locations||"",workMode:pref.workMode||"Any",seniority:pref.seniority||"Any",minSalary:pref.minSalary||"",keywords:pref.keywords||""}});
    return NextResponse.json({profile,preferences});
  } catch { return NextResponse.json({error:"Invalid profile data."},{status:400}); }
}
