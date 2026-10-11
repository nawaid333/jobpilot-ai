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

type PdfWorkerModule = {
  getData(): string;
};

export async function extractCvText(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === "application/pdf") {
    // pdf-parse v2 needs its own worker configured for serverless Node runtimes.
    // Load the bundled worker as a data: URL; remote https workers are not supported
    // by Node's ESM worker loader in Vercel functions.
    const workerModule = (await import("pdf-parse/worker")) as unknown as PdfWorkerModule;
    const workerDataUrl = workerModule.getData();

    // Provide native canvas globals before importing PDF.js.
    const canvas = await import("@napi-rs/canvas");
    const runtimeGlobals = globalThis as unknown as Record<string, unknown>;
    runtimeGlobals.DOMMatrix ??= canvas.DOMMatrix;
    runtimeGlobals.ImageData ??= canvas.ImageData;
    runtimeGlobals.Path2D ??= canvas.Path2D;

    const pdfModule = (await import("pdf-parse")) as unknown as PdfParseV2Module;
    pdfModule.PDFParse.setWorker(workerDataUrl);
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
