"use client";

import { useEffect, useMemo, useState } from "react";

function workflowFor(action: any) {
  const status = action?.status || "Saved";
  const hasTailored = !!action?.hasTailored;
  return [
    ["MATCH", "complete"],
    ["TAILOR", hasTailored ? "complete" : status === "Saved" || status === "Preparing" ? "current" : "complete"],
    ["REVIEW", hasTailored ? "current" : "blocked"],
    ["APPLY", ["Applied", "Interview", "Offer"].includes(status) ? "complete" : hasTailored ? "upcoming" : "blocked"],
    ["TRACK", ["Applied", "Interview", "Offer", "Rejected"].includes(status) ? "current" : "upcoming"],
    ["MONITOR", ["Applied", "Interview", "Offer"].includes(status) ? "upcoming" : "blocked"],
  ];
}

export default function AgentPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<any>(null);

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

  const selectedWorkflow = useMemo(() => selected ? workflowFor(selected) : null, [selected]);

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
        {selectedWorkflow && <section className="panel">
          <div className="section-heading"><div><p className="eyebrow">AGENT WORKFLOW</p><h2>{selected.company} · {selected.role}</h2></div><button className="secondary-button" onClick={() => setSelected(null)}>Close</button></div>
          <div className="job-tags">{selectedWorkflow.map(([label, state]: string[]) => <span key={label}>{state === "complete" ? "✓ " : state === "current" ? "→ " : ""}{label}</span>)}</div>
          <p className="muted">JobPilot moves the application through this sequence while keeping review and final submission under your control.</p>
          <div className="profile-actions">
            {selected.type === "tailor" && <button className="primary-button" disabled={busy===selected.id} onClick={() => execute(selected)}>{busy===selected.id ? "Preparing…" : "Start tailoring"}</button>}
            {selected.type !== "tailor" && <a className="primary-button" href={hrefFor(selected)}>Continue to {selected.title.replace(/^Review |^Prepare /, "").toLowerCase()}</a>}
          </div>
        </section>}
        <section className="panel"><div className="section-heading"><div><p className="eyebrow">ACTION QUEUE</p><h2>What should happen next</h2></div></div>
          {data.actions.length === 0 ? <div className="empty-state"><h3>You’re caught up.</h3><p>No high-priority recruiting actions were detected from your current workspace.</p></div> : <div className="action-list">{data.actions.map((action: any) => <article className="action-card" key={action.id}><div className="action-priority">P{action.priority}</div><div className="action-content"><div className="action-title-row"><h3>{action.title}</h3><span>{action.role}</span></div><strong>{action.company}</strong><p>{action.reason}</p></div><button className="primary-button" onClick={() => setSelected(action)}>{action.type === "tailor" ? "Start" : "View workflow"}</button></article>)}</div>}
        </section>
        <section className="panel trust-panel"><p className="eyebrow">CONTROL & TRUST</p><h2>The agent assists. You stay in control.</h2><p>{data.policy}</p><div className="trust-points"><span>✓ Uses only facts in your workspace</span><span>✓ Surfaces ambiguous email matches for review</span><span>✓ No automatic email sending</span><span>✓ No automatic application submission</span></div></section>
      </>}
    </main>
  );
}
