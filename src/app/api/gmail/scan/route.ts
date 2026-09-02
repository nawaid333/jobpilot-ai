import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptToken, gmailGet, refreshAccessToken } from "@/lib/gmail";
import { classifyApplicationEmail } from "@/lib/application-intelligence";
import { rankApplications } from "@/lib/application-matching";
import { aiMatchApplicationEmail } from "@/lib/ai-application-matching";

function decodeBase64Url(input:string){return Buffer.from(input.replace(/-/g,"+").replace(/_/g,"/"),"base64").toString("utf8")}
function collectText(payload:any):string{if(!payload)return "";if(payload.mimeType==="text/plain"&&payload.body?.data)return decodeBase64Url(payload.body.data);return (payload.parts||[]).map((p:any)=>collectText(p)).join("\n").slice(0,12000)}
function header(payload:any,name:string){return payload?.headers?.find((h:any)=>h.name?.toLowerCase()===name.toLowerCase())?.value||""}

export async function POST(){
  const user=await getCurrentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const connection=await prisma.gmailConnection.findUnique({where:{userId:user.id}});
  if(!connection)return NextResponse.json({error:"Gmail is not connected."},{status:400});
  try{
    const access=await refreshAccessToken(decryptToken(connection.refreshToken));
    const list=await gmailGet("/users/me/messages?maxResults=20&q=newer_than:30d+(application+OR+interview+OR+assessment+OR+offer+OR+recruiter)",access.access_token);
    const applications=await prisma.application.findMany({where:{userId:user.id},include:{job:{select:{id:true,title:true,company:true,location:true,description:true}}},take:100});
    const jobs=applications.map(a=>a.job);
    let scanned=0,signals=0,matched=0,aiMatched=0,ambiguous=0;
    for(const item of (list.messages||[])){
      const message=await gmailGet(`/users/me/messages/${item.id}?format=full`,access.access_token);
      const subject=header(message.payload,"Subject");
      const sender=header(message.payload,"From");
      const received=header(message.payload,"Date");
      const text=collectText(message.payload);
      const signal=classifyApplicationEmail(subject,text);
      if(!signal.suggestedStatus)continue;
      const existing=await prisma.emailSignal.findUnique({where:{userId_gmailMessageId:{userId:user.id,gmailMessageId:item.id}}});
      if(existing){scanned++;continue;}

      const matches=rankApplications(subject,text,jobs);
      const best=matches[0];
      const second=matches[1];
      const deterministicStrong=!!best&&best.score>=0.45&&(!second||best.score-second.score>=0.12);
      let applicationId:string|null=null;
      let jobId:string|null=null;
      let matchedScore:number|null=null;
      let matchMethod:string|null=null;
      let recruiterName:string|null=null;
      let recruiterEmail:string|null=null;
      let isAmbiguous=false;
      let explanation=signal.reason;

      if(deterministicStrong){
        jobId=best.job.id;
        applicationId=applications.find(a=>a.jobId===best.job.id)?.id||null;
        matchedScore=best.score;
        matchMethod="deterministic";
        if(applicationId)matched++;
        explanation=`${signal.reason} Matched to ${best.job.company} — ${best.job.title}.`;
      }else if(applications.length){
        const ai=await aiMatchApplicationEmail({subject,sender,body:text,jobs:applications.map(a=>({...a.job,applicationId:a.id}))});
        if(ai){
          recruiterName=ai.recruiterName;
          recruiterEmail=ai.recruiterEmail;
          isAmbiguous=ai.ambiguous;
          explanation=ai.explanation?`${signal.reason} ${ai.explanation}`:signal.reason;
          if(!ai.ambiguous&&ai.confidence>=0.72&&ai.applicationId&&applications.some(a=>a.id===ai.applicationId)){
            applicationId=ai.applicationId;
            jobId=ai.jobId&&applications.some(a=>a.jobId===ai.jobId)?ai.jobId:applications.find(a=>a.id===ai.applicationId)?.jobId||null;
            matchedScore=ai.confidence;
            matchMethod="ai";
            aiMatched++;
            matched++;
          }else if(ai.ambiguous){ambiguous++;matchMethod="ai-ambiguous";}
          else matchMethod="ai-unmatched";
        }
      }

      await prisma.emailSignal.create({data:{userId:user.id,gmailMessageId:item.id,threadId:message.threadId,sender,subject,receivedAt:received?new Date(received):null,category:signal.category,confidence:signal.confidence,suggestedStatus:signal.suggestedStatus,reason:explanation,applicationId,jobId,recruiterName,recruiterEmail,matchedScore,matchMethod,ambiguous:isAmbiguous}});
      signals++;scanned++;
    }
    return NextResponse.json({ok:true,scanned,signals,matched,aiMatched,ambiguous});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gmail scan failed."},{status:502})}
}
