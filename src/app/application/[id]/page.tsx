"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STATUSES = ["Saved", "Preparing", "Applied", "Interview", "Offer", "Rejected"] as const;
type Status = (typeof STATUSES)[number];

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>("");
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { params.then(p => setId(p.id)); }, [params]);
  useEffect(() => { if (!id) return; fetch(`/api/applications/${encodeURIComponent(id)}`).then(r => r.json()).then(d => { if (d.application) setApplication(d.application); else setError(d.error || "Application not found."); }).catch(() => setError("Could not load application.")).finally(() => setLoading(false)); }, [id]);

  async function changeStatus(status: Status) {
    if (!id || !application || status === application.status) return;
    if (status === "Applied" && !application.tailoredApplication) { setError("Create the tailored package before marking this application as Applied."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/applications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update status.");
      setApplication(data.application);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update status."); } finally { setSaving(false); }
  }

  if (loading) return <main className="page-shell"><section className="panel"><p className="muted">Loading application…</p></section></main>;
  if (error && !application) return <main className="page-shell"><section className="panel"><p className="truth-note">{error}</p><Link className="secondary-button" href="/tracker">← Back to tracker</Link></section></main>;
  if (!application) return null;

  return <main className="page-shell">
    <nav className="nav shell"><Link className="brand" href="/">✦ JobPilot<span className="brand-ai">AI</span></Link><div className="nav-actions"><Link href="/jobs">Jobs</Link><Link href="/agent">Agent</Link><Link className="nav-cta" href="/tracker">Tracker ↗</Link></div></nav>
    <section className="page-hero"><div><p className="eyebrow">APPLICATION WORKSPACE</p><h1>{application.job.title}</h1><p className="muted">{application.job.company} · {application.job.location}{application.job.mode ? ` · ${application.job.mode}` : ""}</p></div><span className="status-pill">{application.status}</span></section>
    <section className="panel"><div className="section-heading"><div><p className="eyebrow">APPLICATION STATUS</p><h2>Keep your pipeline current</h2></div></div><div className="profile-actions">{STATUSES.map(status => <button key={status} className={status === application.status ? "primary-button" : "secondary-button"} disabled={saving || STATUSES.indexOf(status) < STATUSES.indexOf(application.status)} onClick={() => changeStatus(status)}>{status}</button>)}</div>{error && <p className="truth-note">{error}</p>}<p className="truth-note">Status changes are saved to your application and reflected in its activity history.</p></section>
    <section className="stats-grid"><div className="stat-card"><span>Applied</span><strong>{application.appliedAt ? new Date(application.appliedAt).toLocaleDateString() : "Not applied yet"}</strong></div><div className="stat-card"><span>Next action</span><strong>{application.nextActionAt ? new Date(application.nextActionAt).toLocaleDateString() : "No action scheduled"}</strong></div><div className="stat-card"><span>Recruiter signals</span><strong>{application.emailSignals?.length ?? 0}</strong></div><div className="stat-card"><span>Agent actions</span><strong>{application.agentActions?.length ?? 0}</strong></div></section>
    <div className="dashboard-grid"><section className="panel"><p className="eyebrow">APPLICATION PLAN</p><h2>Move this application forward.</h2><div className="profile-actions"><Link className="primary-button" href={`/tailor?applicationId=${encodeURIComponent(application.id)}`}>Open tailoring</Link><Link className="secondary-button" href={`/intelligence?applicationId=${encodeURIComponent(application.id)}`}>Review signals</Link><Link className="secondary-button" href="/agent">Open Agent</Link></div></section><section className="panel"><p className="eyebrow">TAILORED PACKAGE</p><h2>{application.tailoredApplication ? "Ready for review" : "Not prepared yet"}</h2>{application.tailoredApplication ? <><p>{application.tailoredApplication.recommendation}</p><p className="muted">Template: {application.tailoredApplication.template}</p></> : <p className="muted">Build a role-specific package from your saved career profile.</p>}</section></div>
    <section className="panel"><div className="section-heading"><div><p className="eyebrow">NEXT ACTIONS</p><h2>What needs attention</h2></div></div>{application.agentActions?.length ? <div className="recent-list">{application.agentActions.map((action: any) => <div className="recent-row" key={action.id}><div><strong>{action.title}</strong><span>{action.reason}</span></div><b>P{action.priority}</b></div>)}</div> : <p className="truth-note">No agent actions for this application.</p>}</section>
    <section className="panel"><div className="section-heading"><div><p className="eyebrow">RECRUITER SIGNALS</p><h2>Latest activity</h2></div></div>{application.emailSignals?.length ? <div className="recent-list">{application.emailSignals.map((signal: any) => <div className="recent-row" key={signal.id}><div><strong>{signal.category}</strong><span>{signal.subject || signal.reason}</span></div><b>{Math.round(signal.confidence * 100)}%</b></div>)}</div> : <p className="truth-note">No recruiting-email signals linked to this application yet.</p>}</section>
    <section className="panel"><p className="eyebrow">JOB DETAILS</p><h2>Original opportunity</h2>{application.job.description && <p className="muted">{application.job.description.slice(0, 1200)}</p>}<div className="profile-actions"><Link className="secondary-button" href="/tracker">← Back to tracker</Link>{application.job.url && <a className="primary-button" href={application.job.url} target="_blank" rel="noreferrer">Open original listing ↗</a>}</div></section>
  </main>;
}
