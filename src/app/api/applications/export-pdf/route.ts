import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Experience = { role?: string; company?: string; duration?: string; highlights?: string[] };
type Education = { degree?: string; institution?: string; year?: string };
type ResumeEdit = { section?: string; suggested?: string };

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BODY_SIZE = 9.5;
const LINE_HEIGHT = 13;

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeFilename(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 70) || "resume";
}

function wrap(text: string, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, size: number, width: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width || !line) line = next;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const applicationId = clean(url.searchParams.get("applicationId"));
    const app = await prisma.application.findFirst({
      where: { id: applicationId, userId: user.id },
      include: { job: true, tailoredApplication: true },
    });
    const profile = await prisma.careerProfile.findUnique({ where: { userId: user.id } });

    if (!app || !profile || !app.tailoredApplication) {
      return NextResponse.json({ error: "A saved career profile and tailored application are required." }, { status: 404 });
    }

    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

    let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    const newPageIfNeeded = (needed = 30) => {
      if (y - needed < MARGIN) {
        page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }
    };

    const drawLines = (text: string, options: { font?: typeof regular; size?: number; gap?: number; bullet?: boolean } = {}) => {
      const font = options.font || regular;
      const size = options.size || BODY_SIZE;
      const gap = options.gap ?? 2;
      const prefix = options.bullet ? "• " : "";
      const available = CONTENT_WIDTH - (options.bullet ? 12 : 0);
      const lines = wrap(text, font, size, available);
      lines.forEach((line, index) => {
        newPageIfNeeded(LINE_HEIGHT);
        page.drawText(`${index === 0 ? prefix : options.bullet ? "  " : ""}${line}`, {
          x: MARGIN,
          y,
          size,
          font,
          color: rgb(0.10, 0.11, 0.13),
        });
        y -= LINE_HEIGHT;
      });
      y -= gap;
    };

    const heading = (text: string) => {
      newPageIfNeeded(32);
      y -= 7;
      page.drawText(text.toUpperCase(), { x: MARGIN, y, size: 9, font: bold, color: rgb(0.16, 0.18, 0.21) });
      y -= 5;
      page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 0.7, color: rgb(0.75, 0.77, 0.80) });
      y -= 14;
    };

    const candidateName = clean(user.name) || "JobPilot Candidate";
    const headline = clean(profile.headline);
    const location = clean(profile.location);
    const experience = Array.isArray(profile.experience) ? profile.experience as Experience[] : [];
    const education = Array.isArray(profile.education) ? profile.education as Education[] : [];
    const skills = Array.isArray(profile.skills) ? profile.skills.map(clean).filter(Boolean) : [];
    const strengths = Array.isArray(profile.strengths) ? profile.strengths.map(clean).filter(Boolean) : [];
    const edits = Array.isArray(app.tailoredApplication.resumeEdits) ? app.tailoredApplication.resumeEdits as ResumeEdit[] : [];

    page.drawText(candidateName, { x: MARGIN, y, size: 22, font: bold, color: rgb(0.05, 0.06, 0.08) });
    y -= 27;
    if (headline) { page.drawText(headline, { x: MARGIN, y, size: 11, font: regular, color: rgb(0.30, 0.31, 0.34) }); y -= 16; }
    const contact = [location, clean(user.email)].filter(Boolean).join("  |  ");
    if (contact) { page.drawText(contact, { x: MARGIN, y, size: 8.5, font: regular, color: rgb(0.38, 0.39, 0.42) }); y -= 20; }

    heading("Professional Summary");
    drawLines(clean(app.tailoredApplication.tailoredSummary) || clean(profile.summary));

    if (skills.length) {
      heading("Core Skills");
      drawLines(skills.join("  •  "));
    }

    if (experience.length) {
      heading("Professional Experience");
      for (const item of experience) {
        const role = clean(item.role);
        const company = clean(item.company);
        const duration = clean(item.duration);
        newPageIfNeeded(45);
        page.drawText(role || company || "Experience", { x: MARGIN, y, size: 10.5, font: bold, color: rgb(0.08, 0.09, 0.11) });
        const meta = [company, duration].filter(Boolean).join("  |  ");
        if (meta) page.drawText(meta, { x: MARGIN, y: y - 13, size: 8.5, font: italic, color: rgb(0.38, 0.39, 0.42) });
        y -= meta ? 29 : 17;
        const highlights = Array.isArray(item.highlights) ? item.highlights : [];
        for (const highlight of highlights) drawLines(clean(highlight), { bullet: true, gap: 1 });
        y += 3;
      }
    }

    if (education.length) {
      heading("Education");
      for (const item of education) {
        const title = clean(item.degree);
        const meta = [clean(item.institution), clean(item.year)].filter(Boolean).join("  |  ");
        drawLines(title || meta || "Education", { font: bold, size: 9.5, gap: meta ? 0 : 2 });
        if (meta) drawLines(meta, { size: 8.5, gap: 3 });
      }
    }

    if (strengths.length) {
      heading("Strengths");
      for (const strength of strengths) drawLines(strength, { bullet: true, gap: 1 });
    }

    if (edits.length) {
      heading(`Role Alignment — ${clean(app.job.title)}`);
      for (const edit of edits) {
        const suggested = clean(edit.suggested);
        if (suggested) drawLines(`${clean(edit.section) || "Resume"}: ${suggested}`, { bullet: true, gap: 1 });
      }
    }

    newPageIfNeeded(30);
    y -= 8;
    page.drawText("JobPilot truth-first resume • Review before submitting", {
      x: MARGIN,
      y,
      size: 7.5,
      font: italic,
      color: rgb(0.48, 0.49, 0.51),
    });

    const bytes = await pdf.save();
    const filename = `JobPilot-${safeFilename(candidateName)}-${safeFilename(app.job.title)}.pdf`;
    return new Response(bytes as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not export PDF resume." }, { status: 500 });
  }
}
