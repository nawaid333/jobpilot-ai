"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const jobs = [
  { title: "Project Coordinator", team: "Capital Projects", location: "Jamshedpur", match: 94, skills: "Project coordination · MIS · Excel · workforce planning" },
  { title: "Workforce Coordinator", team: "Operations", location: "Jamshedpur", match: 91, skills: "Scheduling · manpower · reporting · operations" },
  { title: "MIS / Operations Analyst", team: "Digital & Operations", location: "Jamshedpur", match: 87, skills: "Excel · Power BI · SQL · analytics" },
];

export default function TataSteelDemo() {
  const [selected, setSelected] = useState(0);
  const [generated, setGenerated] = useState(false);
  const job = jobs[selected];
  const steps = useMemo(() => [
    ["01", "Career profile", "Verified experience and skills extracted from the candidate CV."],
    ["02", "Role matching", `AI compares the profile against ${job.title} requirements.`],
    ["03", "Application pack", "Tailored CV points and a cover letter are prepared from verified facts."],
    ["04", "Human review", "Candidate reviews and submits through the employer's permitted channel."],
  ], [job.title]);

  return <main className="ts-demo">
    <nav className="nav shell"><Link className="brand" href="/"><span className="brand-mark">✦</span>JobPilot<span className="brand-ai">AI</span></Link><div className="ts-badge">PARTNERSHIP DEMO</div><Link className="nav-cta" href="/onboarding">Open product ↗</Link></nav>

    <section className="ts-hero shell">
      <div><div className="eyebrow"><span className="pulse" /> Enterprise AI workflow</div>
        <h1>JobPilot × <em>Tata Steel</em></h1>
        <p>Interactive proof-of-concept showing how JobPilot could support talent discovery and application preparation while keeping hiring decisions and submissions under human control.</p>
        <div className="ts-note"><b>DEMO STATUS</b><span>Conceptual workflow — not a Tata Steel partnership or endorsement.</span></div>
      </div>
      <div className="ts-metric"><small>Candidate → role fit</small><strong>{job.match}%</strong><span>based on demo profile signals</span></div>
    </section>

    <section className="ts-workspace shell">
      <div className="ts-panel">
        <div className="ts-panel-head"><div><small>DEMO CANDIDATE</small><h2>Career Profile</h2></div><span className="ts-status">VERIFIED INPUTS</span></div>
        <div className="ts-profile"><div className="ts-avatar">N</div><div><b>Operations & Project Coordination</b><span>7+ years · workforce coordination · MIS · operations</span></div></div>
        <div className="ts-chips">{["Project Coordination","Advanced Excel","MIS Reporting","Workforce Planning","Power BI","SQL"].map(x=><span key={x}>{x}</span>)}</div>
        <div className="ts-rule" />
        <small className="ts-label">MATCH AGAINST</small>
        <div className="ts-jobs">{jobs.map((j,i)=><button className={i===selected?"active":""} onClick={()=>{setSelected(i);setGenerated(false)}} key={j.title}><span><b>{j.title}</b><small>{j.team} · {j.location}</small></span><strong>{j.match}%</strong></button>)}</div>
      </div>

      <div className="ts-panel">
        <div className="ts-panel-head"><div><small>AI MATCH ANALYSIS</small><h2>{job.title}</h2></div><strong className="ts-score">{job.match}%</strong></div>
        <p className="ts-copy">Strong alignment across the candidate's verified experience and the selected role.</p>
        <div className="ts-match"><div><span>Role relevance</span><b>{job.match}%</b></div><i><u style={{width:`${job.match}%`}} /></i></div>
        <div className="ts-match"><div><span>Core skills</span><b>92%</b></div><i><u style={{width:"92%"}} /></i></div>
        <div className="ts-match"><div><span>Experience alignment</span><b>89%</b></div><i><u style={{width:"89%"}} /></i></div>
        <div className="ts-skills"><small>RELEVANT SIGNALS</small><p>{job.skills}</p></div>
        <button className="ts-button" onClick={()=>setGenerated(true)}>{generated ? "Application pack ready ✓" : "Generate application pack ↗"}</button>
      </div>
    </section>

    <section className="ts-flow shell"><div className="ts-section-head"><small>CONTROLLED AUTOMATION</small><h2>AI prepares. <em>Humans decide.</em></h2></div><div className="ts-steps">{steps.map(s=><article key={s[0]}><b>{s[0]}</b><h3>{s[1]}</h3><p>{s[2]}</p></article>)}</div>{generated&&<div className="ts-output"><b>DEMO OUTPUT GENERATED</b><span>Tailored CV highlights + role-specific cover letter + application checklist</span><button onClick={()=>setGenerated(false)}>Reset demo</button></div>}</section>

    <footer className="footer shell"><span>JobPilot AI · Enterprise proof of concept</span><span>Prepared for innovation conversations</span></footer>
  </main>