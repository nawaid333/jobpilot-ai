import mammoth from "mammoth";
import pdfParse from "pdf-parse";

const MAX_EXTRACTED_TEXT = 60_000;

export async function extractCvText(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === "application/pdf") {
    const parsed = await pdfParse(buffer);
    return normalizeCvText(parsed.text);
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
