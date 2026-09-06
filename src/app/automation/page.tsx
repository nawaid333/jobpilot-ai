"use client";
import Link from "next/link";
import { useEffect,useMemo,useState } from "react";

type App={id:string;status:string;job:{id:string;title:string;company:string;location:string;url:string|null};tailoredApplication?:unknown};
type PlanStep={key:string;label:string;completed:boolean};
type Plan={applicationId:string;job:App["job"];currentStatus:string;ready:boolean;steps:PlanStep[]};

export default function AutomationPage(){
 const [apps,setApps]=useState<App[]>([]),[selected,setSelected]=useState<string[]>([]),[plan,setPlan]=useState<Plan[]>([]),[loading,setLoading]=useState(true),[running,setRunning]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
 useEffect(()=>{load()},[]);
 async function load(){setLoading(true);try{const r=await fetch("/api/applications",{cache:"no-store"});const x=await r.json();if(!r.ok)throw new Error(x.error||"Could not load applications.");setApps(x.applications||[])}catch(e){setError(e instanceof Error?e.message:"Could not load applications.")}finally{setLoading(false)}}
 const toggle=(id:string)=>setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
 async function prepare(){
  if(!selected.length)return;
  setRunning(true);setPlan([]);setMessage("");setError("");
  const failures:string[]=[];
  for(const id of selected){
   const app=apps.find(x=>x.id===id); if(!app)continue;
   if(!app.tailoredApplication){
    const r=await fetch("/api/tailor",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jobId:app.job.id})});
    if(!r.ok){const d=await r.json().catch(()=>({}));failures.push(`${app.job.company}: ${d.error||"tailoring failed"}`);continue;}
   }
  }
  const r=await fetch("/api/automation/prepare",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({applicationIds:selected})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){setError(d.error||"Could not prepare workflow.");setRunning(false);return;}
  setPlan(d.steps||[]);setSelected([]);await load();
  setMessage(failures.length?`Prepared ${d.count} workflow${d.count===1?"":"s"}. ${failures.length} application${failures.length===1?"":"s"} could not be tailored.`:`Prepared ${d.count} application workflow${d.count===1?"":"s"} with tailored materials.`);
  if(failures.length)setError(failures.join(" · "));
  setRunning(false);
 }
 const readyCount=useMemo(()=>selected.filter(id=>apps.find(a=>a.id===id)?.tailoredApplication).length,[selected,apps]);
 return <main><nav className="nav shell"><Link className="brand" href="/dashboard"><span className="brand-mark">✦</span>JobPilot<span className="brand-ai">AI</span></Link><div className="nav-actions"><Link href="/tracker">Tracker</Link><Link className="nav-cta" href="/dashboard">Command center ↗</Link></div></nav><section className="automation-shell shell"><div className="eyebrow"><span className="pulse"/> Controlled execution</div><h1>Apply with <em>confidence.</em></h1><p className="automation-lede">JobPilot can prepare the work, open the right path, and keep every high-impact submission under your control.</p><div className="automation-trust"><b>USER CONTROLLED</b><span>No application is submitted automatically.</span></div>{error&&<div className="source-notice error">{error}</div>}{message&&<div className="source-notice">{message}</div>}<div className="automation-grid"><section className="automation-card"><div className="preference-heading"><div><div className="kicker">SELECT APPLICATIONS</div><h2>Build an application run</h2></div><span className="preference-badge">{selected.length} selected</span></div>{loading?<p className="truth-note">Loading your applications…</p>:apps.length?<div className="automation-list">{apps.filter(a=>a.status!=="Rejected").map(a=><label className={`automation-row ${selected.includes(a.id)?"selected":""}`} key={a.id}><input type="checkbox" checked={selected.includes(a.id)} onChange={()=>toggle(a.id)}/><div><strong>{a.job.title}</strong><span>{a.job.company} · {a.job.location}</span></div><small>{a.tailoredApplication?"TAILORED":"NEEDS TAILORING"}</small></label>)}</div>:<p className="truth-note">Save a job in the Tracker first.</p>}<button className="button primary" disabled={!selected.length||running} onClick={prepare}>{running?`Preparing ${selected.length} application${selected.length===1?"":"s"}…`:`Prepare ${selected.length||"selected"} application${selected.length===1?"":"s"} →`}</button>{selected.length>0&&<p className="truth-note">{readyCount} already tailored · {selected.length-readyCount} will be tailored now. Each new AI package uses one AI credit.</p>}</section><section className="automation-card"><div className="kicker">HOW IT WORKS</div><h2>Three deliberate steps</h2><div className="workflow"><div><b>01</b><span>Review</span><p>Check the tailored CV and cover letter.</p></div><div><b>02</b><span>Open</span><p>Use the employer's permitted application route.</p></div><div><b>03</b><span>Confirm</span><p>You make the final submission decision.</p></div></div></section></div>{plan.length>0&&<section className="automation-result"><div className="kicker">READY TO EXECUTE</div><h2>{plan.length} workflow{plan.length===1?"":"s"} prepared</h2>{plan.map(x=><div className="automation-plan" key={x.applicationId}><div><strong>{x.job.title}</strong><span>{x.job.company} · {x.currentStatus}</span></div><div className="plan-steps">{x.steps.map(s=><span key={s.key}>{s.completed?"✓":"○"} {s.label}</span>)}</div><div className="profile-actions">{x.job.url&&<a className="button primary" href={x.job.url} target="_blank" rel="noreferrer">Open application ↗</a>}<Link className="button secondary" href={`/tailor?applicationId=${encodeURIComponent(x.applicationId)}`}>Review package ↗</Link><Link className="button secondary" href="/tracker">Track ↗</Link></div></div>)}<p className="truth-note">The final submission remains manual. JobPilot never silently submits an application.</p></section>}</section></main>}
