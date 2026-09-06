import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const application = await prisma.application.findFirst({
    where: { id, userId: user.id },
    include: {
      job: true,
      tailoredApplication: true,
      emailSignals: { orderBy: { receivedAt: "desc" }, take: 8 },
      agentActions: { orderBy: [{ priority: "desc" }, { createdAt: "desc" }], take: 8 },
    },
  });
  if (!application) notFound();

  const nextAction = application.nextActionAt ? new Date(application.nextActionAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "No action scheduled";
  const applied = application.appliedAt ? new Date(application.appliedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Not applied yet";
  const timeline = [
    { at: application.createdAt, title: "Application added", detail: "Job saved to your JobPilot pipeline.", type: "Application" },
    ...(application.appliedAt ? [{ at: application.appliedAt, title: "Application submitted", detail: "Marked as applied in your tracker.", type: "Application" }] : []),
    ...application.emailSignals.map(signal => ({ at: signal.receivedAt || signal.createdAt, title: signal.category, detail: signal.subject || signal.reason, type: "Recruiter signal" })),
    ...application.agentActions.map(action => ({ at: action.createdAt, title: action.title, detail: action.reason, type: `Agent · ${action.status}` })),
    ...(application.tailoredApplication ? [{ at: application.tailoredApplication.updatedAt, title: "AI tailoring updated", detail: application.tailoredApplication.recommendation, type: "AI" }] : []),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 16);

  return (
    <main className="page-shell">
      <nav className="nav shell"><Link className="brand" href="/">✦ JobPilot<span className="brand-ai">AI</span></Link><div className="nav-actions"><Link href="/jobs">Jobs</Link><Link href="/agent">Agent</Link><Link className="nav-cta" href="/tracker">Tracker ↗</Link></div></nav>
      <section className="page-hero"><div><p className="eyebrow">APPLICATION WORKSPACE</p><h1>{application.job.title}</h1><p className="muted">{application.job.company} · {application.job.location}{application.job.mode ? ` · ${application.job.mode}` : ""}</p></div><span className="status-pill">{application.status}</span></section>
      <section className="stats-grid"><div className="stat-card"><span>Applied</span><strong>{applied}</strong></div><div className="stat-card"><span>Next action</span><strong>{nextAction}</strong></div><div className="stat-card"><span>Recruiter signals</span><strong>{application.emailSignals.length}</strong></div><div className="stat-card"><span>Agent actions</span><strong>{application.agentActions.length}</strong></div></section>
      <div className="dashboard-grid">
        <section className="panel"><p className="eyebrow">APPLICATION PLAN</p><h2>Move this application forward.</h2><div className="profile-actions"><Link className="primary-button" href={`/tailor?applicationId=${encodeURIComponent(application.id)}`}>Open tailoring</Link><Link className="secondary-button" href={`/intelligence?applicationId=${encodeURIComponent(application.id)}`}>Review signals</Link><Link className="secondary-button" href="/agent">Open Agent</Link></div><p className="truth-note">Review every generated document and recruiting signal before sending or submitting anything.</p></section>
        <section className="panel"><p className="eyebrow">TAILORED PACKAGE</p><h2>{application.tailoredApplication ? "Ready for review" : "Not prepared yet"}</h2>{application.tailoredApplication ? <><p>{application.tailoredApplication.recommendation}</p><p className="muted">Template: {application.tailoredApplication.template} · Updated {new Date(application.tailoredApplication.updatedAt).toLocaleDateString()}</p></> : <p className="muted">Build a role-specific package from your saved career profile.</p>}</section>
      </div>
      <section className="panel"><div className="section-heading"><div><p className="eyebrow">NEXT ACTIONS</p><h2>What needs attention</h2></div></div>{application.agentActions.length ? <div className="recent-list">{application.agentActions.map(action => <div className="recent-row" key={action.id}><div><strong>{action.title}</strong><span>{action.reason}</span></div><b>P{action.priority}</b></div>)}</div> : <p className="truth-note">No agent actions for this application.</p>}</section>
      <section className="panel"><div className="section-heading"><div><p className="eyebrow">APPLICATION TIMELINE</p><h2>Everything that happened</h2></div></div>{timeline.length ? <div className="recent-list">{timeline.map((event, index) => <div className="recent-row" key={`${event.title}-${String(event.at)}-${index}`}><div><strong>{event.title}</strong><span>{event.type} · {event.detail}</span></div><b>{new Date(event.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</b></div>)}</div> : <p className="truth-note">Activity will appear here as you work this application.</p>}</section>
      <section className="panel"><div className="section-heading"><div><p className="eyebrow">RECRUITER SIGNALS</p><h2>Latest activity</h2></div></div>{application.emailSignals.length ? <div className="recent-list">{application.emailSignals.map(signal => <div className="recent-row" key={signal.id}><div><strong>{signal.category}</strong><span>{signal.subject || signal.reason}</span></div><b>{Math.round(signal.confidence * 100)}%</b></div>)}</div> : <p className="truth-note">No recruiting-email signals linked to this application yet.</p>}</section>
      <section className="panel"><p className="eyebrow">JOB DETAILS</p><h2>Original opportunity</h2>{application.job.description && <p className="muted">{application.job.description.slice(0, 1200)}</p>}<div className="profile-actions"><Link className="secondary-button" href="/tracker">← Back to tracker</Link>{application.job.url && <a className="primary-button" href={application.job.url} target="_blank" rel="noreferrer">Open original listing ↗</a>}</div></section>
    </main>
  );
}
