import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runAiText, hasAiProvider } from "@/lib/ai-provider";

function fallback(job:{title:string;company:string}, recruiter:string|null){
  const greeting=recruiter ? "Hi " + recruiter + "," : "Hi there,";
  return {
    subject:"Following up — " + job.title + " application",
    body:greeting + "\n\nI’m following up on my application for the " + job.title + " role at " + job.company + ". I’m still very interested in the opportunity and wanted to check whether there are any updates on the hiring process.\n\nThank you for your time. I look forward to hearing from you.\n\nBest regards"
  };
}

function cleanJson(raw:string){
  const value=raw.trim();
  const fence=String.fromCharCode(96).repeat(3);
  if(value.startsWith(fence+"json"))return value.slice(7).replace(new RegExp(fence+"\\\\s*$"),"").trim();
  if(value.startsWith(fence))return value.slice(3).replace(new RegExp(fence+"\\\\s*$"),"").trim();
  return value;
}

export async function POST(req:Request){
  const user=await getCurrentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  try{
    const {applicationId,signalId}=await req.json();
    if(typeof applicationId!=="string")return NextResponse.json({error:"applicationId is required."},{status:400});
    const app=await prisma.application.findFirst({where:{id:applicationId,userId:user.id},include:{job:true}});
    if(!app)return NextResponse.json({error:"Application not found."},{status:404});
    const signal=typeof signalId==="string"?await prisma.emailSignal.findFirst({where:{id:signalId,userId:user.id,applicationId:app.id},orderBy:{receivedAt:"desc"}}):await prisma.emailSignal.findFirst({where:{userId:user.id,applicationId:app.id},orderBy:{receivedAt:"desc"}});
    if(!hasAiProvider())return NextResponse.json({draft:fallback(app.job,signal?.recruiterName||null),source:"template"});
    const prompt="Draft a concise, professional follow-up email for a job application. Use ONLY the facts provided. Never invent dates, interview details, qualifications, promises, or hiring status. Do not claim an interview happened unless the signal says so. The user will review, edit, and send it manually. Return ONLY JSON with keys subject and body.\n\n"+
      "JOB TITLE: "+app.job.title+"\n"+
      "COMPANY: "+app.job.company+"\n"+
      "LOCATION: "+(app.job.location||"")+"\n"+
      "CURRENT APPLICATION STATUS: "+app.status+"\n"+
      "RECRUITER NAME: "+(signal?.recruiterName||"Not provided")+"\n"+
      "RECRUITER EMAIL: "+(signal?.recruiterEmail||"Not provided")+"\n"+
      "LATEST EMAIL SUBJECT: "+(signal?.subject||"Not provided")+"\n"+
      "LATEST EMAIL CATEGORY: "+(signal?.category||"Not provided")+"\n"+
      "LATEST EMAIL REASON: "+(signal?.reason||"Not provided");
    const result=await runAiText({prompt,maxTokens:900,temperature:0.2});
    if(!result)return NextResponse.json({draft:fallback(app.job,signal?.recruiterName||null),source:"template"});
    const parsed=JSON.parse(cleanJson(result.text));
    if(typeof parsed.subject!=="string"||typeof parsed.body!=="string")throw new Error("Invalid draft");
    return NextResponse.json({draft:{subject:parsed.subject.slice(0,180),body:parsed.body.slice(0,5000)},source:"ai",provider:result.provider});
  }catch{return NextResponse.json({error:"Could not generate follow-up draft."},{status:400});}
}
