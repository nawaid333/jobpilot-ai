export type NormalizedJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  mode: string;
  level: string;
  salary: string;
  url: string;
  description: string;
  skills: string[];
  source: string;
};

function text(value: unknown) {
  return typeof value === "string" ? value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim() : "";
}

function workplace(value: unknown) {
  const v = text(value).toLowerCase();
  if (v.includes("remote")) return "Remote";
  if (v.includes("hybrid")) return "Hybrid";
  if (v.includes("onsite") || v.includes("on-site") || v.includes("office")) return "On-site";
  return text(value) || "Not specified";
}

export async function fetchLever(slugs: string[]): Promise<NormalizedJob[]> {
  const results = await Promise.allSettled(slugs.slice(0, 20).map(async slug => {
    const r = await fetch(`https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`, { next: { revalidate: 900 } });
    if (!r.ok) throw new Error(`Lever ${slug}: ${r.status}`);
    const jobs = await r.json();
    return (jobs as any[]).map(job => ({
      id: `lever:${slug}:${job.id}`, title: text(job.text), company: slug,
      location: text(job.categories?.location) || text(job.categories?.allLocations?.join(", ")) || "Not specified",
      mode: workplace(job.workplaceType), level: text(job.categories?.level) || "Not specified",
      salary: text(job.salaryDescription), url: job.urls?.show || job.urls?.apply || "",
      description: text(job.content?.description), skills: [], source: "Lever",
    }));
  }));
  return results.flatMap(r => r.status === "fulfilled" ? r.value : []);
}

export async function fetchGreenhouse(tokens: string[]): Promise<NormalizedJob[]> {
  const results = await Promise.allSettled(tokens.slice(0, 20).map(async token => {
    const r = await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`, { next: { revalidate: 900 } });
    if (!r.ok) throw new Error(`Greenhouse ${token}: ${r.status}`);
    const data = await r.json();
    return (data.jobs || []).map((job: any) => ({
      id: `greenhouse:${token}:${job.id}`, title: text(job.title), company: token,
      location: text(job.location?.name) || "Not specified", mode: workplace(job.location?.name),
      level: "Not specified", salary: "", url: job.absolute_url || "",
      description: text(job.content), skills: [], source: "Greenhouse",
    }));
  }));
  return results.flatMap(r => r.status === "fulfilled" ? r.value : []);
}

export async function fetchAshby(boards: string[]): Promise<NormalizedJob[]> {
  const results = await Promise.allSettled(boards.slice(0, 20).map(async board => {
    const r = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}`, { next: { revalidate: 900 } });
    if (!r.ok) throw new Error(`Ashby ${board}: ${r.status}`);
    const data = await r.json();
    return (data.jobs || []).map((job: any) => ({
      id: `ashby:${board}:${job.jobUrl || job.id || job.title}`, title: text(job.title), company: board,
      location: text(job.location) || "Not specified", mode: workplace(job.workplaceType || job.location),
      level: text(job.team) || "Not specified", salary: text(job.compensationTierSummary) || "",
      url: job.jobUrl || job.applyUrl || "", description: text(job.descriptionHtml || job.description),
      skills: [], source: "Ashby",
    }));
  }));
  return results.flatMap(r => r.status === "fulfilled" ? r.value : []);
}

export async function fetchAllJobSources() {
  const lever = (process.env.JOBPILOT_LEVER_COMPANIES || "").split(",").map(x => x.trim()).filter(Boolean);
  const greenhouse = (process.env.JOBPILOT_GREENHOUSE_COMPANIES || "").split(",").map(x => x.trim()).filter(Boolean);
  const ashby = (process.env.JOBPILOT_ASHBY_BOARDS || "").split(",").map(x => x.trim()).filter(Boolean);
  const [leverJobs, greenhouseJobs, ashbyJobs] = await Promise.all([
    fetchLever(lever), fetchGreenhouse(greenhouse), fetchAshby(ashby),
  ]);
  const jobs = [...leverJobs, ...greenhouseJobs, ...ashbyJobs];
  return { jobs, configured: Boolean(lever.length || greenhouse.length || ashby.length), sourceCounts: {
    Lever: leverJobs.length, Greenhouse: greenhouseJobs.length, Ashby: ashbyJobs.length,
  }};
}
