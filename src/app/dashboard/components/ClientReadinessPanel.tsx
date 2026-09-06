"use client";

import Link from "next/link";

const modules = [
  { title: "Career Profile", href: "/profile", text: "Verified experience and preferences" },
  { title: "Discover Jobs", href: "/discover", text: "Match and shortlist opportunities" },
  { title: "Applications", href: "/applications", text: "Move applications through the pipeline" },
  { title: "Interview Coach", href: "/interview", text: "Practice role-specific questions" },
  { title: "Copilot", href: "/copilot", text: "Workspace-grounded AI guidance" },
  { title: "Analytics", href: "/analytics", text: "Understand progress and next actions" },
];

export default function ClientReadinessPanel() {
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Workspace</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Everything you need to run your job search</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">Start with your verified profile, find the right roles, prepare truthful applications, then track and improve.</p>
        </div>
        <Link href="/discover" className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950">Find jobs</Link>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module, index) => (
          <Link key={module.href} href={module.href} className="rounded-xl border border-slate-200 p-4 transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-sm dark:border-slate-800 dark:hover:border-slate-600">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-300">0{index + 1}</span>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{module.title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">{module.text}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
