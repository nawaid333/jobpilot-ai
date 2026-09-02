"use client";

import { ChangeEvent, useState } from "react";
import Link from "next/link";

type Analysis = {
  atsScore: number;
  candidate: { name: string | null; headline: string | null; location: string | null };
  summary: string;
  skills: string[];
  experience: { role: string; company: string; duration: string; highlights: string[] }[];
  education: { degree: string; institution: string; year: string }[];
  strengths: string[];
  improvements: { priority: "high" | "medium" | "low"; issue: string; recommendation: string }[];
  atsChecks: { name: string; status: "pass" | "warning" | "fail"; detail: string }[];
  targetRoles: string[];
};

const ACCEPTED = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

export default function AnalyzePage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function chooseFile(selected: File | undefined) {
    setError(""); setAnalysis(null); setSaved(false);
    if (!selected) return;
    if (!ACCEPTED.includes(selected.type)) return setError("Please upload a PDF or DOCX file.");
    if (selected.size > 8 * 1024 * 1024) return setError("Your CV must be smaller than 8 MB.");
    setFile(selected);
  }

  function onInput(event: ChangeEvent<HTMLInputElement>) { chooseFile(event.target.files?.[0]); }

  async function analyze() {
    if (!file) return;
    setAnalyzing(true); setError("");
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetch("/api/analyze-cv", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed.");
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally { setAnalyzing(false); }
  }

  function saveProfile() {
    if (!analysis) return;
    localStorage.setItem("jobpilot-career-profile", JSON.stringify({ ...analysis, savedAt: new Date().toISOString() }));
    setSaved(true);
  }

  return (
    <main className="analyze-page">
      <nav className="nav shell">
        <Link className="brand" href="/"><span className="brand-mark">✦</span>JobPilot<span className="brand-ai">AI</span></Link>
        <span className="analyze-nav-label">CV INTELLIGENCE</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}><Link className="nav-cta" href="/profile">Career profile ↗</Link><Link className="nav-cta" href="/">Home ↗</Link></div>
      </nav>

      {!analysis ? (
        <section className="analyze-shell shell">
          <div className="analyze-intro">
            <div className="eyebrow"><span className="pulse" /> Private by design</div>
            <h1>Know exactly how strong<br /><em>your CV is.</em></h1>
            <p>Upload your CV and JobPilot will extract your real career information, evaluate ATS readiness, and identify the highest-impact improvements.</p>
          </div>
          <div className="upload-card">
            <label className={`dropzone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files?.[0]); }}>
              <input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={onInput} />
              {file ? <div className="file-selected"><div className="file-icon">CV</div><div className="file-copy"><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(2)} MB · Ready to analyze</span></div><span className="file-check">✓</span></div> : <><div className="upload-icon">↑</div><strong>Drop your CV here</strong><span>or <u>browse your computer</u></span><small>PDF or DOCX · Maximum 8 MB</small></>}
            </label>
            {error && <p className="upload-error">{error}</p>}
            <div className="privacy-row"><span>⌁</span><p>Your CV is sent to the configured AI analysis service only when you click analyze. JobPilot never invents experience, skills, education, or achievements.</p></div>
            <button className="button primary analyze-button" onClick={analyze} disabled={!file || analyzing}>{analyzing ? <><span className="spinner" /> Analyzing your CV…</> : <>Analyze my CV ↗</>}</button>
          </div>
        </section>
      ) : (
        <section className="results-shell shell">
          <div className="results-top"><div><div className="kicker">YOUR CV ANALYSIS</div><h1>{analysis.candidate.name || "Candidate"}</h1><p>{analysis.candidate.headline || "Career profile extracted from your CV"}{analysis.candidate.location ? ` · ${analysis.candidate.location}` : ""}</p></div><div className="score-card"><small>ATS READINESS</small><strong>{analysis.atsScore}<span>/100</span></strong></div></div>
          <div className="result-grid">
            <article className="result-panel wide"><small className="kicker">SUMMARY</small><p>{analysis.summary}</p></article>
            <article className="result-panel"><small className="kicker">TARGET ROLES</small><div className="chips">{analysis.targetRoles.map((role) => <span key={role}>{role}</span>)}</div></article>
            <article className="result-panel"><small className="kicker">SKILLS FOUND</small><div className="chips">{analysis.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></article>
            <article className="result-panel wide"><small className="kicker">ATS CHECKS</small>{analysis.atsChecks.map((check) => <div className="check-row" key={check.name}><b>{check.name}</b><span className={`status ${check.status}`}>{check.status}</span><small>{check.detail}</small></div>)}</article>
            <article className="result-panel wide"><small className="kicker">HIGHEST-IMPACT IMPROVEMENTS</small>{analysis.improvements.map((item, index) => <div className="improvement" key={`${item.issue}-${index}`}><span className={`priority ${item.priority}`}>{item.priority}</span><div><b>{item.issue}</b><p>{item.recommendation}</p></div></div>)}</article>
            <article className="result-panel wide"><small className="kicker">STRENGTHS</small><ul>{analysis.strengths.map((strength) => <li key={strength}>✓ {strength}</li>)}</ul></article>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="button primary" onClick={saveProfile}>{saved ? "✓ Saved to Career Profile" : "Save to Career Profile ↗"}</button>
            {saved && <Link className="button secondary" href="/profile">Open Career Profile ↗</Link>}
            <button className="button secondary" onClick={() => { setAnalysis(null); setFile(null); setSaved(false); }}>Analyze another CV</button>
          </div>
        </section>
      )}
      <footer className="analyze-footer shell"><span>✦ JobPilot AI</span><span>Private CV workflow</span><span>Built for real fit, not fake keywords.</span></footer>
    </main>
  );
}
