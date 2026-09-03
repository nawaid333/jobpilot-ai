import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(){
 const user=await getCurrentUser();
 if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const limited=rateLimit(`dashboard:${user.id}`,60,60_000);
 const limitedResponse=rateLimitResponse(limited);
 if(limitedResponse)return limitedResponse;
 try {
  const applications=await prisma.application.findMany({where:{userId:user.id},include:{job:true,emailSignals:{orderBy:{receivedAt:"desc"},take:3}},orderBy:{updatedAt:"desc"},take:100});
  const counts=applications.reduce<Record<string,number>>((a,x)=>(a[x.status]=(a[x.status]||0)+1,a),{});
  const now=Date.now();
  const actions=applications.map(a=>{const latest=a.emailSignals[0];const base=latest?.receivedAt?new Date(latest.receivedAt).getTime():new Date(a.updatedAt).getTime();const age=Math.floor((now-base)/86400000);let priority=0,action="Keep monitoring";if(a.status==="Applied"&&age>=7){priority=3;action="Follow up"}else if(a.status==="Interview"){priority=4;action="Prepare for interview"}else if(a.status==="Offer"){priority=5;action="Review offer"}else if(latest?.category==="assessment"){priority=4;action="Complete assessment"}return {applicationId:a.id,title:a.job.title,company:a.job.company,status:a.status,action,priority,daysSinceUpdate:Math.max(0,age),recruiterName:latest?.recruiterName||null}}).filter(x=>x.priority>0).sort((a,b)=>b.priority-a.priority||b.daysSinceUpdate-a.daysSinceUpdate).slice(0,8);
  return NextResponse.json({summary:{total:applications.length,applied:counts.Applied||0,interviews:counts.Interview||0,offers:counts.Offer||0,rejected:counts.Rejected||0,saved:counts.Saved||0,preparing:counts.Preparing||0},actions},{headers:{"Cache-Control":"private, no-store, max-age=0"}});
 } catch {
  return NextResponse.json({error:"Dashboard is temporarily unavailable."},{status:503,headers:{"Cache-Control":"no-store"}});
 }
}
