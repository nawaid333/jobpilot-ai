"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Profile = { atsScore: number; candidate: { headline: string | null }; skills: string[]; targetRoles: string[] };
type Preferences = { roles: string; locations: string; workMode: string; seniority: string; minSalary: string; keywords: string };
type Job = { id: string; title: string; company: string; location: string; mode: string; level: string; skills: string[]; description: string; url: string; applyUrl?: string; source?: string; salary?: string };

function scoreJob(job: Job, profile: Profile, prefs: Preferences) {
  const text = `${job.title} ${job.company} ${job.location} ${job.mode} ${job.level} ${job.skills.join(" ")} ${job.description}`.toLowerCase();
  const profileTerms = [...profile.skills, ...profile.targetRoles, ...(profile.candidate.headline ? [profile.candidate.headline] : [])].map(x => x.toLowerCase());
  const prefTerms = `${prefs.roles} ${prefs.keywords}`.toLowerCase().split(/[\s,;|]+/).filter(Boolean);
  const matched = [...profileTerms, ...prefTerms].filter(term => term.length > 2 && text.includes(term));
  let score = 45 + Math.min(35, matched.length * 5);
  if (prefs.locations && prefs.locations.toLowerCase().split(/[,;]+/).some(x => x.trim() && job.location.toLowerCase().includes(x.trim()))) score += 8;
  if (prefs.workMode !== "Any" && job.mode.toLowerCase() === prefs.workMode.toLowerCase()) score += 7;
  if (prefs.seniority !== "Any" && job.level.toLowerCase().includes(prefs.seniority.split(" ")[0].toLowerCase())) score += 5;
  return Math.min(99, score);
}

export default function JobsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [prefs, setPrefs] = useState<Preferences>({ roles: "", locations: "", workMode: "Any", seniority: "Any", minSalary: "", keywords: "" });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("All");
  const [error, setError] = useState("");

  useEffect(() => { try { const p = localStorage.getItem("jobpilot-career-profile"); const pref = localStorage.getItem("jobpilot-job-preferences"); if (p) setProfile(JSON.parse(p)); if (pref) setPrefs(prev => ({ ...prev, ...JSON.parse(pref) })); } catch {} }, []);
  useEffect(() => { if (!profile) return; setLoading(true); fetch("/api/jobs").then(r => r.json()).then(data => { setJobs(data.jobs || []); setConfigured(Boolean(data.configured)); }).catch(() => setError("Could not load job sources right now.")).finally(() => setLoading(false)); }, [profile]);

  const ranked = useMemo(() => jobs.map(job => ({ job, score: scoreJob(job, profile || { atsScore: 0, candidate: { headline: "" }, skills: [], targetRoles: [] }, prefs) })).filter(x => (mode === "All" || x.job.mode.toLowerCase() === mode.toLowerCase()) && `${x.job.title} ${x.job.company} ${x.job.location} ${x.job.skills.join(" ")}`.toLowerCase().includes(query.toLowerCase())).sort((a,b) => b.score-a.score), [jobs, profile, prefs, query, mode]);

  return <main className="analyze-page jobs-page"><nav className="nav shell"><Link className="brand" href="/"><span className="brand-mark">✦</span>JobPilot<span className="brand-ai">AI</span></Link><span className="analyze-nav-label">REAL JOB DISCOVERY</span><Link className="nav-cta" href="/profile">Edit target ↗</Link></nav>
    <section className="jobs-shell shell"><div className="jobs-header"><div><div className="eyebrow"><span className="pulse" /> Live source integration</div><h1>Jobs that fit <em>you.</em></h1><p>JobPilot now supports live published listings from configured Lever public job sources, then ranks them against your real profile and preferences.</p></div><div className="match-summary"><strong>{ranked.length}</strong><span>matches shown</span></div></div>
      {!profile ? <div className="empty-profile"><h2>Build your career profile first.</h2><p>JobPilot needs your real skills and target preferences before it can calculate meaningful matches.</p><Link className="button primary" href="/profile">Build my profile ↗</Link></div> : <>{!configured && !loading && <div className="source-notice"><b>Real job discovery is ready.</b><span>Add public Lever company slugs to <code>JOBPILOT_LEVER_COMPANIES</code> in your deployment environment to activate live listings.</span></div>}{error && <div className="source-notice error">{error}</div>}<div className="job-controls"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search title, skill or company…" /><div className="filter-pills">{["All","Remote","Hybrid","On-site"].map(x => <button className={mode === x ? "active" : ""} key={x} onClick={() => setMode(x)}>{x}</button>)}</div></div>{loading ? <div className="empty-profile"><h2>Finding live opportunities…</h2><p>Fetching published jobs from your configured sources.</p></div> : <div className="job-list">{ranked.map(({job,score}) => <article className="job-card" key={job.id}><div className="job-card-main"><div className="company-icon">{job.company[0]?.toUpperCase()}</div><div><div className="job-meta">{job.company} · {job.location} · {job.source || "Job source"}</div><h2>{job.title}</h2><p>{job.description.replace(/<[^>]+>/g, " ").slice(0, 280)}{job.description.length > 280 ? "…" : ""}</p><div className="job-tags">{job.skills.slice(0, 5).map(s => <span key={s}>{s}</span>)}<span>{job.mode}</span><span>{job.level}</span>{job.salary && <span>{job.salary}</span>}</div></div></div><div className="job-match"><strong>{score}%</strong><small>MATCH</small><a className="button secondary" href={job.url || job.applyUrl || "#"} target="_blank" rel="noreferrer">View opportunity ↗</a></div></article>)}{!ranked.length && <div className="empty-profile"><h2>No live matches yet.</h2><p>{configured ? "Try broader filters or configure another public job source." : "Activate a public Lever source to start discovering real jobs."}</p></div>}</div>}</>}
    </section><footer className="analyze-footer shell"><span>✦ JobPilot AI</span><span>Real job discovery</span><span>Source links always point to the original listing.</span></footer></main>;
}
