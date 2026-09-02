import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [applications, profile] = await Promise.all([
    prisma.application.findMany({ where:{userId:user.id}, orderBy:{updatedAt:"desc"}, include:{job:true}, take:5 }),
    prisma.careerProfile.findUnique({ where:{userId:user.id} }),
  ]);
  const counts = applications.reduce<Record<string,number>>((a,x)=>(a[x.status]=(a[x.status]||0)+1,a),{});
  return <main className="dashboard-page"><nav className="nav shell"><Link className="brand" href="/"><span className="brand-mark">✦</span>JobPilot<span className="brand-ai">AI</span></Link><div className="nav-actions"><Link href="/profile">Profile</Link><Link className="nav-cta" href="/tracker">Tracker ↗</Link></div></nav><section className="dashboard-shell shell"><div className="eyebrow"><span className="pulse"/> Your workspace</div><h1>Good to see you, <em>{user.name || "there"}.</em></h1><p className="dashboard-lede">Your career workspace is ready. Find relevant opportunities, tailor your application, and keep the pipeline moving.</p><div className="dashboard-grid"><Link className="dashboard-card dashboard-feature" href="/jobs"><span>01 · DISCOVER</span><h2>Find jobs that actually fit.</h2><p>Match opportunities against your career profile and preferences.</p><b>Explore jobs →</b></Link><Link className="dashboard-card" href="/profile"><span>02 · PROFILE</span><h2>{profile ? "Career profile ready" : "Build your career profile"}</h2><p>{profile ? `ATS score ${profile.atsScore}/100 · Keep your evidence-based profile current.` : "Turn your CV into a structured profile."}</p><b>Open profile →</b></Link><Link className="dashboard-card" href="/tracker"><span>03 · PIPELINE</span><h2>{applications.length} tracked</h2><p>{Object.entries(counts).map(([k,v])=>`${v} ${k}`).join(" · ") || "Save your first opportunity to begin."}</p><b>View tracker →</b></Link></div><div className="dashboard-recent"><div className="preference-heading"><div><div className="kicker">RECENT ACTIVITY</div><h2>Application pipeline</h2></div><Link className="button secondary" href="/tracker">See all</Link></div>{applications.length?<div className="recent-list">{applications.map(a=><div className="recent-row" key={a.id}><div><strong>{a.job.title}</strong><span>{a.job.company} · {a.job.location}</span></div><b>{a.status}</b></div>)}</div>:<p className="truth-note">No applications yet. Start with a genuinely relevant job rather than applying everywhere.</p>}</div></section></main>;
}
