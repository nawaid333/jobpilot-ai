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
        <div className="ts-nav-partner" aria-label="Tata Steel concept"><span className="ts-tata-symbol" aria-hidden="true">T</span><span className="ts-tata-wordmark">TATA STEEL</span></div><div className="ts-badge">CONCEPT DEMO</div>
        <Link className="nav-cta" href="/onboarding">Open product ↗</Link>
      </nav>

      <section className="ts-hero shell">
        <div>
          <div className="eyebrow"><span className="pulse" /> Enterprise AI workflow · Jamshedpur</div>
          <h1>JobPilot × <em>Tata Steel</em></h1>
          <p>See how an AI-assisted talent workflow could connect candidate profiles to Tata Steel role requirements, prepare application materials, and keep every high-impact decision under human control.</p>
          <div className="ts-note"><b>PROOF OF CONCEPT</b><span>Conceptual workflow for an innovation discussion — not a Tata Steel partnership or endorsement.</span></div>
        </div>
        <div className="ts-metric"><span className="ts-metric-kicker">AI TALENT MATCHING</span><small>Candidate → role fit</small><strong>94%</strong><span>Demo profile signal alignment</span><div className="ts-mini-bars"><i></i><i></i><i></i></div></div>
      </section>

      <section className="ts-brand-strip"><div className="shell"><div><span className="ts-brand-dot"></span><b>TATA STEEL</b><small>INNOVATION WORKFLOW CONCEPT</small></div><span>JOBPILOT AI × TALENT INTELLIGENCE</span></div></section>

      <section className="ts-visual shell">
        <div className="ts-visual-image">
          <img src="https://etimg.etb2bimg.com/thumb/msid-124618538%2Cwidth-1200%2Cheight-900%2Cresizemode-4/.jpg" alt="Tata Steel plant in Jamshedpur" />
          <div className="ts-image-overlay"></div>
          <div className="ts-image-caption"><span>JAMSHEDPUR</span><b>Industrial talent, connected by AI.</b></div>
          <div className="ts-image-float"><small>LIVE DEMO SIGNAL</small><strong>94%</strong><span>role alignment</span></div>
        </div>
        <div className="ts-visual-copy">
          <small>WHY THIS CONCEPT</small>
          <h2>From candidate data to <em>role intelligence.</em></h2>
          <p>JobPilot turns a candidate's verified experience into structured signals that can be compared with role requirements — giving teams a clearer starting point for human-led hiring decisions.</p>
          <div className="ts-visual-points"><span><b>01</b> Profile intelligence</span><span><b>02</b> Role matching</span><span><b>03</b> Application readiness</span></div>
        </div>
      </section>

      <section className="ts-mission shell">
        <div className="ts-mission-copy">
          <small>THE PROBLEM WE WANT TO SOLVE</small>
          <h2>Good skills should not get lost in a <em>complicated job search.</em></h2>
          <p>Many skilled workers and degree holders can do the work but struggle with the digital hiring process: finding the right opening, understanding requirements, building an ATS-ready CV, writing applications and preparing for interviews.</p>
          <p>JobPilot is designed to turn a person's real skills and experience into a guided path to relevant opportunities.</p>
        </div>
        <div className="ts-segment-grid">
          <div><b>Skilled technicians</b><span>HVAC · Electrical · Mechanical · Maintenance</span></div>
          <div><b>Frontline workforce</b><span>Operators · Technicians · Service · Facilities</span></div>
          <div><b>Degree holders</b><span>Graduates who need help finding role-fit opportunities</span></div>
          <div><b>Freshers</b><span>Skills and education translated into realistic entry-level roles</span></div>
        </div>
      </section>

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

      <section className="ts-product-flow shell">
        <div className="ts-section-head">
          <small>THE FULL JOBPILOT JOURNEY</small>
          <h2>From <em>skill</em> to opportunity.</h2>
        </div>
        <div className="ts-product-grid">
          <article><span>01</span><h3>Profile</h3><p>Capture education, skills, experience, location and goals.</p></article>
          <article><span>02</span><h3>Discover</h3><p>Continuously identify openings that fit the candidate's real profile.</p></article>
          <article><span>03</span><h3>Match</h3><p>Explain why a role is relevant instead of showing generic job lists.</p></article>
          <article><span>04</span><h3>Apply</h3><p>Prepare an ATS-ready CV and role-specific cover letter from verified facts.</p></article>
          <article><span>05</span><h3>Track</h3><p>Keep applications, stages, follow-ups and outcomes in one workflow.</p></article>
          <article><span>06</span><h3>Prepare</h3><p>Start interview practice from the actual role being pursued.</p></article>
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
