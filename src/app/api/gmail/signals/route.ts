import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUS_RANK:Record<string,number>={Saved:0,Preparing:1,Applied:2,Interview:3,Offer:4,Rejected:4};
function canMove(from:string,to:string){return from===to||(from in STATUS_RANK&&to in STATUS_RANK&&STATUS_RANK[to]>=STATUS_RANK[from]);}

export async function GET(){
  const user=await getCurrentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const signals=await prisma.emailSignal.findMany({where:{userId:user.id},include:{job:true,application:{include:{job:true}}},orderBy:{createdAt:"desc"},take:50});
  return NextResponse.json({signals});
}

export async function PATCH(req:Request){
  const user=await getCurrentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  try{
    const {signalId,applicationId,decision}=await req.json();
    if(typeof signalId!=="string")return NextResponse.json({error:"signalId is required."},{status:400});
    const signal=await prisma.emailSignal.findFirst({where:{id:signalId,userId:user.id}});
    if(!signal)return NextResponse.json({error:"Signal not found."},{status:404});

    if(decision==="reject"){
      if(signal.applied)return NextResponse.json({error:"This signal was already applied."},{status:409});
      const updated=await prisma.emailSignal.update({where:{id:signal.id},data:{ambiguous:false,matchMethod:"rejected"}});
      return NextResponse.json({ok:true,decision:"rejected",signal:updated});
    }

    if(typeof applicationId!=="string")return NextResponse.json({error:"applicationId is required."},{status:400});
    const app=await prisma.application.findFirst({where:{id:applicationId,userId:user.id},include:{job:true}});
    if(!app)return NextResponse.json({error:"Application not found."},{status:404});
    if(signal.applied)return NextResponse.json({error:"This signal was already applied."},{status:409});

    const suggested=signal.suggestedStatus||app.status;
    if(!canMove(app.status,suggested))return NextResponse.json({error:`Cannot move application backward from ${app.status} to ${suggested}.`},{status:409});

    const result=await prisma.$transaction(async(tx)=>{
      const updated=await tx.emailSignal.update({where:{id:signal.id},data:{applicationId:app.id,jobId:app.jobId,ambiguous:false,matchMethod:"manual",matchedScore:1,applied:true}});
      const updatedApp=app.status===suggested?app:await tx.application.update({where:{id:app.id},data:{status:suggested,appliedAt:suggested==="Applied"?new Date():app.appliedAt}});
      return {signal:updated,application:updatedApp};
    });
    return NextResponse.json({ok:true,decision:"approved",...result});
  }catch{return NextResponse.json({error:"Could not process this Gmail signal."},{status:400});}
}
