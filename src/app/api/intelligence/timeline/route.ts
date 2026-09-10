import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(){
  const user=await getCurrentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const applications=await prisma.application.findMany({where:{userId:user.id},include:{job:true,emailSignals:{orderBy:{receivedAt:"asc"}},agentActions:{orderBy:{createdAt:"asc"}},interviewPractices:{orderBy:{createdAt:"asc"}}},orderBy:{updatedAt:"desc"}});
  const timeline=applications.map(a=>{
    const events=[
      {id:`created-${a.id}`,type:"application",title:"Application tracked",status:"Saved",occurredAt:a.createdAt,detail:"Application added to JobPilot."},
      ...(a.appliedAt?[{id:`applied-${a.id}`,type:"application",title:"Application marked Applied",status:"Applied",occurredAt:a.appliedAt,detail:"Marked as applied in JobPilot. This does not mean JobPilot submitted it."}]:[]),
      ...a.emailSignals.map(s=>({id:s.id,type:"email",title:s.category,status:s.suggestedStatus||null,occurredAt:s.receivedAt||s.createdAt,detail:s.reason||s.subject||"Recruiting email signal",subject:s.subject,recruiterName:s.recruiterName,recruiterEmail:s.recruiterEmail,confidence:s.matchedScore??s.confidence,applied:s.applied})),
      ...a.agentActions.map(x=>({id:x.id,type:"agent",title:`Agent: ${x.actionType.replaceAll("-"," ")}`,status:x.status,occurredAt:x.completedAt||x.createdAt,detail:x.result&&typeof x.result==="object"&&"message" in x.result?(x.result as any).message:"Agent action recorded."})),
      ...a.interviewPractices.map(p=>({id:p.id,type:"interview",title:"Interview practice",status:null,occurredAt:p.createdAt,detail:"Interview practice session recorded."})),
      ...(a.interviewCompletedAt?[{id:`interview-completed-${a.id}`,type:"interview",title:"Interview completed",status:a.interviewOutcome,occurredAt:a.interviewCompletedAt,detail:a.interviewOutcome?`Interview outcome: ${a.interviewOutcome}.`:"Interview marked completed."}]:[]),
      ...(a.followUpDueAt?[{id:`followup-${a.id}`,type:"follow-up",title:"Follow-up scheduled",status:null,occurredAt:a.followUpDueAt,detail:"Recorded follow-up date."}]:[])
    ];
    events.sort((x,y)=>new Date(x.occurredAt).getTime()-new Date(y.occurredAt).getTime());
    return {applicationId:a.id,job:a.job,status:a.status,createdAt:a.createdAt,updatedAt:a.updatedAt,appliedAt:a.appliedAt,events};
  });
  return NextResponse.json({timeline});
}
