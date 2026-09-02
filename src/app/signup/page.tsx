"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router=useRouter(); const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
  async function submit(e:FormEvent){e.preventDefault();setLoading(true);setError("");try{const r=await fetch("/api/auth/signup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,email,password})});const data=await r.json();if(!r.ok)throw new Error(data.error||"Unable to create account.");router.push("/dashboard");router.refresh();}catch(err){setError(err instanceof Error?err.message:"Unable to create account.");}finally{setLoading(false);}}
  return <main className="auth-page"><div className="auth-card"><Link className="brand" href="/"><span className="brand-mark">✦</span>JobPilot<span className="brand-ai">AI</span></Link><div className="eyebrow"><span className="pulse"/> Start your workspace</div><h1>Build your <em>career profile.</em></h1><p>One account for your CV, job matches, tailored applications and tracker.</p><form onSubmit={submit}><label>Name<input required value={name} onChange={e=>setName(e.target.value)} autoComplete="name" /></label><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" /></label><label>Password<input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" /><small>At least 8 characters.</small></label>{error&&<div className="auth-error">{error}</div>}<button className="button primary auth-submit" disabled={loading}>{loading?"Creating account…":"Create account →"}</button></form><div className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></div></div></main>;
}
