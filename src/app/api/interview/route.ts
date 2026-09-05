import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consumeAiCredit } from "@/lib/entitlements";
import { rateLimit } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 32_000;

async function readJson(req: Request) {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) throw new Error("Request is too large.");
  if (!req.body) throw new Error("Invalid request body.");
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > MAX_BODY_BYTES) { await reader.cancel(); throw new Error("Request is too large."); } chunks.push(value); }
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

function fallbackQuestions(job: { title: string; company: string; description: string | null }, profile: any) {
  const skills = Array.isArray(profile?.skills) ? profile.skills.slice(0, 5).join(", ") : "your relevant skills";
  return [
    { id: "q1", type: "experience", question: `Walk me through an experience that best prepares you for the ${job.title} role at ${job.company}.`, why: "Tests direct evidence of role fit." },
    { id: "q2", type: "behavioral", question: "Tell me about a difficult problem you had to solve. What did you do and what was the result?", why: "Tests structured problem solving and ownership." },
    { id: "q3", type: "skills", question: `How have you used ${skills} in a real project or work situation?`, why: "Connects your documented skills to evidence." },
    { id: "q4", type: "role", question: "What would you prioritize in your first 30 days in this role?", why: "Tests practical judgment and role understanding." },
    { id: "q5", type: "behavioral", question: "Describe a time you received difficult feedback. How did you respond?", why: "Tests coachability and self-awareness." },
    { id: "q6", type: "motivation", question: `Why are you interested in ${job.company} and this role?`, why: "Tests motivation without requiring invented company facts." }
  ];
}
function rulesFeedback() { return { score: null, verdict: "Evidence review", strengths: ["You answered the question directly."], improvements: ["Add a specific situation, your actions, and a measurable or observable result where truthful."], followUp: "What was your specific contribution and what changed because of it?" }; }
function validFeedback(value: unknown) { if (!value || typeof value !== "object") return null; const x=value as Record<string,unknown>; const score=typeof x.score==="number"&&Number.isFinite(x.score)?Math.max(0,Math.min(100,Math.round(x.score))):null; return {score,verdict:typeof x.verdict==="string"?x.verdict.slice(0,300):"Evidence review",strengths:Array.isArray(x.strengths)?x.strengths.filter((v):v is string=>typeof v==="string").slice(0,3).map(v=>v.slice(0,500)):[],improvements:Array.isArray(x.improvements)?x.improvements.filter((v):v is string=>typeof v==="string").slice(0,3).map(v=>v.slice(0,500)):[],followUp:typeof x.followUp==="string"?x.followUp.slice(0,1000):"What was your specific contribution and what changed because of it?"}; }
function validQuestions(value: unknown) { if (!value || typeof value !== "object") return []; const x=value as Record<string,unknown>; if(!Array.isArray(x.questions))return []; return x.questions.slice(0,8).filter((q):q is Record<string,unknown>=>!!q&&typeof q==="object").map((q,i)=>({id:`q${i+1}`,type:typeof q.type==="string"&&["behavioral","skills","role","experience","motivation"].includes(q.type)?q.type:"role",question:typeof q.question==="string"?q.question.slice(0,1000):"",why:typeof q.why==="string"?q.why.slice(0,500):"Tests role fit."})).filter(q=>q.question); }
async function saveFeedback(applicationId: string, question: string, answer: string, feedback: ReturnType<typeof rulesFeedback>, mode: string) { await prisma.interviewSession.create({ data: { applicationId, question, answer, feedback, mode, score: feedback.score } }); }

export async function GET(req: Request) {
  const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url); const applicationId = url.searchParams.get("applicationId")?.trim() || "";
  if (!applicationId || applicationId.length > 100) return NextResponse.json({ error: "applicationId is required" }, { status: 400 });
  const rawLimit = url.searchParams.get("limit"); const limit = rawLimit === null ? 50 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return NextResponse.json({ error: "limit must be an integer between 1 and 50" }, { status: 400 });
  const application = await prisma.application.findFirst({ where: { id: applicationId, userId: user.id }, select: { id: true } });
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  const sessions = await prisma.interviewSession.findMany({ where: { applicationId: application.id }, orderBy: { createdAt: "desc" }, take: limit, select: { id: true, question: true, answer: true, feedback: true, mode: true, score: true, createdAt: true } });
  return NextResponse.json({ sessions });
}

