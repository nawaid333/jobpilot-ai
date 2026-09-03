import { NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

type LeverPosting = {
  id: string;
  text: string;
  categories?: { location?: string; allLocations?: string[]; level?: string; commitment?: string; team?: string };
  content?: { description?: string };
  urls?: { show?: string; apply?: string };
  workplaceType?: string;
  salaryDescription?: string;
};

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "anonymous";
}

export async function GET(request: Request) {
  const limited = rateLimit(`jobs-public:${clientKey(request)}`, 30, 60_000);
  const rateResponse = rateLimitResponse(limited);
  if (rateResponse) return rateResponse;

  const companies = (process.env.JOBPILOT_LEVER_COMPANIES || "").split(",").map(x => x.trim()).filter(Boolean).slice(0, 20);
  if (!companies.length) return NextResponse.json({ jobs: [], configured: false, message: "Configure JOBPILOT_LEVER_COMPANIES with public Lever company slugs." }, { headers: { "Cache-Control": "public, max-age=60" } });

  const results = await Promise.allSettled(companies.map(async (slug) => {
    const response = await fetch(`https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`, {
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Lever source ${slug} returned ${response.status}`);
    const postings = await response.json() as LeverPosting[];
    if (!Array.isArray(postings)) throw new Error(`Lever source ${slug} returned invalid data`);
    return postings.slice(0, 500).map(job => ({
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
  const failedSources = results.filter(result => result.status === "rejected").length;
  return NextResponse.json(
    { jobs: jobs.slice(0, 1000), configured: true, sources: companies.length, failedSources, fetchedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}
