import {NextResponse} from "next/server";
import {getCurrentUser} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {consumeAiCredit,getEntitlements} from "@/lib/entitlements";
import {rateLimit} from "@/lib/rate-limit";
import {runAiText,hasAiProvider} from "@/lib/ai-provider";

type Rec={title:string;company:string;action:string;reason:string;priority:number;applicationId:string|null};
function parse(raw:string):Rec[]{try{const x=JSON.parse(raw.replace(/^\`\`\`json\s*/i,"").replace(/\`\`\`\s*$/i,"").trim());return Array.isArray(x)?x.filter((r:any)=>r&&typeof r.title==="string"&&typeof r.company==="string"&&typeof r.action==="string").slice(0,8).map((r:any)=>({title:r.title.slice(0,160),company:r.company.slice(0,120),action:r.action.slice(0,100),reason:typeof r.reason==="string"?r.reason.slice(0,500):"Based on your application activity.",priority:Math.max(1,Math.min(5,Number(r.priority)||3)),applicationId:typeof r.applicationId==="string"?r.applicationId:null})):[]}catch{return[]}}

export async function GET(){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const limit=rateLimit(`copilot:${user.id}`,10,60_000);if(!limit.ok)return NextResponse.json({error:"Too many Copilot requests. Please try again shortly."},{status:429,headers:{"Retry-After":String(limit.retryAfterSeconds)}});
 const [profile,applications]=await Promise.all([prisma.careerProfile.findUnique({where:{userId:user.id}}),prisma.application.findMany({where:{userId:user.id},include:{job:true,emailSignals:{orderBy:{receivedAt:"desc"},take:5}},orderBy:{updatedAt:"desc"},take:40})]);
 const facts=applications.map(a=>({applicationId:a.id,status:a.status,title:a.job.title,company:a.job.company,location:a.job.location,updatedAt:a.updatedAt,appliedAt:a.appliedAt,recentSignals:a.emailSignals.map(s=>({category:s.category,status:s.suggestedStatus,subject:s.subject,reason:s.reason,recruiterName:s.recruiterName,recruiterEmail:s.recruiterEmail,receivedAt:s.receivedAt}))}));
 if(!hasAiProvider())return NextResponse.json({recommendations:[],mode:"rules",message:"No AI provider is configured. Add MODAL_AI_API_KEY or OPENAI_API_KEY to the server environment."});
 const usage=await consumeAiCredit(user.id);if(!usage.ok){const entitlements=await getEntitlements(user.id);return NextResponse.json({recommendations:[],mode:"limit",error:"Monthly AI limit reached.",plan:entitlements.planKey,usage:entitlements.usage,remainingAi:0},{status:429});
 }
 const prompt=`You are JobPilot AI Career Copilot. Recommend the user's next best job-search actions using ONLY the supplied workspace facts. Never invent candidate skills, dates, recruiter facts, interviews, or outcomes. Prefer concrete actions supported by recent recruiting signals. Do not recommend actions for Rejected applications. Return ONLY a JSON array, max 8 items, each with exactly: title, company, action, reason, priority, applicationId. priority is 1-5. applicationId must be copied exactly from facts or null. Keep reasons concise.

CAREER PROFILE FACTS: ${JSON.stringify(profile?{headline:profile.headline,location:profile.location,skills:profile.skills,targetRoles:profile.targetRoles,atsScore:profile.atsScore}:null)}

APPLICATION FACTS: ${JSON.stringify(facts)}`;
 try{
   const result=await runAiText({prompt,maxTokens:1800,temperature:0.1});
   if(!result)throw Error("AI request failed");
   return NextResponse.json({recommendations:parse(result.text),mode:"ai",provider:result.provider,usage:usage.entitlements.usage,remainingAi:usage.entitlements.remainingAi});
 }catch{return NextResponse.json({recommendations:[],mode:"rules",message:"AI recommendations are temporarily unavailable."});}
}
