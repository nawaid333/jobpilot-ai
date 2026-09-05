"use client";

import Link from "next/link";

const items = [
  ["Career profile", "/profile", "Build from verified CV facts"],
  ["Discover jobs", "/discover", "Review fit before saving"],
  ["Applications", "/applications", "Track every stage"],
  ["Interview Coach", "/interview", "Practice with evidence"],
  ["Copilot", "/copilot", "Get workspace-grounded guidance"],
  ["Analytics", "/analytics", "See what to improve"],
] as const;

export default function ClientReadinessBanner() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">JobPilot workspace</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Your job-search command center</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Move from verified profile → matched jobs → prepared applications → interview readiness.</p>
        </div>
        <Link href="/discover" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">Find matching jobs</Link>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([label, href, description], index) => (
          <Link key={href} href={href} className="group rounded-xl border border-slate-200 p-3 transition hover:border-slate-400 hover:shadow-sm dark:border-slate-800 dark:hover:border-slate-600">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-300">{index + 1}</span>
              <div>
                <div className="text-sm font-semibold text-slate-900 group-hover:underline dark:text-white">{label}</div>
                <div className="text-xs text-slate-500">{description}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
