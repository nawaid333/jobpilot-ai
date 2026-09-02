import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";

type Experience = { role?: string; company?: string; duration?: string; highlights?: string[] };
type Education = { degree?: string; institution?: string; year?: string };
type Edit = { section?: string; original?: string; suggested?: string; reason?: string };

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map(clean).filter(Boolean) : [];
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const id = new URL(req.url).searchParams.get("applicationId")?.trim() || "";
    if (!id) return NextResponse.json({ error: "applicationId is required." }, { status: 400 });

    const app = await prisma.application.findFirst({
      where: { id, userId: user.id },
      include: { job: true, tailoredApplication: true },
    });
    const profile = await prisma.careerProfile.findUnique({ where: { userId: user.id } });

    if (!app || !profile || !app.tailoredApplication) {
      return NextResponse.json({ error: "Resume source data is incomplete." }, { status: 404 });
    }

    const pkg = app.tailoredApplication;
    const experience = (Array.isArray(profile.experience) ? profile.experience : []) as Experience[];
    const education = (Array.isArray(profile.education) ? profile.education : []) as Education[];
    const skills = list(profile.skills);
    const strengths = list(profile.strengths);
    const edits = (Array.isArray(pkg.resumeEdits) ? pkg.resumeEdits : []) as Edit[];
    const children: Paragraph[] = [];

    const addHeading = (text: string) => children.push(new Paragraph({
      text,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 90 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "D9D9D9" } },
    }));
    const addBullet = (text: string) => {
      const value = clean(text);
      if (value) children.push(new Paragraph({ text: value, bullet: { level: 0 }, spacing: { after: 60 } }));
    };

    const name = clean(user.name) || "JobPilot Candidate";
    const headline = clean(profile.headline);
    const location = clean(profile.location);

    children.push(new Paragraph({ text: name, alignment: AlignmentType.CENTER, spacing: { after: 60 }, style: "ResumeName" }));
    if (headline) children.push(new Paragraph({ text: headline, alignment: AlignmentType.CENTER, spacing: { after: 60 }, style: "ResumeHeadline" }));
    const contactLine = [location, clean(user.email)].filter(Boolean).join("  |  ");
    if (contactLine) children.push(new Paragraph({ text: contactLine, alignment: AlignmentType.CENTER, spacing: { after: 180 }, style: "ResumeContact" }));

    addHeading("PROFESSIONAL SUMMARY");
    children.push(new Paragraph({ text: clean(pkg.tailoredSummary) || clean(profile.summary), spacing: { after: 80, line: 276 } }));

    if (experience.length) {
      addHeading("PROFESSIONAL EXPERIENCE");
      for (const item of experience) {
        const title = [clean(item.role), clean(item.company)].filter(Boolean).join(" — ");
        if (title) children.push(new Paragraph({ children: [new TextRun({ text: title, bold: true })], spacing: { before: 80, after: 20 } }));
        if (clean(item.duration)) children.push(new Paragraph({ text: clean(item.duration), italics: true, spacing: { after: 50 } }));
        for (const highlight of list(item.highlights)) addBullet(highlight);
      }
    }

    if (skills.length) {
      addHeading("CORE SKILLS");
      children.push(new Paragraph({ text: skills.join("  •  "), spacing: { after: 80, line: 276 } }));
    }

    if (education.length) {
      addHeading("EDUCATION");
      for (const item of education) {
        const title = [clean(item.degree), clean(item.institution)].filter(Boolean).join(" — ");
        if (title) children.push(new Paragraph({ children: [new TextRun({ text: title, bold: true })], spacing: { before: 60, after: 20 } }));
        if (clean(item.year)) children.push(new Paragraph({ text: clean(item.year), italics: true, spacing: { after: 50 } }));
      }
    }

    if (strengths.length) {
      addHeading("KEY STRENGTHS");
      for (const strength of strengths) addBullet(strength);
    }

    const suggestedEdits = edits.map((edit) => clean(edit.suggested)).filter(Boolean);
    if (suggestedEdits.length) {
      addHeading("ROLE-ALIGNED HIGHLIGHTS");
      for (const edit of suggestedEdits) addBullet(edit);
    }

    children.push(new Paragraph({
      text: `Prepared for ${clean(app.job.title) || "target role"} at ${clean(app.job.company) || "target company"}. JobPilot only uses information present in the saved candidate profile; review the final resume before submission.`,
      spacing: { before: 240 },
      italics: true,
    }));

    const doc = new Document({
      styles: {
        default: { document: { run: { font: "Arial", size: 21 }, paragraph: { spacing: { after: 80, line: 276 } } } },
        paragraphStyles: [
          { id: "ResumeName", name: "Resume Name", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 34, bold: true } },
          { id: "ResumeHeadline", name: "Resume Headline", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 23, bold: true } },
          { id: "ResumeContact", name: "Resume Contact", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 19 } },
        ],
      },
      sections: [{ properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children }],
    });

    const buffer = await Packer.toBuffer(doc);
    const safe = `${clean(app.job.company) || "Company"}-${clean(app.job.title) || "Resume"}`.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 100);
    return new Response(buffer as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="JobPilot-${safe || "Resume"}.docx"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not export resume." }, { status: 500 });
  }
}
