import Link from "next/link";

const jobs = [
  { title: "Project Coordinator", team: "Capital Projects", location: "Jamshedpur", match: 94, skills: "Project coordination · MIS · Excel · workforce planning" },
  { title: "Workforce Coordinator", team: "Operations", location: "Jamshedpur", match: 91, skills: "Scheduling · manpower · reporting · operations" },
  { title: "MIS / Operations Analyst", team: "Digital & Operations", location: "Jamshedpur", match: 87, skills: "Excel · Power BI · SQL · analytics" },
];

const steps = [
  ["01", "Career profile", "Verified experience and skills extracted from the candidate CV."],
  ["02", "Role matching", "AI compares the profile against role requirements."],
  ["03", "Application pack", "Tailored CV points and a cover letter are prepared from verified facts."],
  ["04", "Human review", "Candidate reviews and submits through the employer's permitted channel."],
];

export default function TataSteelDemo() {
  return (
    <main className="ts-demo">
      <nav className="nav shell">
        <Link className="brand" href="/">
          <img className="brand-logo" src="/jobpilot-mark.svg" alt="JobPilot AI" /><span>JobPilot<span className="brand-ai">AI</span></span>
        </Link>
        <div className="ts-nav-partner"><img className="ts-tata-logo" src="https://upload.wikimedia.org/wikipedia/commons/5/5d/Tata_Steel_Logo.svg" alt="Tata Steel" /></div><div className="ts-badge">CONCEPT DEMO</div>
        <Link className="nav-cta" href="/onboarding">Open product ↗</Link>
      </nav>

      <section className="ts-hero shell">
        <div>
          <div className="eyebrow"><span className="pulse" /> Enterprise AI workflow</div>
          <div className="ts-partner-brand" aria-label="Tata Steel demo">
            <span className="ts-tata-mark" aria-hidden="true"><i></i></span>
            <span><b>TATA STEEL</b><small>DEMO EXPERIENCE</small></span>
          </div>
          <h1>JobPilot × <em>Tata Steel</em></h1>
          <p>See how an AI-assisted talent workflow could connect candidate profiles to Tata Steel role requirements, prepare application materials, and keep every high-impact decision under human control.</p>
          <div className="ts-note"><b>PROOF OF CONCEPT</b><span>Conceptual workflow for an innovation discussion — not a Tata Steel partnership or endorsement.</span></div>
        </div>
        <div className="ts-metric"><span className="ts-metric-kicker">AI TALENT MATCHING</span><small>Candidate → role fit</small><strong>94%</strong><span>Demo profile signal alignment</span><div className="ts-mini-bars"><i></i><i></i><i></i></div></div>
      </section>

      <section className="ts-brand-strip"><div className="shell"><div><span className="ts-brand-dot"></span><b>TATA STEEL</b><small>INNOVATION WORKFLOW CONCEPT</small></div><span>JOBPILOT AI × TALENT INTELLIGENCE</span></div></section>

      <section className="ts-workspace shell">
        <div className="ts-panel">
          <div className="ts-panel-head">
            <div><small>DEMO CANDIDATE</small><h2>Career Profile</h2></div>
            <span className="ts-status">VERIFIED INPUTS</span>
          </div>
          <div className="ts-profile">
            <div className="ts-avatar">N</div>
            <div><b>Operations &amp; Project Coordination</b><span>7+ years · workforce coordination · MIS · operations</span></div>
          </div>
          <div className="ts-chips">
            {["Project Coordination","Advanced Excel","MIS Reporting","Workforce Planning","Power BI","SQL"].map((x) => <span key={x}>{x}</span>)}
          </div>
          <div className="ts-rule" />
          <small className="ts-label">MATCH AGAINST</small>
          <div className="ts-jobs">
            {jobs.map((j) => (
              <div className="ts-job-static" key={j.title}>
                <span><b>{j.title}</b><small>{j.team} · {j.location}</small></span>
                <strong>{j.match}%</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="ts-panel">
          <div className="ts-panel-head">
            <div><small>AI MATCH ANALYSIS</small><h2>{jobs[0].title}</h2></div>
            <strong className="ts-score">{jobs[0].match}%</strong>
          </div>
          <p className="ts-copy">Strong alignment across the candidate's verified experience and the selected role.</p>
          <div className="ts-match"><div><span>Role relevance</span><b>94%</b></div><i><u style={{width:"94%"}} /></i></div>
          <div className="ts-match"><div><span>Core skills</span><b>92%</b></div><i><u style={{width:"92%"}} /></i></div>
          <div className="ts-match"><div><span>Experience alignment</span><b>89%</b></div><i><u style={{width:"89%"}} /></i></div>
          <div className="ts-skills"><small>RELEVANT SIGNALS</small><p>{jobs[0].skills}</p></div>
          <Link className="ts-button" href="/onboarding">Open JobPilot application workflow ↗</Link>
        </div>
      </section>

      <section className="ts-flow shell">
        <div className="ts-section-head"><small>CONTROLLED AUTOMATION</small><h2>AI prepares. <em>Humans decide.</em></h2></div>
        <div className="ts-steps">
          {steps.map(([number, title, description]) => (
            <article key={number}><b>{number}</b><h3>{title}</h3><p>{description}</p></article>
          ))}
        </div>
      </section>

      <footer className="footer shell"><span>JobPilot AI · Enterprise proof of concept</span><span>Concept only · No Tata Steel endorsement implied</span></footer>
    </main>
  );
}
