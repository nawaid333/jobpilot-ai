type JobLike={id:string;title:string;company:string;location?:string;description?:string|null};
function norm(s:string){return s.toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function tokens(s:string){return new Set(norm(s).split(/\s+/).filter(x=>x.length>2))}
function overlap(a:Set<string>,b:Set<string>){let n=0;for(const x of a)if(b.has(x))n++;return n}
export function rankApplications(subject:string,body:string,jobs:JobLike[]){const email=tokens(`${subject} ${body}`);return jobs.map(job=>{const title=tokens(job.title);const company=tokens(job.company);const desc=tokens(`${job.location||""} ${job.description||""}`);const titleHits=overlap(email,title),companyHits=overlap(email,company),descHits=overlap(email,desc);const score=Math.min(0.99,companyHits*0.25+titleHits*0.15+Math.min(descHits,8)*0.03);return {job,score}}).filter(x=>x.score>=0.18).sort((a,b)=>b.score-a.score).slice(0,5)}
