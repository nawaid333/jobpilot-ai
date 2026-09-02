import {NextResponse} from "next/server";
import {getCurrentUser} from "@/lib/auth";
import {prisma} from "@/lib/prisma";

type Rec={title:string;company:string;action:string;reason:string;priority:number;applicationId:string|null};
function parse(raw:string):Rec[]{try{const x=JSON.parse(raw.replace(/^```json\s*/i,"").replace(/```\s*$/i,"").trim());return Array.isArray(x)?x.filter((r:any)=>r&&typeof r.title==="string"&&typeof r.company==="string"&&typeof r.action==="string").slice(0,8).map((r:any)=>({title:r.title.slice(0,160),company:r.company.slice(0,120),action:r.action.slice(0,100),reason:typeof r.reason==="string"?r.reason.slice(0,500):"Based on your application activity.",priority:Math.max(1,Math.min(5,Number(r.priority)||3)),applicationId:typeof r.applicationId==="string"?r.applicationId:null})):[]}catch{return[]}}
export async function GET(){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const [profile,applications]=await Promise.all([
  prisma.careerProfile.findUnique({where:{userId:user.id}}),
  prisma.application.findMany({where:{userId:user.id},include:{job:true,emailSignals:{orderBy:{receivedAt:"desc"},take:5}},orderBy:{updatedAt:"desc"},take:40})
 ]);
 const facts=applications.map(a=>({applicationId:a.id,status:a.status,title:a.job.title,company:a.job.company,location:a.job.location,updatedAt:a.updatedAt,appliedAt:a.appliedAt,recentSignals:a.emailSignals.map(s=>({category:s.category,status:s.suggestedStatus,subject:s.subject,reason:s.reason,recruiterName:s.recruiterName,recruiterEmail:s.recruiterEmail,receivedAt:s.receivedAt}))}));
 const key=process.env.OPENAI_API_KEY;
 if(!key)return NextResponse.json({recommendations:[],mode:"rules",message:"AI Copilot needs OPENAI_API_KEY to generate personalized recommendations."});
 const prompt=`You are JobPilot AI Career Copilot. Recommend the user's next best job-search actions using ONLY the supplied workspace facts. Never invent candidate skills, dates, recruiter facts, interviews, or outcomes. Prefer concrete actions supported by recent recruiting signals. Do not recommend actions for Rejected applications. Return ONLY a JSON array, max 8 items, each with exactly: title, company, action, reason, priority, applicationId. priority is 1-5. applicationId must be copied exactly from facts or null. Keep reasons concise.\n\nCAREER PROFILE FACTS: ${JSON.stringify(profile?{headline:profile.headline,location:profile.location,skills:profile.skills,targetRoles:profile.targetRoles,atsScore:profile.atsScore}:null)}\n\nAPPLICATION FACTS: ${JSON.stringify(facts)}`;
 try{const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-luna",input:[{role:"user",content:[{type:"input_text",text:prompt}]}]})});if(!r.ok)throw Error("AI request failed");const d=await r.json();const text=d.output_text||d.output?.flatMap((x:{content?:{text?:string}[]})=>x.content||[]).map((x:{text?:string})=>x.text||"").join("")||"";return NextResponse.json({recommendations:parse(text),mode:"ai"});}catch{return NextResponse.json({recommendations:[],mode:"rules",message:"AI recommendations are temporarily unavailable."})}
}