export async function POST(req: Request) {
  const user=await getCurrentUser(); if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const limit=rateLimit(`interview:${user.id}`,10,60_000); if(!limit.ok)return NextResponse.json({error:"Too many Interview Coach requests. Please try again shortly."},{status:429,headers:{"Retry-After":String(limit.retryAfterSeconds)}});
  let body: unknown; try { body = await readJson(req); } catch (error) { return NextResponse.json({error:error instanceof Error && error.message === "Request is too large." ? error.message : "Invalid request body."},{status:error instanceof Error && error.message === "Request is too large." ? 413 : 400}); }
  if(!body||typeof body!=="object"||Array.isArray(body))return NextResponse.json({error:"Invalid request body."},{status:400});
  const applicationId=typeof (body as any).applicationId==="string"?(body as any).applicationId.trim():""; const mode=(body as any).mode==="feedback"?"feedback":"questions";
  if(!applicationId||applicationId.length>100)return NextResponse.json({error:"applicationId is required"},{status:400});
  const application=await prisma.application.findFirst({where:{id:applicationId,userId:user.id},include:{job:true}}); if(!application)return NextResponse.json({error:"Application not found"},{status:404});
  const profile=await prisma.careerProfile.findUnique({where:{userId:user.id}}); const profileFacts=profile?{headline:profile.headline,summary:profile.summary,skills:profile.skills,targetRoles:profile.targetRoles,experience:profile.experience,education:profile.education,strengths:profile.strengths}:null; const fallback=fallbackQuestions(application.job,profile);
  let feedbackQuestion=""; let feedbackAnswer="";
  if(mode==="feedback"){feedbackAnswer=typeof (body as any).answer==="string"?(body as any).answer.trim():"";feedbackQuestion=typeof (body as any).question==="string"?(body as any).question.trim():"";if(!feedbackAnswer||!feedbackQuestion)return NextResponse.json({error:"question and answer are required"},{status:400});if(feedbackAnswer.length>12_000||feedbackQuestion.length>2_000)return NextResponse.json({error:"Question or answer is too long."},{status:413});}
  if(!process.env.OPENAI_API_KEY){if(mode==="feedback"){const feedback=rulesFeedback();await saveFeedback(applicationId,feedbackQuestion,feedbackAnswer,feedback,"rules");return NextResponse.json({feedback,mode:"rules"});}return NextResponse.json({questions:fallback,mode:"rules",job:application.job});}
  const credit=await consumeAiCredit(user.id); if(!credit.ok){if(mode==="feedback"){const feedback=rulesFeedback();await saveFeedback(applicationId,feedbackQuestion,feedbackAnswer,feedback,"rules");return NextResponse.json({feedback,mode:"rules",aiLimited:true,remainingAi:0});}return NextResponse.json({questions:fallback,mode:"rules",job:application.job,aiLimited:true,remainingAi:0});}
  try { const prompt=mode==="feedback"?`You are JobPilot AI Interview Coach. Review a candidate's interview answer using ONLY the supplied facts. Never invent experience, metrics, employers, tools, dates, responsibilities, or outcomes. If the answer contains unsupported claims, flag them rather than validating them. Give practical coaching, not hiring guarantees. JOB: ${application.job.title} at ${application.job.company}. Location: ${application.job.location}. Description: ${(application.job.description||"").slice(0,7000)}. CAREER PROFILE: ${JSON.stringify(profileFacts).slice(0,12000)}. QUESTION: ${(body as any).question}. CANDIDATE ANSWER: ${(body as any).answer}. Return JSON only: {"score":number,"verdict":string,"strengths":string[],"improvements":string[],"followUp":string}. Max 3 strengths/improvements.`:`You are JobPilot AI Interview Coach. Generate interview practice questions for a candidate and a saved job. Use ONLY the supplied job description and career profile. Never assume a skill, employer, project, achievement, metric, technology, date, or responsibility that is not present. Questions should test fit, behavior, role skills, and motivation. Do not claim what the company will ask. JOB: ${application.job.title} at ${application.job.company}. Location: ${application.job.location}. Description: ${(application.job.description||"").slice(0,8000)}. CAREER PROFILE: ${JSON.stringify(profileFacts).slice(0,12000)}. Return JSON only: {"questions":[{"id":"q1","type":"behavioral|skills|role|experience|motivation","question":"...","why":"..."}]} with exactly 8 questions.`;
    const response=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({model:"gpt-5.6-luna",messages:[{role:"user",content:prompt}],temperature:mode==="feedback"?0.2:0.3,response_format:{type:"json_object"}})}); if(!response.ok)throw new Error("AI request failed"); const data=await response.json(); const parsed=JSON.parse(data.choices?.[0]?.message?.content||"{}");
    if(mode==="feedback"){const parsedFeedback=validFeedback(parsed);const feedback=parsedFeedback||rulesFeedback();const savedMode=parsedFeedback?"ai":"rules";await saveFeedback(applicationId,feedbackQuestion,feedbackAnswer,feedback,savedMode);return NextResponse.json({feedback,mode:savedMode,remainingAi:credit.entitlements.remainingAi});}
    const questions=validQuestions(parsed);return NextResponse.json({questions:questions.length?questions:fallback,mode:questions.length?"ai":"rules",job:application.job,remainingAi:credit.entitlements.remainingAi});
  } catch { if(mode==="feedback"){const feedback=rulesFeedback();await saveFeedback(applicationId,feedbackQuestion,feedbackAnswer,feedback,"rules");return NextResponse.json({feedback,mode:"rules",remainingAi:credit.entitlements.remainingAi});} return NextResponse.json({questions:fallback,mode:"rules",job:application.job,remainingAi:credit.entitlements.remainingAi}); }
}
