import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const MAX_ID_LENGTH = 100;
const MAX_BODY_BYTES = 16 * 1024;
const TERMINAL_STATUSES = ["Interview", "Offer", "Rejected"];

function bodyTooLarge(req: Request) {
  const length = req.headers.get("content-length");
  return length !== null && Number.isFinite(Number(length)) && Number(length) > MAX_BODY_BYTES;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(`applications-submit:${user.id}`, 20, 60_000);
  const rateResponse = rateLimitResponse(limited);
  if (rateResponse) return rateResponse;
  if (bodyTooLarge(req)) return NextResponse.json({ error: "Request body is too large." }, { status: 413 });

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

    if (application.status === "Applied") {
      return NextResponse.json({
        application,
        submission: { mode: "user-confirmed", listingUrl: application.job.url, alreadyRecorded: true },
      });
    }

    if (TERMINAL_STATUSES.includes(application.status)) {
      return NextResponse.json({ error: `This application is already ${application.status}.` }, { status: 409 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.application.findFirst({
        where: { id, userId: user.id },
        include: { job: true, tailoredApplication: true },
      });
      if (!current) throw new Error("NOT_FOUND");
      if (!current.tailoredApplication) throw new Error("NO_TAILORED_PACKAGE");
      if (!current.job.url) throw new Error("NO_LISTING_URL");
      if (current.status === "Applied") return current;
      if (TERMINAL_STATUSES.includes(current.status)) throw new Error("ALREADY_TERMINAL");

      return tx.application.update({
        where: { id: current.id },
        data: { status: "Applied", appliedAt: current.appliedAt || new Date() },
        include: { job: true, tailoredApplication: true },
      });
    });

    return NextResponse.json({
      application: updated,
      submission: { mode: "user-confirmed", listingUrl: updated.job.url, alreadyRecorded: updated.status === "Applied" && !!application.appliedAt },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "NOT_FOUND") return NextResponse.json({ error: "Application not found." }, { status: 404 });
    if (message === "NO_TAILORED_PACKAGE") return NextResponse.json({ error: "Create and review the tailored package before submitting." }, { status: 409 });
    if (message === "NO_LISTING_URL") return NextResponse.json({ error: "This job does not have a submission listing URL." }, { status: 409 });
    if (message === "ALREADY_TERMINAL") return NextResponse.json({ error: "This application has already reached a later status." }, { status: 409 });
    return NextResponse.json({ error: "Could not record the application submission." }, { status: 400 });
  }
}
