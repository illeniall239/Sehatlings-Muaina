import path from "path";
import { pathToFileURL } from "url";

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
