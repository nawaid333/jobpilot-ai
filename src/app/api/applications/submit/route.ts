import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const MAX_ID_LENGTH = 100;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(`applications-submit:${user.id}`, 20, 60_000);
  const rateResponse = rateLimitResponse(limited);
  if (rateResponse) return rateResponse;

  try {
    const body = await req.json();
    const id = typeof body?.applicationId === "string" ? body.applicationId.trim() : "";
    const confirmed = body?.confirmed === true;
    if (!id || id.length > MAX_ID_LENGTH) return NextResponse.json({ error: "Application id is required." }, { status: 400 });
    if (!confirmed) return NextResponse.json({ error: "Confirm that you submitted the application first." }, { status: 400 });

    const application = await prisma.application.findFirst({
      where: { id, userId: user.id },
      include: { job: true, tailoredApplication: true },
    });
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });
    if (!application.tailoredApplication) {
      return NextResponse.json({ error: "Create and review the tailored package before submitting." }, { status: 409 });
    }
    if (!application.job.url) {
      return NextResponse.json({ error: "This job does not have a submission listing URL." }, { status: 409 });
    }

    // Idempotent: repeated confirmation for an already-applied job should not
    // create a new timestamp or fail after the user has already completed it.
    if (application.status === "Applied") {
      return NextResponse.json({
        application,
        submission: { mode: "user-confirmed", listingUrl: application.job.url, alreadyRecorded: true },
      });
    }

    // Do not silently move later-stage applications backwards to Applied.
    if (["Interview", "Offer", "Rejected"].includes(application.status)) {
      return NextResponse.json({ error: `This application is already ${application.status}.` }, { status: 409 });
    }

    const updated = await prisma.application.update({
      where: { id: application.id },
      data: { status: "Applied", appliedAt: application.appliedAt || new Date() },
      include: { job: true, tailoredApplication: true },
    });

    return NextResponse.json({
      application: updated,
      submission: { mode: "user-confirmed", listingUrl: updated.job.url, alreadyRecorded: false },
    });
  } catch {
    return NextResponse.json({ error: "Could not record the application submission." }, { status: 400 });
  }
}
