"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(e: FormEvent) { e.preventDefault(); setLoading(true); setError(""); try { const r = await fetch("/api/auth/login", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({email,password}) }); const data=await r.json(); if(!r.ok) throw new Error(data.error||"Unable to sign in."); router.push("/dashboard"); router.refresh(); } catch(err) { setError(err instanceof Error ? err.message : "Unable to sign in."); } finally { setLoading(false); } }
  return <main className="auth-page"><div className="auth-card"><Link className="brand" href="/"><span className="brand-mark">✦</span>JobPilot<span className="brand-ai">AI</span></Link><div className="eyebrow"><span className="pulse"/> Welcome back</div><h1>Continue your <em>job search.</em></h1><p>Sign in to access your career profile, matches and application pipeline.</p><form onSubmit={submit}><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" /></label><label>Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" /></label>{error&&<div className="auth-error">{error}</div>}<button className="button primary auth-submit" disabled={loading}>{loading?"Signing in…":"Sign in →"}</button></form><div className="auth-switch">New to JobPilot? <Link href="/signup">Create an account</Link></div></div></main>;
}
