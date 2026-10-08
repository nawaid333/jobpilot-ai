import mammoth from "mammoth";

const MAX_EXTRACTED_TEXT = 60_000;

type PdfParseV2Module = {
  PDFParse: new (options: { data: Buffer }) => {
    getText(): Promise<{ text: string }>;
    destroy(): Promise<void>;
  };
};

export async function extractCvText(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === "application/pdf") {
    // Load v2 at runtime to avoid TypeScript resolving stale v1 declarations
    // in a cached build. package.json pins the supported v2 release.
    const pdfModule = (await import("pdf-parse")) as unknown as PdfParseV2Module;
    const parser = new pdfModule.PDFParse({ data: buffer });
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
    .replace(/\\u0000/g, "")
    .replace(/[ \\t]+/g, " ")
    .replace(/\\n{3,}/g, "\\n\\n")
    .trim();

  if (!normalized) {
    throw new Error("No readable text was found in the CV.");
  }

  return normalized.slice(0, MAX_EXTRACTED_TEXT);
}
