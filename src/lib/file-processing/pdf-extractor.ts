import path from "path";
import { pathToFileURL } from "url";

// Polyfill DOMMatrix for Node.js/serverless environments (required by pdfjs-dist)
if (typeof globalThis.DOMMatrix === "undefined") {
  // @ts-expect-error — minimal polyfill, only needs the properties pdfjs uses for text extraction
  globalThis.DOMMatrix = class DOMMatrix {
    a: number; b: number; c: number; d: number; e: number; f: number;
    m11: number; m12: number; m21: number; m22: number; m41: number; m42: number;
    is2D = true; isIdentity = false;
    constructor(init?: number[] | string) {
      if (Array.isArray(init) && init.length >= 6) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init;
      } else {
        this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
      }
      this.m11 = this.a; this.m12 = this.b;
      this.m21 = this.c; this.m22 = this.d;
      this.m41 = this.e; this.m42 = this.f;
    }
    transformPoint(point?: { x?: number; y?: number }) {
      const x = point?.x ?? 0, y = point?.y ?? 0;
      return { x: this.a * x + this.c * y + this.e, y: this.b * x + this.d * y + this.f };
    }
    inverse() { return new DOMMatrix(); }
    multiply() { return new DOMMatrix(); }
    scale() { return new DOMMatrix(); }
    translate() { return new DOMMatrix(); }
  };
}

async function loadPdfjs() {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (pdfjsLib.GlobalWorkerOptions) {
    const workerPath = path.resolve(
      process.cwd(),
      "node_modules",
      "pdfjs-dist",
      "legacy",
      "build",
      "pdf.worker.mjs"
    );
    pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).toString();
  }
  return pdfjsLib;
}

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  metadata: {
    title?: string;
    author?: string;
    creationDate?: Date;
  };
}

/**
 * Extract text from a PDF using pdf-parse library.
 * Works well for text-based PDFs but not for scanned documents.
 */
export async function extractTextFromPDF(
  buffer: Buffer
): Promise<PDFExtractionResult> {
  try {
    const pdfjsLib = await loadPdfjs();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
    });
    const pdf = await loadingTask.promise;
    const maxPages = pdf.numPages;
    let fullText = "";

    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .filter((item) => "str" in item)
        .map((item) => (item as { str: string }).str)
        .join(" ");
      fullText += `\n${pageText}`;
    }

    return {
      text: fullText.trim(),
      pageCount: maxPages,
      metadata: {
        title: undefined,
        author: undefined,
        creationDate: undefined,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("PDF extraction error:", message);
    throw new Error(
      `Failed to extract text from PDF. If this is a scanned PDF, text extraction will fail. Details: ${message}`
    );
  }
}
