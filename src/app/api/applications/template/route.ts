import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isResumeTemplateId } from "@/lib/resume-templates";

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const applicationId = typeof body?.applicationId === "string" ? body.applicationId.trim() : "";
    const template = typeof body?.template === "string" ? body.template : "";
    if (!applicationId || !isResumeTemplateId(template)) return NextResponse.json({ error: "A valid applicationId and resume template are required." }, { status: 400 });
    const app = await prisma.application.findFirst({ where: { id: applicationId, userId: user.id }, select: { id: true } });
    if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });
    const saved = await prisma.tailoredApplication.updateMany({ where: { applicationId }, data: { template } });
    if (!saved.count) return NextResponse.json({ error: "Create a tailored application package before choosing a template." }, { status: 404 });
    return NextResponse.json({ applicationId, template });
  } catch { return NextResponse.json({ error: "Could not save resume template." }, { status: 400 }); }
}
