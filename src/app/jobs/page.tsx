"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Profile = { atsScore: number; candidate: { headline: string | null }; skills: string[]; targetRoles: string[] };
type Preferences = { roles: string; locations: string; workMode: string; seniority: string; minSalary: string; keywords: string };
type Job = { title: string; company: string; location: string; mode: string; level: string; skills: string[]; description: string; url: string };

const sampleJobs: Job[] = [
  { title: "Operations Manager", company: "Technology & SaaS Company", location: "Berlin, Germany", mode: "Hybrid", level: "Mid-Senior", skills: ["Operations", "Project Coordination", "SaaS"], description: "Own cross-functional operations, improve workflows and coordinate teams in a technology environment.", url: "#" },
  { title: "Project Coordinator", company: "AI & Software Company", location: "Amsterdam, Netherlands", mode: "Hybrid", level: "Mid level", skills: ["Project Management", "Reporting", "Stakeholders"], description: "Coordinate projects, reporting and stakeholders across a growing AI/software organization.", url: "#" },
  { title: "Workforce Analyst", company: "Enterprise Services Company", location: "Remote — Europe", mode: "Remote", level: "Mid level", skills: ["Workforce", "MIS", "Data Analysis"], description: "Analyze workforce data, create operational reporting and support planning decisions.", url: "#" },
  { title: "Operations Project Specialist", company: "Global Digital Business", location: "Munich, Germany", mode: "On-site", level: "Mid-Senior", skills: ["Operations", "Projects", "Excel"], description: "Drive operational projects, process improvements and business reporting across teams.", url: "#" },
  { title: "PMO Analyst", company: "Enterprise Technology Company", location: "Remote — EU", mode: "Remote", level: "Mid level", skills: ["PMO", "Reporting", "Coordination"], description: "Support portfolio reporting, project governance and delivery coordination.", url: "#" },
];

function scoreJob(job: Job, profile: Profile, prefs: Preferences) {
  const text = `${job.title} ${job.company} ${job.location} ${job.mode} ${job.level} ${job.skills.join(" ")}`.toLowerCase();
  const profileTerms = [...profile.skills, ...profile.targetRoles, ...(profile.candidate.headline ? [profile.candidate.headline] : [])].map(x => x.toLowerCase());
  const prefTerms = `${prefs.roles} ${prefs.keywords}`.toLowerCase().split(/[\s,;|]+/).filter(Boolean);
  const matched = [...profileTerms, ...prefTerms].filter(term => term.length > 2 && text.includes(term));
  let score = 50 + Math.min(30, matched.length * 6);
  if (prefs.locations && prefs.locations.toLowerCase().split(/[,;]+/).some(x => x.trim() && job.location.toLowerCase().includes(x.trim()))) score += 8;
  if (prefs.workMode !== "Any" && job.mode.toLowerCase() === prefs.workMode.toLowerCase()) score += 7;
  if (prefs.seniority !== "Any" && job.level.toLowerCase().includes(prefs.seniority.split(" ")[0].toLowerCase())) score += 5;
  return Math.min(99, score);
}

export default function JobsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [prefs, setPrefs] = useState<Preferences>({ roles: "", locations: "", workMode: "Any", seniority: "Any", minSalary: "", keywords: "" });
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("All");
  useEffect(() => { try { const p = localStorage.getItem("jobpilot-career-profile"); const pref = localStorage.getItem("jobpilot-job-preferences"); if (p) setProfile(JSON.parse(p)); if (pref) setPrefs(prev => ({ ...prev, ...JSON.parse(pref) })); } catch {} }, []);
  const jobs = useMemo(() => sampleJobs.map(job => ({ job, score: scoreJob(job, profile || { atsScore: 0, candidate: { headline: "" }, skills: [], targetRoles: [] }, prefs) })).filter(x => (mode === "All" || x.job.mode === mode) && `${x.job.title} ${x.job.company} ${x.job.location} ${x.job.skills.join(" ")}`.toLowerCase().includes(query.toLowerCase())).sort((a,b) => b.score-a.score), [profile, prefs, query, mode]);

  return <main className="analyze-page jobs-page"><nav className="nav shell"><Link className="brand" href="/"><span className="brand-mark">✦</span>JobPilot<span className="brand-ai">AI</span></Link><span className="analyze-nav-label">JOB MATCHING ENGINE</span><Link className="nav-cta" href="/profile">Edit target ↗</Link></nav>
    <section className="jobs-shell shell"><div className="jobs-header"><div><div className="eyebrow"><span className="pulse" /> Fit-first matching</div><h1>Jobs that fit <em>you.</em></h1><p>Matches are ranked against your career profile and job preferences. This demo uses representative listings; production discovery will connect only to permitted job sources.</p></div><div className="match-summary"><strong>{jobs.length}</strong><span>matches shown</span></div></div>
      {!profile ? <div className="empty-profile"><h2>Build your career profile first.</h2><p>JobPilot needs your real skills and target preferences before it can calculate meaningful matches.</p><Link className="button primary" href="/profile">Build my profile ↗</Link></div> : <><div className="job-controls"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search title, skill or company…" /><div className="filter-pills">{["All","Remote","Hybrid","On-site"].map(x => <button className={mode === x ? "active" : ""} key={x} onClick={() => setMode(x)}>{x}</button>)}</div></div><div className="job-list">{jobs.map(({job,score}) => <article className="job-card" key={job.title}><div className="job-card-main"><div className="company-icon">{job.company[0]}</div><div><div className="job-meta">{job.company} · {job.location}</div><h2>{job.title}</h2><p>{job.description}</p><div className="job-tags">{job.skills.map(s => <span key={s}>{s}</span>)}<span>{job.mode}</span><span>{job.level}</span></div></div></div><div className="job-match"><strong>{score}%</strong><small>MATCH</small><button className="button secondary" onClick={() => alert("Application flow will be connected to an authorized job source in the next milestone.")}>View opportunity ↗</button></div></article>)}{!jobs.length && <div className="empty-profile"><h2>No matches for these filters.</h2><p>Try a broader search or adjust your job preferences.</p></div>}</div></>}
    </section><footer className="analyze-footer shell"><span>✦ JobPilot AI</span><span>Job matching</span><span>Real fit over application volume.</span></footer></main>;
}
