import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 12_000;

function fallback(job:{title:string;company:string}, recruiter:string|null){
  const greeting=recruiter?`Hi ${recruiter},`:`Hi there,`;
  return {subject:`Following up — ${job.title} application`,body:`${greeting}\n\nI’m following up on my application for the ${job.title} role at ${job.company}. I’m still very interested in the opportunity and wanted to check whether there are any updates on the hiring process.\n\nThank you for your time. I look forward to hearing from you.\n\nBest regards`};
}

async function readJson(req:Request){
  const length=Number(req.headers.get("content-length")||0);
  if(length>MAX_BODY_BYTES)throw new Error("Request is too large.");
  const reader=req.body?.getReader();
  if(!reader)throw new Error("Request body is required.");
  const chunks:Uint8Array[]=[];let total=0;
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>MAX_BODY_BYTES){await reader.cancel();throw new Error("Request is too large.");}chunks.push(value);}
  const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function POST(req:Request){
  const user=await getCurrentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const limited=rateLimit(`follow-up:${user.id}`,20,60_000);
  const rateResponse=rateLimitResponse(limited);if(rateResponse)return rateResponse;
  try{
    const body=await readJson(req);
    const applicationId=body?.applicationId;
    const signalId=body?.signalId;
    if(typeof applicationId!=="string"||!applicationId.trim()||applicationId.length>200)return NextResponse.json({error:"Valid applicationId is required."},{status:400});
    if(signalId!==undefined&&signalId!==null&&(typeof signalId!=="string"||signalId.length>200))return NextResponse.json({error:"Invalid signalId."},{status:400});
    const app=await prisma.application.findFirst({where:{id:applicationId,userId:user.id},include:{job:true}});
    if(!app)return NextResponse.json({error:"Application not found."},{status:404});
    const signal=typeof signalId==="string"?await prisma.emailSignal.findFirst({where:{id:signalId,userId:user.id,applicationId:app.id},orderBy:{receivedAt:"desc"}}):await prisma.emailSignal.findFirst({where:{userId:user.id,applicationId:app.id},orderBy:{receivedAt:"desc"}});
    const key=process.env.OPENAI_API_KEY;
    if(!key)return NextResponse.json({draft:fallback(app.job,signal?.recruiterName||null),source:"template",headers:{"Cache-Control":"private, no-store"}});
    const prompt=`Draft a concise, professional follow-up email for a job application. Use ONLY the facts provided. Never invent dates, interview details, qualifications, promises, or hiring status. Do not claim an interview happened unless the signal says so. The user will review, edit, and send it manually. Return ONLY JSON with keys subject and body.\n\nJOB TITLE: ${app.job.title}\nCOMPANY: ${app.job.company}\nLOCATION: ${app.job.location||""}\nCURRENT APPLICATION STATUS: ${app.status}\nRECRUITER NAME: ${signal?.recruiterName||"Not provided"}\nRECRUITER EMAIL: ${signal?.recruiterEmail||"Not provided"}\nLATEST EMAIL SUBJECT: ${signal?.subject||"Not provided"}\nLATEST EMAIL CATEGORY: ${signal?.category||"Not provided"}\nLATEST EMAIL REASON: ${signal?.reason||"Not provided"}`;
    const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-luna",input:[{role:"user",content:[{type:"input_text",text:prompt}]}]})});
    if(!r.ok)return NextResponse.json({draft:fallback(app.job,signal?.recruiterName||null),source:"template"});
    const data=await r.json();
    const text=data.output_text||data.output?.flatMap((x:{content?:{text?:string}[]})=>x.content||[]).map((x:{text?:string})=>x.text||"").join("")||"";
    const parsed=JSON.parse(text.replace(/^```json\s*/i,"").replace(/```\s*$/i,"").trim());
    if(typeof parsed.subject!=="string"||typeof parsed.body!=="string")throw new Error("Invalid draft");
    return NextResponse.json({draft:{subject:parsed.subject.slice(0,180),body:parsed.body.slice(0,5000)},source:"ai"},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){if(error instanceof Error&&error.message==="Request is too large.")return NextResponse.json({error:error.message},{status:413});return NextResponse.json({error:"Could not generate follow-up draft."},{status:400});}
}
