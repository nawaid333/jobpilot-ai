"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Job = { id:string; title:string; company:string; location:string; mode?:string; level?:string; url?:string; source?:string; salary?:string };
type Application = Job & { status:string; createdAt:string; updatedAt:string; appliedAt?:string; notes:string };
const STATUSES = ["Saved","Preparing","Applied","Interview","Offer","Rejected"];

function readApps():Application[]{try{return JSON.parse(localStorage.getItem("jobpilot-applications")||"[]")}catch{return[]}}
function writeApps(apps:Application[]){localStorage.setItem("jobpilot-applications",JSON.stringify(apps))}

export default function TrackerPage(){
 const [apps,setApps]=useState<Application[]>([]); const [filter,setFilter]=useState("All"); const [loaded,setLoaded]=useState(false);
 useEffect(()=>{setApps(readApps());setLoaded(true)},[]);
 const visible=useMemo(()=>filter==="All"?apps:apps.filter(a=>a.status===filter),[apps,filter]);
 function update(id:string, patch:Partial<Application>){const next=apps.map(a=>a.id===id?{...a,...patch,updatedAt:new Date().toISOString()}:a);setApps(next);writeApps(next)}
 function remove(id:string){const next=apps.filter(a=>a.id!==id);setApps(next);writeApps(next)}
 return <main className="analyze-page tracker-page"><nav className="nav shell"><Link className="brand" href="/"><span className="brand-mark">✦</span>JobPilot<span className="brand-ai">AI</span></Link><span className="analyze-nav-label">APPLICATION TRACKER</span><Link className="nav-cta" href="/jobs">Find jobs ↗</Link></nav>
 <section className="tracker-shell shell"><div className="jobs-header"><div><div className="eyebrow"><span className="pulse"/> Application pipeline</div><h1>Know where <em>every application</em> stands.</h1><p>Keep your opportunities organized from the first save to interview, offer or rejection. Your tracker stays in this browser for now.</p></div><div className="match-summary"><strong>{apps.length}</strong><span>tracked</span></div></div>
 <div className="tracker-stats">{STATUSES.map(s=><button key={s} className={filter===s?"active":""} onClick={()=>setFilter(s)}><strong>{apps.filter(a=>a.status===s).length}</strong><span>{s}</span></button>)}</div>
 <div className="tracker-toolbar"><button className={filter==="All"?"active":""} onClick={()=>setFilter("All")}>All applications</button><Link className="button primary" href="/jobs">+ Add from jobs</Link></div>
 {!loaded?<div className="empty-profile"><h2>Loading tracker…</h2></div>:!visible.length?<div className="empty-profile"><h2>{filter==="All"?"No applications yet.":`No ${filter.toLowerCase()} applications.`}</h2><p>Save a job from the matching page to start building your pipeline.</p><Link className="button primary" href="/jobs">Explore opportunities ↗</Link></div>:<div className="tracker-list">{visible.map(app=><article className="tracker-card" key={app.id}><div className="tracker-card-top"><div><small>{app.company} · {app.location}</small><h2>{app.title}</h2><span>{app.source||"Job source"}{app.level?` · ${app.level}`:""}</span></div><select value={app.status} onChange={e=>update(app.id,{status:e.target.value,appliedAt:e.target.value==="Applied"&&!app.appliedAt?new Date().toISOString():app.appliedAt})}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div><div className="tracker-card-bottom"><textarea value={app.notes} onChange={e=>update(app.id,{notes:e.target.value})} placeholder="Add a note, recruiter detail, next step…"/ ><div className="tracker-actions">{app.url&&<a className="button secondary" href={app.url} target="_blank" rel="noreferrer">Open listing ↗</a>}<Link className="button secondary" href="/tailor" onClick={()=>localStorage.setItem("jobpilot-selected-job",JSON.stringify(app))}>Tailor ↗</Link><button className="button secondary" onClick={()=>remove(app.id)}>Remove</button></div></div></article>)}</div>}
 </section><footer className="analyze-footer shell"><span>✦ JobPilot AI</span><span>Application tracker</span><span>One pipeline. Full visibility.</span></footer></main>;
}
