"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Application = { id: string; status: string; job: { title: string; company: string; location: string } };
type Question = { id: string; type: string; question: string; why: string };
type Feedback = { score: number | null; verdict: string; strengths: string[]; improvements: string[]; followUp: string };

export default function InterviewPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationId, setApplicationId] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"ai" | "rules" | null>(null);
  const [remainingAi, setRemainingAi] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linkedApplicationId = params.get("applicationId")?.trim() || "";
    if (linkedApplicationId) setApplicationId(linkedApplicationId);

    fetch("/api/applications")
      .then(r => r.json())
      .then(data => {
        const items = Array.isArray(data) ? data : data.applications || [];
        const active = items.filter((a: Application) => !["Rejected", "Offer"].includes(a.status));
        setApplications(active);
        if (linkedApplicationId && active.some((a: Application) => a.id === linkedApplicationId)) {
          setApplicationId(linkedApplicationId);
        } else if (linkedApplicationId) {
          setApplicationId("");
          setError("That application is no longer available for interview practice.");
        }
      })
      .catch(() => setError("Could not load your applications."));
  }, []);

  async function start() {
    if (!applicationId) return;
    setLoading(true); setError(""); setFeedback(null); setIndex(0); setAnswer("");
    try {
      const r = await fetch("/api/interview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationId }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Could not build interview prep.");
      setQuestions(data.questions || []); setMode(data.mode); if (typeof data.remainingAi === "number") setRemainingAi(data.remainingAi);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function review() {
    const q = questions[index];
    if (!q || !answer.trim()) return;
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/interview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationId, mode: "feedback", question: q.question, answer }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Could not review answer.");
      setFeedback(data.feedback); setMode(data.mode); if (typeof data.remainingAi === "number") setRemainingAi(data.remainingAi);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  function next() { setFeedback(null); setAnswer(""); setIndex(i => Math.min(i + 1, questions.length - 1)); }
  const app = applications.find(a => a.id === applicationId);
  const q = questions[index];

  return <main className="interview-page"><nav className="nav shell"><Link className="brand" href="/"><span className="brand-mark">✦</span>JobPilot<span className="brand-ai">AI</span></Link><div className="nav-actions"><Link href="/dashboard">Command Center</Link><Link className="nav-cta" href="/tracker">Tracker ↗</Link></div></nav>
    <section className="interview-shell shell">
      <div className="eyebrow"><span className="pulse"/> Interview coach</div>
      <h1>Walk into the interview <em>prepared.</em></h1>
      <p className="interview-lede">Practice against the actual job description and your documented career profile. Get feedback on evidence, structure and clarity — without fabricated achievements.</p>

      <div className="interview-grid">
        <aside className="interview-sidebar">
          <div className="kicker">TARGET APPLICATION</div>
          <select value={applicationId} onChange={e => { setApplicationId(e.target.value); setQuestions([]); setFeedback(null); setMode(null); setRemainingAi(null); }}>
            <option value="">Choose an application</option>
            {applications.map(a => <option key={a.id} value={a.id}>{a.job.title} · {a.job.company}</option>)}
          </select>
          {app && <div className="interview-target"><strong>{app.job.title}</strong><span>{app.job.company} · {app.job.location}</span><small>{app.status}</small></div>}
          <button className="button primary" disabled={!applicationId || loading} onClick={start}>{loading && !q ? "Building…" : "Build my prep →"}</button>
          {remainingAi !== null && <div className="ai-usage"><b>{remainingAi}</b> AI practice credits remaining this month</div>}
          <p className="truth-note">JobPilot uses only saved application and profile facts. It does not predict the exact interview questions.</p>
        </aside>

        <section className="interview-main">
          {!q ? <div className="interview-empty"><div className="kicker">PRACTICE MODE</div><h2>Choose a role to start.</h2><p>You'll get a focused question set, then answer one question at a time and receive evidence-based coaching.</p></div> : <>
            {mode === "rules" && <div className="rules-banner"><strong>Evidence Rules mode</strong><span>AI is unavailable or your AI allowance is used up. You can still practice with the same evidence-first coaching flow.</span></div>}
            <div className="question-head"><div><span>QUESTION {index + 1} / {questions.length}</span><b>{q.type}</b></div><div className="progress"><i style={{ width: `${((index + 1) / questions.length) * 100}%` }}/></div></div>
            <div className="question-card"><h2>{q.question}</h2><p><strong>Why this matters:</strong> {q.why}</p></div>
            <textarea className="answer-box" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Write your answer as if you were speaking to the interviewer…" />
            <div className="answer-actions"><button className="button primary" disabled={!answer.trim() || loading} onClick={review}>{loading ? "Reviewing…" : mode === "rules" ? "Review answer →" : "Get AI feedback →"}</button>{feedback && index < questions.length - 1 && <button className="button secondary" onClick={next}>Next question →</button>}</div>
            {feedback && <div className="feedback-card"><div className="feedback-top"><div><div className="kicker">COACH FEEDBACK · {mode === "ai" ? "AI" : "EVIDENCE RULES"}</div><h3>{feedback.verdict}</h3></div>{feedback.score != null && <strong>{feedback.score}<small>/100</small></strong>}</div><div className="feedback-cols"><div><b>WHAT WORKED</b><ul>{feedback.strengths?.map((x,i)=><li key={i}>{x}</li>)}</ul></div><div><b>IMPROVE</b><ul>{feedback.improvements?.map((x,i)=><li key={i}>{x}</li>)}</ul></div></div><div className="follow-question"><b>Coach follow-up</b><span>{feedback.followUp}</span></div></div>}
          </>}
        </section>
      </div>
      {error && <div className="interview-error">{error}</div>}
      <div className="interview-trust"><span>✓ Evidence-based</span><span>✓ No invented experience</span><span>✓ No hiring guarantees</span><span>✓ Your answers stay in this session</span></div>
    </section></main>;
}
