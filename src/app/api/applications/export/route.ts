import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const url = new URL(req.url);
    const id = String(url.searchParams.get("applicationId") || "");
    const app = await prisma.application.findFirst({ where: { id, userId: user.id }, include: { job: true, tailoredApplication: true } });
    if (!app?.tailoredApplication) return NextResponse.json({ error: "Tailored application not found." }, { status: 404 });
    const pkg = app.tailoredApplication;
    const edits = Array.isArray(pkg.resumeEdits) ? pkg.resumeEdits as { section?: string; suggested?: string }[] : [];
    const doc = new Document({ sections: [{ children: [
      new Paragraph({ text: user.name || "JobPilot Candidate", heading: HeadingLevel.TITLE }),
      new Paragraph({ children: [new TextRun({ text: `${app.job.title} — ${app.job.company}`, bold: true })] }),
      new Paragraph({ text: "" }),
      new Paragraph({ text: "Professional Summary", heading: HeadingLevel.HEADING_1 }),
      new Paragraph(pkg.tailoredSummary),
      new Paragraph({ text: "Resume Suggestions", heading: HeadingLevel.HEADING_1 }),
      ...edits.map((e) => new Paragraph({ text: `${e.section || "Resume"}: ${e.suggested || ""}`, bullet: { level: 0 } })),
      new Paragraph({ text: "" }),
      new Paragraph({ text: "Truth-first note: These suggestions are generated only from the saved candidate profile. Review them before use." }),
    ] }] });
    const buffer = await Packer.toBuffer(doc);
    return new Response(buffer as BodyInit, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Content-Disposition": `attachment; filename="JobPilot-${app.job.company}-${app.job.title}.docx"` } });
  } catch { return NextResponse.json({ error: "Could not export resume." }, { status: 500 }); }
}
