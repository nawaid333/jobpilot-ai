import { NextResponse } from "next/server";

type LeverPosting = {
  id: string;
  text: string;
  categories?: { location?: string; allLocations?: string[]; level?: string; commitment?: string; team?: string };
  content?: { description?: string };
  urls?: { show?: string; apply?: string };
  workplaceType?: string;
  salaryDescription?: string;
};

export async function GET() {
  const companies = (process.env.JOBPILOT_LEVER_COMPANIES || "").split(",").map(x => x.trim()).filter(Boolean).slice(0, 20);
  if (!companies.length) return NextResponse.json({ jobs: [], configured: false, message: "Configure JOBPILOT_LEVER_COMPANIES with public Lever company slugs." });

  const results = await Promise.allSettled(companies.map(async (slug) => {
    const response = await fetch(`https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`, { next: { revalidate: 900 } });
    if (!response.ok) throw new Error(`Lever source ${slug} returned ${response.status}`);
    const postings = await response.json() as LeverPosting[];
    return postings.map(job => ({
      id: `${slug}:${job.id}`,
      title: job.text,
      company: slug,
      location: job.categories?.location || job.categories?.allLocations?.join(", ") || "Not specified",
      mode: job.workplaceType || "Not specified",
      level: job.categories?.level || "Not specified",
      commitment: job.categories?.commitment || "",
      team: job.categories?.team || "",
      description: job.content?.description || "",
      salary: job.salaryDescription || "",
      url: job.urls?.show || job.urls?.apply || "",
      applyUrl: job.urls?.apply || job.urls?.show || "",
      source: "Lever",
    }));
  }));

  const jobs = results.flatMap(result => result.status === "fulfilled" ? result.value : []);
  return NextResponse.json({ jobs, configured: true, sources: companies.length, fetchedAt: new Date().toISOString() });
}
