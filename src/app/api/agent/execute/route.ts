import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const safeActions = new Set(["prepare", "mark-preparing", "mark-applied"]);
const RANK: Record<string, number> = { Saved: 0, Preparing: 1, Applied: 2, Interview: 3, Offer: 4, Rejected: 4 };

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const action = String(body?.action || "");
    const applicationId = String(body?.applicationId || "");
    if (!applicationId || !safeActions.has(action)) return NextResponse.json({ error: "Valid action and application are required." }, { status: 400 });
    const application = await prisma.application.findFirst({ where: { id: applicationId, userId: user.id }, include: { job: true, tailoredApplication: true } });
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    if (action === "prepare") {
      if (!application.tailoredApplication) return NextResponse.json({ ok: false, next: "tailor", redirect: `/tailor?applicationId=${encodeURIComponent(application.id)}`, message: "Create the tailored package before preparing submission." });
      if (RANK[application.status] < RANK.Preparing) await prisma.application.update({ where: { id: application.id }, data: { status: "Preparing" } });
      return NextResponse.json({ ok: true, next: "review", redirect: `/automation?applicationId=${encodeURIComponent(application.id)}`, message: "Your tailored package is ready for review." });
    }
    if (action === "mark-preparing") {
      if (RANK[application.status] > RANK.Preparing) return NextResponse.json({ error: `Cannot move ${application.status} back to Preparing.` }, { status: 409 });
      const updated = await prisma.application.update({ where: { id: application.id }, data: { status: "Preparing" } });
      return NextResponse.json({ ok: true, status: updated.status, message: "Application moved to Preparing." });
    }
    if (RANK[application.status] > RANK.Applied) return NextResponse.json({ error: `Cannot mark a ${application.status} application as Applied.` }, { status: 409 });
    const updated = await prisma.application.update({ where: { id: application.id }, data: { status: "Applied", appliedAt: application.appliedAt || new Date() } });
    return NextResponse.json({ ok: true, status: updated.status, message: "Marked as Applied. JobPilot did not submit the application." });
  } catch { return NextResponse.json({ error: "Could not execute agent action." }, { status: 400 }); }
}
