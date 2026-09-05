"use client";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="dashboard-page">
      <section className="shell" style={{ padding: "96px 0", maxWidth: 720 }}>
        <div className="eyebrow"><span className="pulse"/> Command center</div>
        <h1>We couldn’t load your <em>dashboard.</em></h1>
        <p className="dashboard-lede">Your saved applications are safe. This looks like a temporary loading problem.</p>
        <button className="button primary" onClick={() => reset()}>Try again</button>
      </section>
    </main>
  );
}
