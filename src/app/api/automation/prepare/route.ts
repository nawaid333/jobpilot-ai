import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowed = ["Saved", "Preparing", "Applied", "Interview", "Offer", "Rejected"];

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const ids = Array.isArray(body.applicationIds) ? body.applicationIds.map(String).slice(0, 25) : [];
    if (!ids.length) return NextResponse.json({ error: "Select at least one application." }, { status: 400 });
    const applications = await prisma.application.findMany({ where: { userId: user.id, id: { in: ids } }, include: { job: true, tailoredApplication: true } });
    const steps = applications.map((a) => ({
      applicationId: a.id,
      job: { id: a.job.id, title: a.job.title, company: a.job.company, location: a.job.location, url: a.job.url },
      currentStatus: a.status,
      ready: !!a.tailoredApplication,
      steps: [
        { key: "review", label: "Review tailored package", completed: !!a.tailoredApplication },
        { key: "open", label: "Open employer application", completed: false },
        { key: "submit", label: "User confirms submission", completed: false },
      ],
      policy: "JobPilot prepares and guides the application. It does not submit without explicit user confirmation.",
    }));
    return NextResponse.json({ ok: true, count: steps.length, steps });
  } catch { return NextResponse.json({ error: "Could not prepare application workflow." }, { status: 400 }); }
}
