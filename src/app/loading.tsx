export default function Loading() {
  return (
    <main className="analyze-page">
      <nav className="nav shell">
        <span className="brand"><span className="brand-mark">✦</span>JobPilot<span className="brand-ai">AI</span></span>
        <span className="analyze-nav-label">WORKSPACE</span>
      </nav>
      <section className="shell" style={{ paddingTop: 72 }}>
        <div className="empty-profile" aria-live="polite">
          <div className="eyebrow"><span className="pulse" /> Preparing workspace</div>
          <h2>Loading your JobPilot workspace…</h2>
          <p>Getting your profile, applications and AI tools ready.</p>
        </div>
      </section>
    </main>
  );
}
