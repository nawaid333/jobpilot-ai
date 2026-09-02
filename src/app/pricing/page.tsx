"use client";

import { useEffect, useState } from "react";

const plans = [
  { name: "Free", price: "$0", description: "Start building a smarter job search.", features: ["Career profile", "Job matching", "5 AI actions/month", "25 tracked applications"] },
  { name: "Pro", price: "$19", description: "For an active, serious job search.", features: ["Everything in Free", "100 AI actions/month", "500 tracked applications", "Gmail intelligence", "Interview Coach", "Priority AI processing"] },
];

export default function PricingPage() {
  const [current, setCurrent] = useState("free");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/billing").then(r => r.ok ? r.json() : null).then(d => d && setCurrent(d.planKey)).catch(() => {}); }, []);
  async function upgrade() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Checkout unavailable.");
      if (data.url) window.location.href = data.url;
    } catch (e) { setError(e instanceof Error ? e.message : "Checkout unavailable."); setLoading(false); }
  }
  return (
    <main className="shell" style={{ paddingTop: 72, paddingBottom: 80 }}>
      <section style={{ maxWidth: 820, margin: "0 auto", textAlign: "center" }}>
        <div className="kicker">JOBPILOT PLANS</div>
        <h1 style={{ fontSize: "clamp(38px, 6vw, 64px)", lineHeight: 1.02, margin: "14px 0" }}>A better job search, without the busywork.</h1>
        <p style={{ color: "var(--muted)", fontSize: 18, maxWidth: 650, margin: "0 auto 40px" }}>Start free. Upgrade when you want more AI capacity and deeper recruiting intelligence.</p>
        {error && <p style={{ color: "#b42318", marginBottom: 18 }}>{error}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18, textAlign: "left" }}>
          {plans.map(plan => {
            const isCurrent = current === plan.name.toLowerCase();
            return <article key={plan.name} className="dashboard-recent" style={{ padding: 28 }}>
              <div className="kicker">{plan.name}</div>
              <div style={{ fontSize: 44, fontWeight: 800, margin: "8px 0" }}>{plan.price}<span style={{ fontSize: 15, fontWeight: 500, color: "var(--muted)" }}>{plan.name === "Pro" ? "/month" : ""}</span></div>
              <p style={{ color: "var(--muted)", minHeight: 48 }}>{plan.description}</p>
              <div style={{ display: "grid", gap: 10, margin: "22px 0" }}>{plan.features.map(f => <div key={f}>✓ {f}</div>)}</div>
              <button onClick={plan.name === "Pro" ? upgrade : undefined} className={isCurrent ? "button secondary" : "button primary"} disabled={isCurrent || loading} style={{ width: "100%" }}>{isCurrent ? "Current plan" : loading ? "Opening checkout…" : "Upgrade to Pro"}</button>
            </article>;
          })}
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 24 }}>Secure checkout is handled by Stripe. JobPilot does not store card details.</p>
      </section>
    </main>
  );
}
