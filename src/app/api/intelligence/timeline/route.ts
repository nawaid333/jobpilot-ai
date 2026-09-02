import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(){
  const user=await getCurrentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const applications=await prisma.application.findMany({where:{userId:user.id},include:{job:true,emailSignals:{orderBy:{receivedAt:"asc"}}},orderBy:{updatedAt:"desc"}});
  const timeline=applications.map(a=>({applicationId:a.id,job:a.job,status:a.status,createdAt:a.createdAt,updatedAt:a.updatedAt,appliedAt:a.appliedAt,events:a.emailSignals.map(s=>({id:s.id,category:s.category,status:s.suggestedStatus,subject:s.subject,reason:s.reason,recruiterName:s.recruiterName,recruiterEmail:s.recruiterEmail,receivedAt:s.receivedAt||s.createdAt,confidence:s.matchedScore??s.confidence,applied:s.applied}))}));
  return NextResponse.json({timeline});
}
