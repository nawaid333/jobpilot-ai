const Arrow = () => <span aria-hidden="true">↗</span>;
const Check = () => <span aria-hidden="true">✓</span>;

const features = [
  { n: "01", title: "Understand your CV", text: "AI turns your CV into a structured career profile covering skills, experience, strengths and gaps." },
  { n: "02", title: "Find better-fit jobs", text: "Match opportunities against your real experience, preferences and target roles." },
  { n: "03", title: "Tailor every application", text: "Create role-specific CV improvements and cover letters without inventing facts about you." },
];

export default function Home() {
  return <main>
    <nav className="nav shell"><a className="brand" href="#top"><span className="brand-mark">✦</span>JobPilot<span className="brand-ai">AI</span></a><div className="nav-links"><a href="#how">How it works</a><a href="#features">Features</a><a href="#pricing">Pricing</a></div><a className="nav-cta" href="/analyze">Get started <Arrow /></a></nav>

    <section className="hero shell" id="top">
      <div className="hero-copy"><div className="eyebrow"><span className="pulse" /> AI-powered job search</div><h1>Stop searching.<br /><em>Start landing.</em></h1><p className="hero-text">JobPilot AI turns your CV into a smarter job search — matching you with relevant opportunities and helping you apply with confidence.</p><div className="hero-actions" id="start"><a className="button primary" href="/analyze">Analyze my CV <Arrow /></a><a className="button secondary" href="#how">See how it works</a></div><div className="trust-row"><span><Check /> No fake experience</span><span><Check /> Human-in-control</span><span><Check /> Built for real fit</span></div></div>
      <div className="hero-visual"><div className="glow" /><div className="dashboard"><div className="dash-top"><b>✦ JobPilot</b><span>● LIVE</span></div><div className="dash-heading"><div><small>Your job search</small><strong>Good morning 👋</strong></div><div className="avatar">N</div></div><div className="stats"><div><small>CV score</small><b>87<span>/100</span></b></div><div><small>Strong matches</small><b>24</b></div><div><small>Applications</small><b>8</b></div></div><div className="match-title"><b>Top matches</b><small>View all →</small></div>{["Operations Manager|Global technology · Remote|96%","Project Coordinator|AI & SaaS · Berlin, DE|92%","Workforce Analyst|Enterprise · Amsterdam, NL|89%"].map((item) => { const [title, meta, score] = item.split("|"); return <div className="job" key={title}><div className="company-icon">{title[0]}</div><div className="job-main"><b>{title}</b><small>{meta}</small></div><strong className="score">{score}</strong></div>; })}</div></div>
    </section>

    <section className="proof shell"><small>ONE WORKFLOW. LESS CHAOS.</small><div><span>CV</span><i>→</i><span>AI PROFILE</span><i>→</i><span>JOB MATCH</span><i>→</i><span>TAILORED APPLY</span><i>→</i><span>TRACK</span></div></section>

    <section className="section shell" id="how"><div className="section-head"><div><small className="kicker">HOW IT WORKS</small><h2>Your career, <em>on autopilot.</em></h2></div><p>One profile. One intelligent workflow. Every application grounded in what you can actually do.</p></div><div className="feature-grid" id="features">{features.map((f) => <article className="feature" key={f.n}><span className="feature-num">{f.n}</span><div className="feature-icon">✦</div><h3>{f.title}</h3><p>{f.text}</p><a href="/analyze">Explore <Arrow /></a></article>)}</div></section>

    <section className="statement shell"><div><small className="kicker">THE JOBPILOT PROMISE</small><h2>More relevant applications.<br /><em>Less wasted effort.</em></h2><p>JobPilot is designed to help you make better career moves — not just send more applications.</p></div></section>

    <section className="pricing shell" id="pricing"><div className="section-head"><div><small className="kicker">SIMPLE PRICING</small><h2>Start free. <em>Upgrade when ready.</em></h2></div><p>We will keep the first version focused on useful outcomes, then add automation as the product matures.</p></div><div className="price-card"><div><small>FREE</small><strong>₹0</strong><span>/ forever</span></div><div className="price-features"><span><Check /> CV analysis</span><span><Check /> ATS insights</span><span><Check /> 5 job matches / day</span></div><a className="button secondary" href="/analyze">Get started</a></div></section>

    <footer className="footer shell"><a className="brand" href="#top"><span className="brand-mark">✦</span>JobPilot<span className="brand-ai">AI</span></a><span>AI job search, built around you.</span><span>© 2026 JobPilot AI</span></footer>
  </main>;
}
