"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Unable to create account.");

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account.");
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

        <div>
          Already a member?{" "}
          <Link href="/login">
            Sign in <span>→</span>
          </Link>
        </div>
      </header>

      <section className="premium-auth-layout shell">
        <div className="premium-auth-copy">
          <small>YOUR AI CAREER AGENT</small>
          <h1>
            Build your
            <br />
            <em>career profile.</em>
          </h1>
          <p>
            Create one profile for your CV, job matches, tailored applications
            and complete application pipeline.
          </p>

          <div className="premium-auth-benefits">
            <div>
              <span>⌕</span>
              <b>Build your profile</b>
              <small>Keep your career information in one place.</small>
            </div>
            <div>
              <span>✦</span>
              <b>Get matched to jobs</b>
              <small>Discover opportunities aligned with your profile.</small>
            </div>
            <div>
              <span>▥</span>
              <b>Manage applications</b>
              <small>Track every application from one workspace.</small>
            </div>
          </div>
        </div>

        <div className="premium-auth-card">
          <Link className="premium-auth-card-brand" href="/">
            <img src="/jobpilot-mark.svg" alt="JobPilot AI" />
            <span>JobPilot <b>AI</b></span>
          </Link>

          <div className="premium-auth-welcome">
            <span>●</span> START YOUR WORKSPACE
          </div>

          <h2>
            Build your
            <br />
            <em>career profile.</em>
          </h2>

          <p>
            Create your account to unlock your profile, job matches and
            application workspace.
          </p>

          <form onSubmit={submit}>
            <label>
              Full name
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="Your full name"
              />
            </label>

            <label>
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Create a password"
              />
              <small className="premium-auth-field-note">At least 8 characters.</small>
            </label>

            {error && <div className="premium-auth-error">{error}</div>}

            <button className="premium-auth-submit" disabled={loading}>
              {loading ? "Creating account…" : "Create account →"}
            </button>
          </form>

          <div className="premium-auth-or">
            <span>OR CONTINUE WITH</span>
          </div>

          <div className="premium-auth-social">
            <button type="button" disabled>Google</button>
            <button type="button" disabled>Microsoft</button>
          </div>

          <div className="premium-auth-switch">
            Already have an account?{" "}
            <Link href="/login">Sign in →</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
