type CandidateJob={id:string;title:string;company:string;location?:string;description?:string|null};

export type AiApplicationMatch={
  company:string|null;
  role:string|null;
  recruiterName:string|null;
  recruiterEmail:string|null;
  jobId:string|null;
  applicationId:string|null;
  confidence:number;
  ambiguous:boolean;
  explanation:string;
};

function clean(value:unknown,max=160){
  if(typeof value!=="string") return null;
  const s=value.trim().replace(/\s+/g," ");
  return s? s.slice(0,max):null;
}

function parseResult(raw:string):AiApplicationMatch|null{
  try{
    const parsed=JSON.parse(raw.replace(/^```json\s*/i,"").replace(/```\s*$/i,"").trim());
    if(!parsed||typeof parsed!=="object") return null;
    const confidence=Number(parsed.confidence);
    if(!Number.isFinite(confidence)) return null;
    return {
      company:clean(parsed.company),
      role:clean(parsed.role),
      recruiterName:clean(parsed.recruiterName),
      recruiterEmail:clean(parsed.recruiterEmail,254),
      jobId:typeof parsed.jobId==="string"?parsed.jobId:null,
      applicationId:typeof parsed.applicationId==="string"?parsed.applicationId:null,
      confidence:Math.max(0,Math.min(1,confidence)),
      ambiguous:Boolean(parsed.ambiguous),
      explanation:clean(parsed.explanation,500)||"AI could not provide a match explanation."
    };
  }catch{return null}
}

export async function aiMatchApplicationEmail(args:{subject:string;sender:string;body:string;jobs:(CandidateJob&{applicationId:string})[]}):Promise<AiApplicationMatch|null>{
  const key=process.env.OPENAI_API_KEY;
  if(!key||!args.jobs.length) return null;
  const jobList=args.jobs.map(j=>({id:j.id,applicationId:j.applicationId,title:j.title,company:j.company,location:j.location,description:j.description?.slice(0,1600)||""}));
  const prompt=`You are JobPilot AI's email-to-application matcher. Match this recruiting email to ONE saved candidate application, or return null IDs when evidence is insufficient. Never invent facts. Extract recruiter identity only when explicitly present in sender/email text. Prefer exact company/title evidence over generic keywords. If two jobs are similarly plausible, set ambiguous=true and do not force a match. Return ONLY JSON with exactly these keys: company, role, recruiterName, recruiterEmail, jobId, applicationId, confidence, ambiguous, explanation. confidence must be 0..1. jobId/applicationId must be copied exactly from the candidate job list or null.

EMAIL SUBJECT: ${args.subject}
SENDER: ${args.sender}
EMAIL BODY: ${args.body.slice(0,9000)}

CANDIDATE SAVED APPLICATIONS: ${JSON.stringify(jobList)}`;
  try{
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-luna",input:[{role:"user",content:[{type:"input_text",text:prompt}]}]})});
    if(!response.ok) return null;
    const data=await response.json();
    const text=data.output_text||data.output?.flatMap((x:{content?:{text?:string}[]})=>x.content||[]).map((x:{text?:string})=>x.text||"").join("")||"";
    return parseResult(text);
  }catch{return null}
}
