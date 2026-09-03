"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Analytics = {
  summary: { tracked:number; applied:number; interviews:number; offers:number; rejected:number; responseRate:number; interviewRate:number; offerRate:number; rejectionRate:number };
  funnel: {label:string;value:number}[];
  aging: {applicationId:string;title:string;company:string;status:string;days:number}[];
  companies: {company:string;applications:number;interviews:number;offers:number}[];
  insights:string[];
};

export default function AnalyticsPage() {
  const [data,setData]=useState<Analytics|null>(null);
  const [error,setError]=useState("");
  const [retrying,setRetrying]=useState(false);

  async function load() {
    setRetrying(true); setError("");
    try {
      const r=await fetch("/api/analytics",{cache:"no-store"});
      if (r.status===401) { location.href="/login"; return; }
      if (!r.ok) throw new Error("analytics");
      setData(await r.json());
    } catch { setError("Analytics could not be loaded. Check your connection and try again."); }
    finally { setRetrying(false); }
  }

  useEffect(()=>{load();},[]);
  return <main><nav className="nav shell"><Link className="brand" href="/dashboard"><span className="brand-mark">✦</span>JobPilot<span className="brand-ai">AI</span></Link><div className="nav-actions"><Link href="/dashboard">Command center</Link><Link className="nav-cta" href="/tracker">Tracker ↗</Link></div></nav><section className="analytics-shell shell"><div className="eyebrow"><span className="pulse"/> Search intelligence</div><div className="analytics-header"><div><h1>Know what is <em>working.</em></h1><p>Turn your application history into practical signals — conversion, response, aging, and where to focus next.</p></div></div>{error&&<div className="source-notice error">{error} <button className="button secondary" onClick={load} disabled={retrying}>{retrying?"Retrying…":"Retry"}</button></div>}{!data&&!error?<div className="analytics-loading">Building your recruiting picture…</div>:data&&<><div className="analytics-metrics"><Metric label="Tracked" value={data.summary.tracked}/><Metric label="Applied" value={data.summary.applied}/><Metric label="Interview rate" value={`${data.summary.interviewRate}%`}/><Metric label="Response rate" value={`${data.summary.responseRate}%`}/><Metric label="Offers" value={data.summary.offers}/></div><div className="analytics-grid"><section className="analytics-card analytics-funnel"><div className="kicker">PIPELINE FUNNEL</div><h2>Where applications convert</h2>{data.funnel.map(x=><div className="funnel-row" key={x.label}><span>{x.label}</span><div className="funnel-track"><i style={{width:`${data.funnel[0].value?Math.max(4,(x.value/data.funnel[0].value)*100):0}%`}}/></div><b>{x.value}</b></div>)}<p className="truth-note">Rates are calculated from your saved tracker data. They are directional, not a promise of future outcomes.</p></section><section className="analytics-card"><div className="kicker">SIGNAL</div><h2>What the data says</h2><div className="insight-list">{data.insights.map((x,i)=><div className="insight" key={i}><b>0{i+1}</b><span>{x}</span></div>)}</div></section></div><div className="analytics-grid"><section className="analytics-card"><div className="kicker">AGING</div><h2>Roles that need attention</h2>{data.aging.length?<div className="analytics-list">{data.aging.map(x=><div className="analytics-row" key={x.applicationId}><div><strong>{x.title}</strong><span>{x.company} · {x.status}</span></div><b>{x.days}d</b></div>)}</div>:<p className="truth-note">No open applications need attention yet.</p>}</section><section className="analytics-card"><div className="kicker">COMPANIES</div><h2>Where you are concentrating</h2>{data.companies.length?<div className="analytics-list">{data.companies.map(x=><div className="analytics-row" key={x.company}><div><strong>{x.company}</strong><span>{x.applications} tracked · {x.interviews} interview · {x.offers} offer</span></div><b>{x.applications}</b></div>)}</div>:<p className="truth-note">Company patterns appear after you track roles.</p>}</section></div></>}</section></main>
}
function Metric({label,value}:{label:string;value:number|string}){return <div><small>{label}</small><b>{value}</b></div>}
