import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

const MAX_EXTRACTED_TEXT = 60_000;

export async function extractCvText(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === "application/pdf") {
    // pdf-parse v2 uses its supported PDFParse API and avoids v1's
    // legacy test-data loader, which fails in serverless deployments.
    const parser = new PDFParse({ data: buffer });
    try {
      const parsed = await parser.getText();
      return normalizeCvText(parsed.text);
    } finally {
      await parser.destroy();
    }
  }

  if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const parsed = await mammoth.extractRawText({ buffer });
    return normalizeCvText(parsed.value);
  }

  throw new Error("Unsupported CV file type.");
}

function normalizeCvText(text: string) {
  const normalized = text
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) {
    throw new Error("No readable text was found in the CV.");
  }

  return normalized.slice(0, MAX_EXTRACTED_TEXT);
}
