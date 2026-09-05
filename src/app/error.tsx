"use client";

import Link from "next/link";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="analyze-page">
      <nav className="nav shell">
        <Link className="brand" href="/"><span className="brand-mark">✦</span>JobPilot<span className="brand-ai">AI</span></Link>
        <span className="analyze-nav-label">WORKSPACE ERROR</span>
      </nav>
      <section className="shell" style={{ paddingTop: 72 }}>
        <div className="empty-profile">
          <div className="eyebrow"><span className="pulse" /> Recoverable error</div>
          <h2>Something interrupted this workspace.</h2>
          <p>Your data has not been intentionally changed. Try the page again, or return to the dashboard and continue from there.</p>
          <div className="profile-actions">
            <button className="button primary" onClick={() => reset()}>Try again ↻</button>
            <Link className="button secondary" href="/dashboard">Back to dashboard →</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
