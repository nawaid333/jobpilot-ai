import { NextResponse } from "next/server";

function listEnv(name:string){return (process.env[name]||"").split(",").map(x=>x.trim()).filter(Boolean).slice(0,20);}

export async function GET(){
 const lever=listEnv("JOBPILOT_LEVER_COMPANIES");
 const greenhouse=listEnv("JOBPILOT_GREENHOUSE_BOARDS");
 const sourceCount=lever.length+greenhouse.length;
 return NextResponse.json({
   ok:true,
   configured:sourceCount>0,
   sourceCount,
   sources:{lever:lever.length,greenhouse:greenhouse.length},
   checkedAt:new Date().toISOString(),
 });
}