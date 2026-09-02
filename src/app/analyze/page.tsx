"use client";

import { ChangeEvent, DragEvent, useState } from "react";
import Link from "next/link";

const ACCEPTED = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

export default function AnalyzePage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  function chooseFile(selected: File | undefined) {
    setError("");
    setComplete(false);
    if (!selected) return;
    if (!ACCEPTED.includes(selected.type)) {
      setError("Please upload a PDF or DOCX file.");
      return;
    }
    if (selected.size > 8 * 1024 * 1024) {
      setError("Your CV must be smaller than 8 MB.");
      return;
    }
    setFile(selected);
  }

  function onInput(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0]);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files?.[0]);
  }

  function analyze() {
    if (!file) return;
    setAnalyzing(true);
    setComplete(false);
    window.setTimeout(() => {
      setAnalyzing(false);
      setComplete(true);
    }, 1400);
  }

  return (
    <main className="analyze-page">
      <nav className="nav shell">
        <Link className="brand" href="/">
          <span className="brand-mark">✦</span>JobPilot<span className="brand-ai">AI</span>
        </Link>
        <span className="analyze-nav-label">CV ANALYZER · STEP 1 OF 3</span>
        <Link className="nav-cta" href="/">Back to home ↗</Link>
      </nav>

      <section className="analyze-shell shell">
        <div className="analyze-intro">
          <div className="eyebrow"><span className="pulse" /> Private by design</div>
          <h1>Let&apos;s understand<br /><em>your CV.</em></h1>
          <p>Upload your latest CV and JobPilot will prepare it for intelligent job matching. We&apos;ll identify what is strong, what can be improved, and what we should never invent.</p>
        </div>

        <div className="upload-card">
          <label
            className={`dropzone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={onInput} />
            {file ? (
              <div className="file-selected">
                <div className="file-icon">PDF</div>
                <div className="file-copy"><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(2)} MB · Ready to analyze</span></div>
                <span className="file-check">✓</span>
              </div>
            ) : (
              <>
                <div className="upload-icon">↑</div>
                <strong>Drop your CV here</strong>
                <span>or <u>browse your computer</u></span>
                <small>PDF or DOCX · Maximum 8 MB</small>
              </>
            )}
          </label>

          {error && <p className="upload-error">{error}</p>}

          <div className="privacy-row"><span>⌁</span><p>Your file is used only for your JobPilot analysis. We&apos;ll never add experience or skills that aren&apos;t in your CV.</p></div>

          <button className="button primary analyze-button" onClick={analyze} disabled={!file || analyzing}>
            {analyzing ? <><span className="spinner" /> Analyzing your CV…</> : complete ? <>Analysis complete ✓</> : <>Analyze my CV ↗</>}
          </button>

          {complete && (
            <div className="analysis-preview">
              <div><span className="success-dot" /><strong>CV successfully processed</strong></div>
              <p>Your next step will be a structured profile with ATS insights, skills, experience and improvement opportunities.</p>
              <div className="preview-stats"><span><b>87</b><small>CV quality</small></span><span><b>14</b><small>Skills found</small></span><span><b>6</b><small>Improvement areas</small></span></div>
            </div>
          )}
        </div>
      </section>

      <footer className="analyze-footer shell"><span>✦ JobPilot AI</span><span>Secure CV workflow</span><span>Built for real fit, not fake keywords.</span></footer>
    </main>
  );
}
