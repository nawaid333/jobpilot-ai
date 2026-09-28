import { NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

type LeverPosting={id:string;text:string;categories?:{location?:string;allLocations?:string[];level?:string;commitment?:string;team?:string};content?:{description?:string};urls?:{show?:string;apply?:string};workplaceType?:string;salaryDescription?:string};
type GreenhouseJob={id:number;title:string;location?:{name?:string};absolute_url?:string;content?:string;departments?:{name?:string}[]};

function clientKey(request:Request){const forwarded=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();return forwarded||request.headers.get("x-real-ip")||"anonymous";}
function listEnv(name:string,limit=20){return (process.env[name]||"").split(",").map(x=>x.trim()).filter(Boolean).slice(0,limit);}

async function fetchLever(slug:string){
 const response=await fetch(`https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`,{next:{revalidate:900}});
 if(!response.ok)throw new Error(`Lever source ${slug} returned ${response.status}`);
 const postings=await response.json() as LeverPosting[];
 return {source:"Lever",slug,jobs:postings.slice(0,500).map(job=>({id:`lever:${slug}:${job.id}`,title:job.text,company:slug,location:job.categories?.location||job.categories?.allLocations?.join(", ")||"Not specified",mode:job.workplaceType||"Not specified",level:job.categories?.level||"Not specified",commitment:job.categories?.commitment||"",team:job.categories?.team||"",description:job.content?.description||"",salary:job.salaryDescription||"",url:job.urls?.show||job.urls?.apply||"",applyUrl:job.urls?.apply||job.urls?.show||"",source:"Lever"}))};
}

async function fetchGreenhouse(token:string){
 const response=await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`,{next:{revalidate:900}});
 if(!response.ok)throw new Error(`Greenhouse source ${token} returned ${response.status}`);
 const data=await response.json() as {jobs:GreenhouseJob[]};
 return {source:"Greenhouse",slug:token,jobs:(data.jobs||[]).slice(0,500).map(job=>({id:`greenhouse:${token}:${job.id}`,title:job.title,company:token,location:job.location?.name||"Not specified",mode:"Not specified",level:"Not specified",description:job.content||"",salary:"",url:job.absolute_url||"",applyUrl:job.absolute_url||"",source:"Greenhouse",skills:(job.departments||[]).map(x=>x.name||"").filter(Boolean)}))};
}

export async function GET(request:Request){
 const limited=rateLimit(`jobs-public:${clientKey(request)}`,30,60_000);const rateResponse=rateLimitResponse(limited);if(rateResponse)return rateResponse;
 const lever=listEnv("JOBPILOT_LEVER_COMPANIES");const greenhouse=listEnv("JOBPILOT_GREENHOUSE_BOARDS");
 if(!lever.length&&!greenhouse.length)return NextResponse.json({jobs:[],configured:false,message:"Configure JOBPILOT_LEVER_COMPANIES or JOBPILOT_GREENHOUSE_BOARDS with public job board identifiers."});
 const results=await Promise.allSettled([...lever.map(fetchLever),...greenhouse.map(fetchGreenhouse)]);
 const sources=results.map((result,index)=>result.status==="fulfilled"?{source:result.value.source,slug:result.value.slug,status:"ok",jobCount:result.value.jobs.length}:{source:index<lever.length?"Lever":"Greenhouse",slug:index<lever.length?lever[index]:greenhouse[index-lever.length],status:"error",jobCount:0,error:result.reason instanceof Error?result.reason.message:"Source request failed"});
 const jobs=results.flatMap(result=>result.status==="fulfilled"?result.value.jobs:[]);
 return NextResponse.json({jobs:jobs.slice(0,1000),configured:true,sources,sourceCount:sources.length,successfulSources:sources.filter(s=>s.status==="ok").length,failedSources:sources.filter(s=>s.status==="error").length,fetchedAt:new Date().toISOString()});
}