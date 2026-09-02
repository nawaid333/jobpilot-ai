export default function PricingPage() {
  return (
    <main className="shell" style={{ paddingTop: 72, paddingBottom: 80 }}>
      <section style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
        <div className="kicker">JOBPILOT</div>
        <h1 style={{ fontSize: "clamp(38px, 6vw, 64px)", lineHeight: 1.02, margin: "14px 0" }}>Everything is free while we build.</h1>
        <p style={{ color: "var(--muted)", fontSize: 18, maxWidth: 650, margin: "0 auto 36px" }}>
          Use the full JobPilot experience for testing and development. Payments and subscriptions are disabled for now.
        </p>
        <article className="dashboard-recent" style={{ padding: 32, textAlign: "left" }}>
          <div className="kicker">FREE ACCESS</div>
          <div style={{ fontSize: 44, fontWeight: 800, margin: "8px 0" }}>₹0</div>
          <p style={{ color: "var(--muted)" }}>No card required. No checkout. No charges.</p>
          <div style={{ display: "grid", gap: 10, margin: "22px 0" }}>
            <div>✓ Career profile & CV analysis</div>
            <div>✓ Job discovery & matching</div>
            <div>✓ AI tailoring & cover letters</div>
            <div>✓ Application tracker</div>
            <div>✓ Gmail intelligence</div>
            <div>✓ Interview Coach</div>
            <div>✓ Career Copilot & Agent</div>
            <div>✓ Application automation preparation</div>
          </div>
          <div style={{ padding: "14px 16px", borderRadius: 12, background: "var(--surface-2, rgba(0,0,0,.04))", color: "var(--muted)", fontSize: 14 }}>
            <strong style={{ color: "var(--text)" }}>Payments are intentionally disabled.</strong><br />
            We will add subscriptions, Stripe checkout, and paid-plan limits only after the product is completed and tested.
          </div>
        </article>
      </section>
    </main>
  );
}
