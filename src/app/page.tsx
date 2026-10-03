const Arrow = () => <span aria-hidden="true">→</span>;
const Check = () => <span aria-hidden="true">✓</span>;

const steps = [
  { n: "01", title: "Build your profile", text: "Turn your CV into a structured career profile grounded in your real experience." },
  { n: "02", title: "Find relevant jobs", text: "Discover opportunities that fit your skills, experience and target roles." },
  { n: "03", title: "Tailor with AI", text: "Create job-specific application materials without inventing experience." },
  { n: "04", title: "Track & act", text: "Keep applications organized and get useful next-step guidance." },
];

const features = [
  { icon: "⌕", title: "Smart job matching", text: "Focus your search on roles that align with your actual profile." },
  { icon: "✦", title: "AI application tailoring", text: "Adapt your CV and application for each opportunity in seconds." },
  { icon: "▥", title: "Application tracking", text: "Keep your pipeline, statuses and follow-ups in one place." },
  { icon: "◆", title: "AI career guidance", text: "Get explainable insights for follow-ups, interviews and next steps." },
];

export default function Home() {
  return (
    <main className="premium-landing">
      <nav className="nav shell premium-nav">
        <a className="brand" href="#top">
          <img className="brand-logo" src="/jobpilot-mark.svg" alt="JobPilot AI" />
          <span>JobPilot<span className="brand-ai">AI</span></span>
        </a>
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
        </div>
        <div className="premium-nav-actions">
          <a className="premium-signin" href="/login">Sign in</a>
          <a className="premium-nav-cta" href="/onboarding">Get started <Arrow /></a>
        </div>
      </nav>

      <section className="premium-hero shell" id="top">
        <div className="premium-hero-copy">
          <div className="premium-eyebrow"><span className="premium-pulse" /> YOUR AI CAREER AGENT</div>
          <h1>Find better jobs<br /><em>faster with AI.</em></h1>
          <p>JobPilot helps you discover relevant opportunities, tailor applications with AI, track your progress and get smart next steps — all in one workflow.</p>
          <div className="premium-hero-actions">
            <a className="premium-button premium-primary" href="/onboarding">Get started free <Arrow /></a>
            <a className="premium-button premium-secondary" href="#how">See how it works</a>
          </div>
          <div className="premium-trust">
            <span><Check /> Real experience</span>
            <span><Check /> Human in control</span>
            <span><Check /> Explainable AI</span>
          </div>
        </div>

        <div className="premium-hero-visual" aria-label="JobPilot AI career dashboard preview">
          <div className="premium-orb premium-orb-one" />
          <div className="premium-orb premium-orb-two" />
          <div className="premium-city">
            <i /><i /><i /><i /><i /><i /><i /><i />
          </div>
          <div className="premium-agent-card">
            <div className="premium-card-top"><b>✦ JobPilot AI</b><span>● ACTIVE</span></div>
            <div className="premium-card-title"><small>YOUR AI CAREER AGENT</small><strong>Working for your career.</strong></div>
            <div className="premium-agent-row"><b>01</b><span>Find matching jobs</span><i>✓</i></div>
            <div className="premium-agent-row"><b>02</b><span>Tailor your application</span><i>✓</i></div>
            <div className="premium-agent-row"><b>03</b><span>Track your applications</span><i>✓</i></div>
            <div className="premium-agent-row"><b>04</b><span>Get your next best step</span><i>✦</i></div>
          </div>
          <div className="premium-float premium-float-match"><small>TOP MATCH</small><b>96%</b><span>Operations Manager</span></div>
          <div className="premium-float premium-float-ai"><span>✦</span> AI ready</div>
        </div>
      </section>

      <section className="premium-flow-strip">
        <div className="shell">
          <span>ONE CAREER WORKFLOW</span>
          <b>CV</b><i>→</i><b>AI PROFILE</b><i>→</i><b>JOB MATCH</b><i>→</i><b>TAILORED APPLY</b><i>→</i><b>TRACK</b>
        </div>
      </section>

      <section className="premium-section shell" id="how">
        <div className="premium-section-head">
          <div><small>HOW JOBPILOT WORKS</small><h2>Your AI career agent<br /><em>in four simple steps.</em></h2></div>
          <p>From finding the right opportunity to preparing the next move, JobPilot keeps your job search organized and grounded in your real profile.</p>
        </div>
        <div className="premium-steps">
          {steps.map((step) => (
            <article key={step.n}>
              <span>{step.n}</span>
              <div className="premium-step-icon">{step.n === "01" ? "⌕" : step.n === "02" ? "◈" : step.n === "03" ? "▤" : "✦"}</div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="premium-features shell" id="features">
        <div className="premium-section-head">
          <div><small>BUILT FOR THE FULL SEARCH</small><h2>Everything you need<br /><em>to move forward.</em></h2></div>
          <p>One place for discovery, applications, progress and proactive career guidance.</p>
        </div>
        <div className="premium-feature-grid">
          {features.map((feature) => (
            <article key={feature.title}>
              <div className="premium-feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
              <a href="/onboarding">Explore <Arrow /></a>
            </article>
          ))}
        </div>
      </section>

      <section className="premium-statement shell">
        <div>
          <small>THE JOBPILOT PROMISE</small>
          <h2>Less searching.<br /><em>More intentional applying.</em></h2>
          <p>JobPilot is built to help you make better career moves — not simply send more applications.</p>
          <a className="premium-button premium-primary" href="/onboarding">Start your job search <Arrow /></a>
        </div>
        <div className="premium-statement-mark">✦</div>
      </section>

      <section className="premium-pricing shell" id="pricing">
        <div className="premium-section-head">
          <div><small>SIMPLE PRICING</small><h2>Start free.<br /><em>Upgrade when ready.</em></h2></div>
          <p>The first version stays focused on useful outcomes, with more automation added as the product matures.</p>
        </div>
        <div className="premium-price-card">
          <div><small>FREE</small><strong>₹0</strong><span>/ forever</span></div>
          <div className="premium-price-list"><span><Check /> CV analysis</span><span><Check /> ATS insights</span><span><Check /> Job matching</span><span><Check /> Application tracking</span></div>
          <a className="premium-button premium-secondary" href="/onboarding">Get started <Arrow /></a>
        </div>
      </section>

      <footer className="footer shell premium-footer">
        <a className="brand" href="#top"><img className="brand-logo" src="/jobpilot-mark.svg" alt="JobPilot AI" /><span>JobPilot<span className="brand-ai">AI</span></span></a>
        <span>Your AI career agent.</span>
        <span>© 2026 JobPilot AI</span>
      </footer>
    </main>
  );
}
