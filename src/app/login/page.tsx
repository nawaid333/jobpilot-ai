"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Unable to sign in.");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="premium-auth-page">
      <div className="premium-auth-glow premium-auth-glow-one" />
      <div className="premium-auth-glow premium-auth-glow-two" />
      <header className="premium-auth-nav shell">
        <Link className="premium-auth-brand" href="/">
          <img src="/jobpilot-mark.svg" alt="JobPilot AI" />
          <span>JobPilot <b>AI</b></span>
        </Link>
        <div>Not a member? <Link href="/signup">Create an account <span>→</span></Link></div>
      </header>

      <section className="premium-auth-layout shell">
        <div className="premium-auth-copy">
          <small>YOUR AI CAREER AGENT</small>
          <h1>Find better jobs<br /><em>faster with AI.</em></h1>
          <p>Pick up where you left off. Your profile, job matches and application pipeline are waiting.</p>
          <div className="premium-auth-benefits">
            <div><span>⌕</span><b>Find relevant jobs</b><small>Match opportunities to your real profile.</small></div>
            <div><span>✦</span><b>Tailor applications</b><small>Adapt your application with AI.</small></div>
            <div><span>▥</span><b>Track your progress</b><small>Keep every application organized.</small></div>
          </div>
        </div>

        <div className="premium-auth-card">
          <Link className="premium-auth-card-brand" href="/">
            <img src="/jobpilot-mark.svg" alt="JobPilot AI" />
            <span>JobPilot <b>AI</b></span>
          </Link>
          <div className="premium-auth-welcome"><span>●</span> WELCOME BACK</div>
          <h2>Continue your<br /><em>job search.</em></h2>
          <p>Sign in to access your career profile, matches and application pipeline.</p>

          <form onSubmit={submit}>
            <label>Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" /></label>
            <label>Password<div className="premium-password"><input type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" placeholder="Enter your password" /><span>⌾</span></div></label>
            {error && <div className="premium-auth-error">{error}</div>}
            <button className="premium-auth-submit" disabled={loading}>{loading ? "Signing in…" : "Sign in →"}</button>
          </form>
          <div className="premium-auth-or"><span>OR CONTINUE WITH</span></div>
          <div className="premium-auth-social"><button type="button" disabled>Google</button><button type="button" disabled>Microsoft</button></div>
          <div className="premium-auth-switch">New to JobPilot? <Link href="/signup">Create an account →</Link></div>
        </div>
      </section>
    </main>
  );
}
