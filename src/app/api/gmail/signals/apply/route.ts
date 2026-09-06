import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowed=new Set(["Applied","Interview","Offer","Rejected"]);
const rank:Record<string,number>={Saved:0,Preparing:1,Applied:2,Interview:3,Offer:4,Rejected:4};

export async function POST(req:Request){
  const user=await getCurrentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  try{
    const {signalId,applicationId}=await req.json();
    if(typeof signalId!=="string"||typeof applicationId!=="string")return NextResponse.json({error:"signalId and applicationId are required."},{status:400});
    const signal=await prisma.emailSignal.findFirst({where:{id:signalId,userId:user.id}});
    const app=await prisma.application.findFirst({where:{id:applicationId,userId:user.id}});
    if(!signal||!app)return NextResponse.json({error:"Signal or application not found."},{status:404});
    if(signal.applied)return NextResponse.json({error:"This signal was already applied."},{status:409});
    if(!signal.suggestedStatus||!allowed.has(signal.suggestedStatus))return NextResponse.json({error:"This signal is not eligible for a tracker update."},{status:400});
    if(signal.applicationId&&signal.applicationId!==app.id)return NextResponse.json({error:"This email is already linked to a different application."},{status:409});
    if(app.status!==signal.suggestedStatus&&(rank[signal.suggestedStatus]??-1)<=(rank[app.status]??-1))return NextResponse.json({error:`Cannot move ${app.status} back to ${signal.suggestedStatus}.`},{status:409});
    await prisma.$transaction([
      prisma.application.update({where:{id:app.id},data:{status:signal.suggestedStatus,appliedAt:signal.suggestedStatus==="Applied"?(app.appliedAt||new Date()):app.appliedAt}}),
      prisma.emailSignal.update({where:{id:signal.id},data:{applicationId:app.id,jobId:app.jobId,applied:true}})
    ]);
    return NextResponse.json({ok:true,status:signal.suggestedStatus});
  }catch{return NextResponse.json({error:"Could not apply signal."},{status:400})}
}
