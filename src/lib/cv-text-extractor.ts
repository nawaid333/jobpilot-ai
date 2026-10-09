import mammoth from "mammoth";

const MAX_EXTRACTED_TEXT = 60_000;

type PdfParseV2Module = {
  PDFParse: {
    setWorker(workerSrc?: string): string;
    new (options: { data: Buffer }): {
      getText(): Promise<{ text: string }>;
      destroy(): Promise<void>;
    };
  };
};

export async function extractCvText(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === "application/pdf") {
    // Load v2 at runtime to avoid TypeScript resolving stale v1 declarations
    // in a cached build. package.json pins the supported v2 release.
    // PDF.js expects browser canvas globals that are not present in Vercel's Node runtime.
    // Supply the native Node implementations before importing pdf-parse/PDF.js.
    const canvas = await import("@napi-rs/canvas");
    const runtimeGlobals = globalThis as unknown as Record<string, unknown>;
    runtimeGlobals.DOMMatrix ??= canvas.DOMMatrix;
    runtimeGlobals.ImageData ??= canvas.ImageData;
    runtimeGlobals.Path2D ??= canvas.Path2D;

    const pdfModule = (await import("pdf-parse")) as unknown as PdfParseV2Module;
    // Vercel webpack omits PDF.js worker assets from the server bundle. Pin the
    // matching pdf-parse worker explicitly so PDF.js does not resolve a missing chunk.
    pdfModule.PDFParse.setWorker("https://cdn.jsdelivr.net/npm/pdf-parse@2.4.5/dist/pdf-parse/web/pdf.worker.mjs");
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
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) {
    throw new Error("No readable text was found in the CV.");
  }

  return normalized.slice(0, MAX_EXTRACTED_TEXT);
}
