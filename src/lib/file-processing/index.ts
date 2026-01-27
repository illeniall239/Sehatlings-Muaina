import { extractTextFromPDF } from "./pdf-extractor";
import { extractTextFromPdfWithOCR } from "./ocr";
import { extractTextFromDOCX } from "./docx-extractor";

export interface ExtractionResult {
  text: string;
  pageCount?: number;
  metadata?: Record<string, unknown>;
}

export async function extractTextFromFile(
  buffer: Buffer,
  fileType: "pdf" | "docx"
): Promise<ExtractionResult> {
  if (fileType === "pdf") {
    let pdfError: string | null = null;
    try {
      const result = await extractTextFromPDF(buffer);
      if (result.text && result.text.trim().length >= 50) {
        return {
          text: result.text,
          pageCount: result.pageCount,
          metadata: result.metadata,
        };
      }
      pdfError = "PDF text was empty or too short";
    } catch (error) {
      pdfError = error instanceof Error ? error.message : String(error);
    }

    // Fallback to OCR for scanned PDFs or empty text
    try {
      const ocrResult = await extractTextFromPdfWithOCR(buffer);
      if (!ocrResult.text || ocrResult.text.trim().length === 0) {
        throw new Error("OCR could not extract any text from the PDF.");
      }

      return {
        text: ocrResult.text,
        metadata: {
          ocrUsed: true,
          ocrPages: ocrResult.pagesProcessed,
          pdfError,
        },
      };
    } catch (ocrError) {
      const ocrMessage = ocrError instanceof Error ? ocrError.message : String(ocrError);
      throw new Error(
        `Failed to extract text from PDF. PDF parse error: ${pdfError}. OCR error: ${ocrMessage}`
      );
    }
  } else {
    const result = await extractTextFromDOCX(buffer);
    return {
      text: result.text,
      metadata: { messages: result.messages },
    };
  }
}

export { extractTextFromPDF } from "./pdf-extractor";
export { extractTextFromDOCX } from "./docx-extractor";
