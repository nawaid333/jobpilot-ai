import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";
import { isResumeTemplateId } from "@/lib/resume-templates";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

type Experience = { role?: string; company?: string; duration?: string; highlights?: string[] };
type Education = { degree?: string; institution?: string; year?: string };
type Edit = { section?: string; suggested?: string };
const clean = (v: unknown) => typeof v === "string" ? v.trim() : "";
const list = (v: unknown) => Array.isArray(v) ? v.map(clean).filter(Boolean) : [];

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimit(`applications-export:${user.id}`, 10, 60_000);
  const rateResponse = rateLimitResponse(limited);
  if (rateResponse) return rateResponse;
  try {
    const params = new URL(req.url).searchParams;
    const id = clean(params.get("applicationId"));
    const requested = params.get("template");
    if (!id || id.length > 100) return NextResponse.json({ error: "applicationId is required" }, { status: 400 });
    const app = await prisma.application.findFirst({ where: { id, userId: user.id }, include: { job: true, tailoredApplication: true } });
    const profile = await prisma.careerProfile.findUnique({ where: { userId: user.id } });
    if (!app || !profile || !app.tailoredApplication) return NextResponse.json({ error: "Resume source data is incomplete." }, { status: 404 });
    const template = isResumeTemplateId(requested) ? requested : (isResumeTemplateId(app.tailoredApplication.template) ? app.tailoredApplication.template : "classic");
    if (template !== app.tailoredApplication.template) await prisma.tailoredApplication.update({ where: { id: app.tailoredApplication.id }, data: { template } });

    const experience = (Array.isArray(profile.experience) ? profile.experience : []) as Experience[];
    const education = (Array.isArray(profile.education) ? profile.education : []) as Education[];
    const skills = list(profile.skills); const strengths = list(profile.strengths);
    const edits = (Array.isArray(app.tailoredApplication.resumeEdits) ? app.tailoredApplication.resumeEdits : []) as Edit[];
    const children: Paragraph[] = [];
    const sectionColor = template === "modern" ? "1D4ED8" : template === "compact" ? "374151" : "111827";
    const heading = (text: string) => children.push(new Paragraph({ text: text.toUpperCase(), heading: HeadingLevel.HEADING_1, spacing: { before: template === "compact" ? 160 : 240, after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: template === "modern" ? 10 : 6, color: sectionColor } } }));
    const bullet = (text: string) => { const v = clean(text); if (v) children.push(new Paragraph({ text: v, bullet: { level: 0 }, spacing: { after: template === "compact" ? 35 : 60 } })); };

    const name = clean(user.name) || "JobPilot Candidate"; const headline = clean(profile.headline); const location = clean(profile.location);
    children.push(new Paragraph({ text: name, alignment: AlignmentType.CENTER, spacing: { after: 40 }, style: template === "modern" ? "ModernName" : "ResumeName" }));
    if (headline) children.push(new Paragraph({ text: headline, alignment: AlignmentType.CENTER, spacing: { after: 40 }, style: "ResumeHeadline" }));
    const contact = [location, clean(user.email)].filter(Boolean).join("  |  ");
    if (contact) children.push(new Paragraph({ text: contact, alignment: AlignmentType.CENTER, spacing: { after: 140 }, style: "ResumeContact" }));
    heading("Professional Summary"); children.push(new Paragraph({ text: clean(app.tailoredApplication.tailoredSummary) || clean(profile.summary) }));
    if (experience.length) { heading("Professional Experience"); for (const item of experience) { const title = [clean(item.role), clean(item.company)].filter(Boolean).join(" — "); if (title) children.push(new Paragraph({ children: [new TextRun({ text: title, bold: true })], spacing: { before: 60, after: 15 } })); if (clean(item.duration)) children.push(new Paragraph({ children: [new TextRun({ text: clean(item.duration), italics: true })], spacing: { after: 40 } })); for (const h of list(item.highlights)) bullet(h); } }
    if (skills.length) { heading("Core Skills"); children.push(new Paragraph({ text: skills.join("  •  ") })); }
    if (education.length) { heading("Education"); for (const item of education) { const title = [clean(item.degree), clean(item.institution)].filter(Boolean).join(" — "); if (title) children.push(new Paragraph({ children: [new TextRun({ text: title, bold: true })], spacing: { after: 15 } })); if (clean(item.year)) children.push(new Paragraph({ children: [new TextRun({ text: clean(item.year), italics: true })], spacing: { after: 35 } })); } }
    if (strengths.length) { heading("Key Strengths"); for (const s of strengths) bullet(s); }
    const suggested = edits.map(e => clean(e.suggested)).filter(Boolean); if (suggested.length) { heading(`Role Alignment — ${clean(app.job.title)}`); for (const e of suggested) bullet(e); }
    children.push(new Paragraph({ children: [new TextRun({ text: `Prepared for ${clean(app.job.title) || "target role"} at ${clean(app.job.company) || "target company"}. JobPilot uses only information present in the saved candidate profile. Review before submitting.`, italics: true })], spacing: { before: 180 } }));

    const fontSize = template === "compact" ? 19 : 21;
    const doc = new Document({ styles: { default: { document: { run: { font: "Arial", size: fontSize }, paragraph: { spacing: { after: template === "compact" ? 45 : 75, line: template === "compact" ? 250 : 276 } } } }, paragraphStyles: [
      { id: "ResumeName", name: "Resume Name", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: template === "compact" ? 30 : 34, bold: true } },
      { id: "ModernName", name: "Modern Name", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 36, bold: true } },
      { id: "ResumeHeadline", name: "Resume Headline", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: template === "compact" ? 20 : 23, bold: true } },
      { id: "ResumeContact", name: "Resume Contact", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 18 } },
    ] }, sections: [{ properties: { page: { margin: { top: template === "compact" ? 600 : 720, right: 720, bottom: template === "compact" ? 600 : 720, left: 720 } } }, children }] });
    const buffer = await Packer.toBuffer(doc);
    const safe = `${clean(app.job.company) || "Company"}-${clean(app.job.title) || "Resume"}`.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 100);
    return new Response(buffer as BodyInit, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Content-Disposition": `attachment; filename="JobPilot-${safe}-${template}.docx"`, "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Could not export resume." }, { status: 500 }); }
}
