"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type HistoryAction = {
  id: string;
  actionType: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  application: { id: string; status: string; job: { title: string; company: string } } | null;
  result: { message: string | null; next: string | null; followUpDueAt: string | null } | null;
};

type HistoryResponse = {
  actions: HistoryAction[];
  pagination: { limit: number; hasMore: boolean };
  policy: string;
};

function actionLabel(type: string) {
  return type.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function AgentHistoryPage() {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/agent/history?limit=50", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError("Agent history could not be loaded."));
  }, []);

  return (
    <main className="page-shell">
      <section className="page-hero">
        <div>
          <p className="eyebrow">AGENT ACTIVITY</p>
          <h1>See what JobPilot has done.</h1>
          <p className="muted">A chronological audit trail of Agent actions, with the application context and recorded outcome.</p>
        </div>
        <Link className="secondary-button" href="/agent">Back to Agent</Link>
      </section>

      {error && <div className="error-box" role="alert">{error}</div>}
      {!data && !error && <div className="panel" aria-live="polite">Loading Agent history…</div>}

      {data && (
        <>
          <section className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">AUDIT TRAIL</p>
                <h2>{data.actions.length ? `${data.actions.length} recent actions` : "No Agent actions yet"}</h2>
                <p className="muted">Newest actions appear first. Failed and in-progress actions are retained so the timeline remains truthful.</p>
              </div>
            </div>

            {data.actions.length === 0 ? (
              <div className="empty-state">
                <h3>Your Agent history is empty.</h3>
                <p>Use the Agent queue to prepare or progress an application, then return here to review the recorded action.</p>
              </div>
            ) : (
              <div className="action-list">
                {data.actions.map((action) => (
                  <article className="action-card" key={action.id}>
                    <div className="action-priority">{action.status === "completed" ? "✓" : "!"}</div>
                    <div className="action-content">
                      <div className="action-title-row">
                        <h3>{actionLabel(action.actionType)}</h3>
                        <span>{action.status.toUpperCase()}</span>
                      </div>
                      {action.application ? (
                        <>
                          <strong>{action.application.job.company} · {action.application.job.title}</strong>
                          <p>{action.result?.message || `Application status: ${action.application.status}.`}</p>
                          <small>{formatDate(action.createdAt)}{action.completedAt ? ` · completed ${formatDate(action.completedAt)}` : " · still processing"}</small>
                        </>
                      ) : (
                        <>
                          <strong>Workspace action</strong>
                          <p>{action.result?.message || "No additional outcome was recorded."}</p>
                          <small>{formatDate(action.createdAt)}</small>
                        </>
                      )}
                    </div>
                    {action.application && <Link className="secondary-button" href={`/application/${encodeURIComponent(action.application.id)}`}>Open</Link>}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="panel trust-panel">
            <p className="eyebrow">CONTROL & TRUST</p>
            <h2>Your history is an audit trail, not an autonomous activity feed.</h2>
            <p>{data.policy}</p>
            <div className="trust-points">
              <span>✓ Scoped to your authenticated account</span>
              <span>✓ Newest actions first</span>
              <span>✓ Raw action results are not exposed</span>
              <span>✓ No automatic application submission</span>
              <span>✓ No automatic recruiter email sending</span>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
