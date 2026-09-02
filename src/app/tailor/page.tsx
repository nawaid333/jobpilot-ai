"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Package = { id?: string; fitSummary: string; tailoredSummary: string; resumeEdits: { section: string; original: string; suggested: string; reason: string }[]; coverLetter: string; missingRequirements: string[]; applicationRecommendation: string };
type Job = { id: string; title: string; company: string; location: string; description: string; skills: string[]; mode: string; level: string; url?: string };

export default function TailorPage() {
  const params = useSearchParams();
  const [profile, setProfile] = useState<any>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [applicationId, setApplicationId] = useState("");
  const [result, setResult] = useState<Package | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/profile");
      if (r.status === 401) { location.href = "/login"; return; }
      const d = await r.json();
      if (d.profile) setProfile(d.profile);
      const id = params.get("job");
      if (!id) return;
      const a = await fetch("/api/applications");
      if (!a.ok) return;
      const x = await a.json();
      const found = x.applications.find((v: any) => v.id === id || v.jobId === id || v.job?.id === id);
      if (!found) return;
      setApplicationId(found.id);
      setJob(found.job);
      setSubmitted(found.status === "Applied" || found.status === "Interview" || found.status === "Offer");
      if (found.tailoredApplication) {
        setResult({
          id: found.tailoredApplication.id,
          fitSummary: "Previously generated tailored package.",
          tailoredSummary: found.tailoredApplication.tailoredSummary,
          resumeEdits: Array.isArray(found.tailoredApplication.resumeEdits) ? found.tailoredApplication.resumeEdits : [],
          coverLetter: found.tailoredApplication.coverLetter,
          missingRequirements: Array.isArray(found.tailoredApplication.missingRequirements) ? found.tailoredApplication.missingRequirements : [],
          applicationRecommendation: found.tailoredApplication.recommendation,
        });
      }
    })();
  }, [params]);

  async function generate() {
    if (!job) return;
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/tailor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId: job.id }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not tailor application.");
      setResult(d.result);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not tailor application."); }
    finally { setLoading(false); }
  }

  async function markSubmitted() {
    if (!applicationId || !job?.url) return;
    setSubmitting(true); setError("");
    try {
      const r = await fetch("/api/applications/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationId, confirmed: true }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not record submission.");
      setSubmitted(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not record submission."); }
    finally { setSubmitting(false); }
  }

  return <main className="analyze-page tailor-page">
    <nav className="nav shell"><Link className="brand" href="/"><span className="brand-mark">✦</span>JobPilot<span className="brand-ai">AI</span></Link><span className="analyze-nav-label">TAILORED APPLICATION</span><Link className="nav-cta" href="/jobs">Back to jobs ↗</Link></nav>
    <section className="tailor-shell shell">
      <div className="profile-header"><div><div className="eyebrow"><span className="pulse"/> Truth-first application</div><h1>Make the application <em>fit.</em></h1><p>JobPilot rewrites and reframes only what your profile can genuinely support. No invented achievements or keywords.</p></div></div>
      {!job ? <div className="empty-profile"><h2>Save a job first.</h2><p>Choose a saved opportunity from your Jobs page before generating a tailored package.</p><Link className="button primary" href="/jobs">Find a job ↗</Link></div> : <>
        <div className="selected-job"><small>SELECTED OPPORTUNITY</small><h2>{job.title}</h2><p>{job.company} · {job.location} · {job.mode}</p><div className="job-tags">{job.skills?.map(x => <span key={x}>{x}</span>)}</div></div>
        {!result ? <div className="generate-card"><h2>Ready to tailor this application?</h2><p>You'll get a targeted professional summary, suggested resume edits, a cover letter and a clear list of missing requirements.</p>{error && <div className="source-notice error">{error}</div>}<button className="button primary" onClick={generate} disabled={loading || !profile}>{loading ? "Building application package…" : "Tailor my application ↗"}</button></div> : <div className="tailor-results">
          <div className="recommendation"><small>RECOMMENDATION</small><strong>{result.applicationRecommendation.toUpperCase()}</strong><p>{result.fitSummary}</p></div>
          <article className="profile-card profile-wide"><small className="kicker">TAILORED PROFESSIONAL SUMMARY</small><p>{result.tailoredSummary}</p></article>
          <article className="profile-card profile-wide"><small className="kicker">RESUME EDITS</small>{result.resumeEdits.map((x, i) => <div className="edit-row" key={i}><b>{x.section}</b><div><small>CHANGE TO</small><p>{x.suggested}</p><small>WHY</small><span>{x.reason}</span></div></div>)}</article>
          <article className="profile-card profile-wide"><small className="kicker">COVER LETTER</small><textarea readOnly value={result.coverLetter}/></article>
          <article className="profile-card profile-wide"><small className="kicker">MISSING REQUIREMENTS</small>{result.missingRequirements.length ? <ul>{result.missingRequirements.map(x => <li key={x}>{x}</li>)}</ul> : <p>No obvious missing requirements from the supplied job/profile data.</p>}</article>

          <article className="profile-card profile-wide"><small className="kicker">SUBMIT APPLICATION</small>
            {submitted ? <><h2>✓ Application marked as submitted</h2><p>Your tracker is now in the Applied stage. You can continue tracking the outcome from your application tracker.</p><div className="profile-actions"><Link className="button primary" href="/tracker">Open application tracker ↗</Link>{job.url && <a className="button secondary" href={job.url} target="_blank" rel="noreferrer">Open listing ↗</a>}</div></> : <><h2>Review, submit, then confirm.</h2><p>JobPilot does not silently submit applications or bypass a job site's controls. Open the authorized listing, complete the employer's application using your reviewed materials, then confirm here so the tracker records the submission.</p>{job.url ? <div className="profile-actions"><a className="button primary" href={job.url} target="_blank" rel="noreferrer">Open application ↗</a><button className="button secondary" onClick={markSubmitted} disabled={submitting}>{submitting ? "Recording submission…" : "I submitted this application"}</button></div> : <p className="truth-note">No application URL is available for this job.</p>}</>}
          </article>

          {error && <div className="source-notice error">{error}</div>}
          <div className="profile-actions"><button className="button secondary" onClick={() => navigator.clipboard?.writeText(result.coverLetter)}>Copy cover letter</button>{job.url && <a className="button secondary" href={job.url} target="_blank" rel="noreferrer">Open original listing ↗</a>}<button className="button secondary" onClick={() => setResult(null)}>Regenerate</button></div>
          <p className="truth-note">{result.id ? "Saved package loaded from your application tracker. " : "Package saved to your application tracker. "}Review every suggested change before submitting. JobPilot assists with preparation; it does not guarantee an interview or hiring outcome.</p>
        </div>}
      </>}
    </section>
    <footer className="analyze-footer shell"><span>✦ JobPilot AI</span><span>Tailored application</span><span>Truth over keyword stuffing.</span></footer>
  </main>;
}
