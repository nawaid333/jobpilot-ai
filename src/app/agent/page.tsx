"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AgentBriefMetrics } from "@/components/agent-brief-metrics";
import { getAgentBriefMetrics } from "@/lib/agent-brief-metrics";
import { briefLabel, buildDailyBrief } from "@/lib/agent-daily-brief";
import {
  DEFAULT_AGENT_BRIEF_PREFERENCES,
  dismissAgentBriefAction,
  isAgentBriefHidden,
  normalizeAgentBriefPreferences,
  readAgentBriefPreferences,
  snoozeAgentBriefAction,
  type AgentBriefPreferenceState,
} from "@/lib/agent-brief-preferences";

const FOLLOW_UP_OPTIONS = [1, 3, 7, 14];
const BRIEF_PREFERENCES_KEY = "jobpilot:agent-brief-preferences";

export default function AgentPage() {
  const [data, setData] = useState<any>(null), [error, setError] = useState(""), [busy, setBusy] = useState(""), [message, setMessage] = useState(""), [followUpDays, setFollowUpDays] = useState(3);
  const [briefPreferences, setBriefPreferences] = useState<AgentBriefPreferenceState>(DEFAULT_AGENT_BRIEF_PREFERENCES);
  const actionKeys = useRef(new Map<string, string>());

  async function load() { setError(""); const res = await fetch("/api/agent", { cache: "no-store" }); if (!res.ok) { setError("Could not load the agent queue."); return; } setData(await res.json()); }
  async function syncBriefPreferences(next: AgentBriefPreferenceState) {
    try {
      const res = await fetch("/api/agent/brief-preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      if (!res.ok) throw new Error("Preference sync failed");
    } catch { setMessage("Saved on this browser. We’ll retry account sync on your next change."); }
  }
  function saveBriefPreferences(next: AgentBriefPreferenceState) { const normalized = normalizeAgentBriefPreferences(next); setBriefPreferences(normalized); window.localStorage.setItem(BRIEF_PREFERENCES_KEY, JSON.stringify(normalized)); void syncBriefPreferences(normalized); }
  function dismissBriefAction(actionId: string) { saveBriefPreferences(dismissAgentBriefAction(briefPreferences, actionId)); }
  function snoozeBriefAction(actionId: string) { const until = new Date(Date.now() + 24 * 60 * 60 * 1000); saveBriefPreferences(snoozeAgentBriefAction(briefPreferences, actionId, until)); }
  async function loadBriefPreferences() {
    const local = readAgentBriefPreferences(window.localStorage.getItem(BRIEF_PREFERENCES_KEY));
    try {
      const res = await fetch("/api/agent/brief-preferences", { cache: "no-store" });
      if (!res.ok) throw new Error("Preference load failed");
      const remote = normalizeAgentBriefPreferences(await res.json());
      const merged = normalizeAgentBriefPreferences({ dismissed: [...remote.dismissed, ...local.dismissed], snoozedUntil: { ...remote.snoozedUntil, ...local.snoozedUntil } });
      setBriefPreferences(merged);
      window.localStorage.setItem(BRIEF_PREFERENCES_KEY, JSON.stringify(merged));
      if (JSON.stringify(merged) !== JSON.stringify(remote)) void syncBriefPreferences(merged);
    } catch { setBriefPreferences(local); }
  }
  async function execute(action: any, actionType = action.type) {
    if (!action.applicationId) return;
    const operationKey = `${action.id}:${actionType}`; setBusy(operationKey); setMessage(""); setError("");
    const key = actionKeys.current.get(operationKey) || crypto.randomUUID(); actionKeys.current.set(operationKey, key);
    try {
      const res = await fetch("/api/agent/execute", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify({ action: actionType, applicationId: action.applicationId, followUpDays }) });
      const result = await res.json(); if (!res.ok) { setError(result.error || "Action failed."); return; }
      setMessage(result.message || "Action completed.");
      if (result.redirect && actionType !== "complete-follow-up" && actionType !== "snooze-follow-up" && actionType !== "follow-up") window.location.href = result.redirect; else await load();
    } finally { setBusy(""); }
  }
  useEffect(() => { load(); void loadBriefPreferences(); }, []);
  const label = (type: string) => ({ tailor: "Prepare", "follow-up": "Schedule follow-up", "complete-follow-up": "Mark follow-up done", "snooze-follow-up": "Snooze follow-up", interview: "Start interview prep", assessment: "Open assessment", offer: "Review offer" }[type] || "Open");
  const urgency = (a: any) => a.type === "follow-up" ? (a.title.includes("Overdue") ? "OVERDUE" : a.title.includes("today") ? "TODAY" : "UPCOMING") : a.priority >= 5 ? "HIGH PRIORITY" : a.priority >= 4 ? "HIGH" : "NORMAL";
  const button = (action: any, type = action.type, secondary = false) => <button className={secondary ? "secondary-button" : "primary-button"} disabled={busy === `${action.id}:${type}`} onClick={() => execute(action, type)}>{busy === `${action.id}:${type}` ? (type === "follow-up" ? "Scheduling…" : type === "complete-follow-up" ? "Completing…" : type === "snooze-follow-up" ? "Snoozing…" : "Opening…") : label(type)}</button>;
  const followUpControls = (action: any) => <div className="trust-points">{button(action, "complete-follow-up")} {button(action, "snooze-follow-up", true)}</div>;
  const controls = (action: any) => action.type === "follow-up" && action.dueAt ? followUpControls(action) : button(action);
  const actionIds = useMemo(() => data ? data.actions.map((action: any) => action.id) : [], [data]);
  const briefMetrics = useMemo(() => getAgentBriefMetrics(actionIds, briefPreferences), [actionIds, briefPreferences]);
  const brief = useMemo(() => data ? buildDailyBrief(data.actions.filter((action: any) => !isAgentBriefHidden(action.id, briefPreferences)), 3) : [], [data, briefPreferences]);

  return <main className="page-shell"><section className="page-hero"><div><p className="eyebrow">JOBPILOT AGENT</p><h1>Next best actions for your job search.</h1><p className="muted">One queue for applications, recruiting emails, follow-ups, interviews, and preparation.</p></div><div className="trust-points"><button className="secondary-button" onClick={load}>Refresh queue</button><Link className="secondary-button" href="/agent/history">Activity history</Link></div></section>{error && <div className="error-box">{error}</div>}{message && <div className="success-box">{message}</div>}{!data && !error && <div className="panel">Loading your agent queue…</div>}{data && <><section className="panel daily-brief"><div className="section-heading"><div><p className="eyebrow">TODAY'S BRIEF</p><h2>Three things worth doing next</h2><p className="muted">JobPilot turns the highest-priority actions into a short, actionable plan.</p></div></div><AgentBriefMetrics metrics={briefMetrics} />{brief.length === 0 ? <div className="empty-state"><h3>You’re caught up.</h3><p>No visible priority actions are waiting. Dismissed or snoozed actions remain in your action queue.</p></div> : <div className="brief-list">{brief.map((action: any, index: number) => <article className="brief-card" key={action.id}><div className="brief-rank">{index + 1}</div><div className="action-content"><div className="action-title-row"><h3>{action.title}</h3><span>{briefLabel(action.priority)}</span></div><strong>{action.company}</strong><p>{action.reason}</p>{action.dueAt && <small>Due {new Date(action.dueAt).toLocaleDateString()}</small>}<div className="trust-points"><button className="secondary-button" onClick={() => snoozeBriefAction(action.id)}>Snooze 24h</button><button className="secondary-button" onClick={() => dismissBriefAction(action.id)}>Dismiss</button></div></div>{action.applicationId && controls(action)}</article>)}</div>}</section><section className="stats-grid"><div className="stat-card"><span>Active applications</span><strong>{data.summary.activeApplications}</strong></div><div className="stat-card"><span>Needs attention</span><strong>{data.summary.needsAttention}</strong></div><div className="stat-card"><span>Prepared packages</span><strong>{data.summary.prepared}</strong></div><div className="stat-card"><span>Inbox signals</span><strong>{data.summary.inboxSignals}</strong></div></section><section className="panel"><div className="section-heading"><div><p className="eyebrow">ACTION QUEUE</p><h2>What should happen next</h2><p className="muted">Prioritized by stage, urgency, recorded follow-up dates, and recruiting signals.</p></div></div>{data.actions.length === 0 ? <div className="empty-state"><h3>You’re caught up.</h3><p>No high-priority recruiting actions were detected from your current workspace.</p></div> : <div className="action-list">{data.actions.map((action: any) => <article className="action-card" key={action.id}><div className="action-priority">P{action.priority}</div><div className="action-content"><div className="action-title-row"><h3>{action.title}</h3><span>{urgency(action)}</span></div><strong>{action.company}</strong><p>{action.reason}</p>{action.dueAt && <small>Due {new Date(action.dueAt).toLocaleDateString()}</small>}</div>{action.applicationId ? controls(action) : <a className="primary-button" href="/intelligence">Review</a>}</article>)}</div>}</section><section className="panel"><div className="section-heading"><div><p className="eyebrow">FOLLOW-UP TIMING</p><h2>Choose when the Agent should remind you</h2><p className="muted">The Agent schedules a reminder only. You remain responsible for reviewing and contacting the recruiter.</p></div></div><div className="trust-points">{FOLLOW_UP_OPTIONS.map(days => <button key={days} className={followUpDays === days ? "primary-button" : "secondary-button"} onClick={() => setFollowUpDays(days)}>{days === 1 ? "Tomorrow" : `${days} days`}</button>)}</div><p className="muted">Selected: {followUpDays === 1 ? "tomorrow" : `in ${followUpDays} days`}. This applies to new or snoozed follow-ups.</p></section><section className="panel trust-panel"><p className="eyebrow">CONTROL & TRUST</p><h2>The agent assists. You stay in control.</h2><p>{data.policy}</p><div className="trust-points"><span>✓ Uses only facts in your workspace</span><span>✓ Surfaces ambiguous email matches for review</span><span>✓ No automatic email sending</span><span>✓ No automatic application submission</span></div></section></>}</main>;
}
