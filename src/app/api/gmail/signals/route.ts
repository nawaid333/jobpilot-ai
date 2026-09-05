import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const {signalId,applicationId}=await req.json();
    if(typeof signalId!=="string"||typeof applicationId!=="string")return NextResponse.json({error:"signalId and applicationId are required."},{status:400});
    const signal=await prisma.emailSignal.findFirst({where:{id:signalId,userId:user.id}});
    const app=await prisma.application.findFirst({where:{id:applicationId,userId:user.id},include:{job:true}});
    if(!signal||!app)return NextResponse.json({error:"Signal or application not found."},{status:404});
    if(signal.applied)return NextResponse.json({error:"This signal was already applied."},{status:409});
    if(signal.applicationId===app.id){
      const existing=await prisma.emailSignal.findUnique({where:{id:signal.id}});
      return NextResponse.json({ok:true,signal:existing,application:app,alreadyMatched:true});
    }
    const updated=await prisma.emailSignal.update({where:{id:signal.id},data:{applicationId:app.id,jobId:app.jobId,ambiguous:false,matchMethod:"manual",matchedScore:1}});
    return NextResponse.json({ok:true,signal:updated,application:app});
  }catch{return NextResponse.json({error:"Could not match this email."},{status:400});}
}
