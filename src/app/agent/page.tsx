"use client";

import { useEffect, useState } from "react";

export default function AgentPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setError("");
    const res = await fetch("/api/agent", { cache: "no-store" });
    if (!res.ok) { setError("Could not load the agent queue."); return; }
    setData(await res.json());
  }

  async function execute(action: any) {
    if (!action.applicationId) return;
    setBusy(action.id); setMessage(""); setError("");
    const res = await fetch("/api/agent/execute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: action.type === "tailor" ? "prepare" : "mark-preparing", applicationId: action.applicationId }) });
    const result = await res.json();
    setBusy("");
    if (!res.ok) { setError(result.error || "Action failed."); return; }
    if (result.redirect) window.location.href = result.redirect;
    else { setMessage(result.message || "Action completed."); await load(); }
  }

  useEffect(() => { load(); }, []);

  const hrefFor = (action: any) => {
    if (action.type === "tailor") return `/tailor?applicationId=${encodeURIComponent(action.applicationId)}`;
    if (action.type === "interview") return `/interview?applicationId=${encodeURIComponent(action.applicationId)}`;
    if (action.type === "follow-up") return `/intelligence?applicationId=${encodeURIComponent(action.applicationId)}`;
    if (action.type === "review" || action.type === "assessment") return "/intelligence";
    if (action.type === "offer") return "/tracker";
    return "/tracker";
  };

  return (
    <main className="page-shell">
      <section className="page-hero">
        <div><p className="eyebrow">JOBPILOT AGENT</p><h1>Next best actions for your job search.</h1><p className="muted">One queue for applications, recruiting emails, follow-ups, interviews, and preparation.</p></div>
        <button className="secondary-button" onClick={load}>Refresh queue</button>
      </section>
      {error && <div className="error-box">{error}</div>}
      {message && <div className="success-box">{message}</div>}
      {!data && !error && <div className="panel">Loading your agent queue…</div>}
      {data && <>
        <section className="stats-grid">
          <div className="stat-card"><span>Active applications</span><strong>{data.summary.activeApplications}</strong></div><div className="stat-card"><span>Needs attention</span><strong>{data.summary.needsAttention}</strong></div><div className="stat-card"><span>Prepared packages</span><strong>{data.summary.prepared}</strong></div><div className="stat-card"><span>Inbox signals</span><strong>{data.summary.inboxSignals}</strong></div>
        </section>
        <section className="panel"><div className="section-heading"><div><p className="eyebrow">ACTION QUEUE</p><h2>What should happen next</h2></div></div>
          {data.actions.length === 0 ? <div className="empty-state"><h3>You’re caught up.</h3><p>No high-priority recruiting actions were detected from your current workspace.</p></div> : <div className="action-list">{data.actions.map((action: any) => <article className="action-card" key={action.id}><div className="action-priority">P{action.priority}</div><div className="action-content"><div className="action-title-row"><h3>{action.title}</h3><span>{action.role}</span></div><strong>{action.company}</strong><p>{action.reason}</p></div>{action.type === "tailor" ? <button className="primary-button" disabled={busy===action.id} onClick={() => execute(action)}>{busy===action.id ? "Preparing…" : "Prepare"}</button> : <a className="primary-button" href={hrefFor(action)}>{action.type === "review" ? "Review" : "Open"}</a>}</article>)}</div>}
        </section>
        <section className="panel trust-panel"><p className="eyebrow">CONTROL & TRUST</p><h2>The agent assists. You stay in control.</h2><p>{data.policy}</p><div className="trust-points"><span>✓ Uses only facts in your workspace</span><span>✓ Surfaces ambiguous email matches for review</span><span>✓ No automatic email sending</span><span>✓ No automatic application submission</span></div></section>
      </>}
    </main>
  );
}
