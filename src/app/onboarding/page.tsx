"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const steps = [
  { label: "Create your source of truth", title: "Start with your CV", text: "Upload your CV so JobPilot can build a career profile from facts you can support.", href: "/analyze", action: "Analyze my CV" },
  { label: "Shape your target", title: "Set your job preferences", text: "Choose target roles, locations, work mode and seniority so recommendations reflect what you actually want.", href: "/profile", action: "Set preferences" },
  { label: "Find your fit", title: "Discover relevant jobs", text: "Review live opportunities ranked against your career profile and preferences.", href: "/discover", action: "Discover jobs" },
];

export default function OnboardingPage() {
  const [state, setState] = useState({ profile: false, preferences: false });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/profile").then(async r => {
      if (r.status === 401) { window.location.href = "/login"; return; }
      const data = await r.json();
      setState({ profile: Boolean(data.profile?.summary || data.profile?.skills?.length), preferences: Boolean(data.preferences?.roles || data.preferences?.locations || data.preferences?.keywords) });
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const current = !state.profile ? 0 : !state.preferences ? 1 : 2;
  if (!loaded) return <main className="analyze-page"><section className="onboarding-shell shell"><div className="eyebrow"><span className="pulse" /> Loading your workspace</div><h1>Preparing your <em>next step.</em></h1></section></main>;

  return <main className="analyze-page">
    <nav className="nav shell"><Link className="brand" href="/"><span className="brand-mark">✦</span>JobPilot<span className="brand-ai">AI</span></Link><span className="analyze-nav-label">FIRST-TIME SETUP</span><Link className="nav-cta" href="/dashboard">Dashboard ↗</Link></nav>
    <section className="onboarding-shell shell">
      <div className="onboarding-intro"><div className="eyebrow"><span className="pulse" /> Your guided start</div><h1>Build your job search<br /><em>in three steps.</em></h1><p>JobPilot works best when your profile is grounded in your real experience and your preferences are explicit. You stay in control at every step.</p></div>
      <div className="onboarding-progress"><span className="progress-line"><i style={{ width: `${((current) / steps.length) * 100}%` }} /></span><b>Step {Math.min(current + 1, steps.length)} of {steps.length}</b></div>
      <div className="onboarding-grid">{steps.map((step, index) => { const done = index === 0 ? state.profile : index === 1 ? state.preferences : false; const active = index === current; return <article className={`onboarding-card ${active ? "active" : ""} ${done ? "done" : ""}`} key={step.title}><span className="onboarding-number">0{index + 1}</span><div className="onboarding-icon">{done ? "✓" : "✦"}</div><small>{done ? "COMPLETE" : step.label.toUpperCase()}</small><h2>{step.title}</h2><p>{step.text}</p>{done ? <span className="onboarding-complete">Ready ✓</span> : <Link className="button primary" href={step.href}>{step.action} ↗</Link>}</article>; })}</div>
      <div className="onboarding-trust"><strong>Truth-first workflow</strong><span>JobPilot does not invent experience, automatically submit applications, or send emails on your behalf.</span></div>
    </section>
  </main>;
}
