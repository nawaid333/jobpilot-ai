import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consumeAiCredit } from "@/lib/entitlements";
import { rateLimit } from "@/lib/rate-limit";

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
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = rateLimit(`interview:${user.id}`, 10, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many Interview Coach requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  const body = await req.json().catch(() => ({}));
  const applicationId = String(body.applicationId || "");
  const mode = body.mode === "feedback" ? "feedback" : "questions";
  if (!applicationId) return NextResponse.json({ error: "applicationId is required" }, { status: 400 });
  const application = await prisma.application.findFirst({ where: { id: applicationId, userId: user.id }, include: { job: true } });
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  const profile = await prisma.careerProfile.findUnique({ where: { userId: user.id } });
  const profileFacts = profile ? { headline: profile.headline, summary: profile.summary, skills: profile.skills, targetRoles: profile.targetRoles, experience: profile.experience, education: profile.education, strengths: profile.strengths } : null;
  const fallback = fallbackQuestions(application.job, profile);
  if (mode === "feedback") { const answer = String(body.answer || "").trim(); const question = String(body.question || "").trim(); if (!answer || !question) return NextResponse.json({ error: "question and answer are required" }, { status: 400 }); }
  if (!process.env.OPENAI_API_KEY) { if (mode === "feedback") return NextResponse.json({ feedback: rulesFeedback(), mode: "rules" }); return NextResponse.json({ questions: fallback, mode: "rules", job: application.job }); }
  const credit = await consumeAiCredit(user.id);
  if (!credit.ok) { if (mode === "feedback") return NextResponse.json({ feedback: rulesFeedback(), mode: "rules", aiLimited: true, remainingAi: 0 }); return NextResponse.json({ questions: fallback, mode: "rules", job: application.job, aiLimited: true, remainingAi: 0 }); }
  if (mode === "feedback") {
    const answer = String(body.answer || "").trim(); const question = String(body.question || "").trim();
    const prompt = `You are JobPilot AI Interview Coach. Review a candidate's interview answer using ONLY the supplied facts. Never invent experience, metrics, employers, tools, dates, responsibilities, or outcomes. If the answer contains unsupported claims, flag them rather than validating them. Give practical coaching, not hiring guarantees. JOB: ${application.job.title} at ${application.job.company}. Location: ${application.job.location}. Description: ${(application.job.description || "").slice(0,7000)}. CAREER PROFILE: ${JSON.stringify(profileFacts).slice(0,12000)}. QUESTION: ${question}. CANDIDATE ANSWER: ${answer}. Return JSON only: {"score":number,"verdict":string,"strengths":string[],"improvements":string[],"followUp":string}. Max 3 strengths/improvements.`;
    try { const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify({ model: "gpt-5.6-luna", messages: [{ role: "user", content: prompt }], temperature: 0.2, response_format: { type: "json_object" } }) }); if (!response.ok) throw new Error("AI request failed"); const data = await response.json(); return NextResponse.json({ feedback: JSON.parse(data.choices?.[0]?.message?.content || "{}"), mode: "ai", remainingAi: credit.entitlements.remainingAi }); } catch { return NextResponse.json({ feedback: rulesFeedback(), mode: "rules", remainingAi: credit.entitlements.remainingAi }); }
  }
  const prompt = `You are JobPilot AI Interview Coach. Generate interview practice questions for a candidate and a saved job. Use ONLY the supplied job description and career profile. Never assume a skill, employer, project, achievement, metric, technology, date, or responsibility that is not present. Questions should test fit, behavior, role skills, and motivation. Do not claim what the company will ask. JOB: ${application.job.title} at ${application.job.company}. Location: ${application.job.location}. Description: ${(application.job.description || "").slice(0,8000)}. CAREER PROFILE: ${JSON.stringify(profileFacts).slice(0,12000)}. Return JSON only: {"questions":[{"id":"q1","type":"behavioral|skills|role|experience|motivation","question":"...","why":"..."}]} with exactly 8 questions.`;
  try { const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify({ model: "gpt-5.6-luna", messages: [{ role: "user", content: prompt }], temperature: 0.3, response_format: { type: "json_object" } }) }); if (!response.ok) throw new Error("OpenAI request failed"); const data = await response.json(); const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}"); const questions = Array.isArray(parsed.questions) ? parsed.questions.slice(0, 8) : fallback; return NextResponse.json({ questions, mode: "ai", job: application.job, remainingAi: credit.entitlements.remainingAi }); } catch { return NextResponse.json({ questions: fallback, mode: "rules", job: application.job, remainingAi: credit.entitlements.remainingAi }); }
}
