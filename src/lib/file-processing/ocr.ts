import Anthropic from "@anthropic-ai/sdk";

export interface OcrResult {
  text: string;
  pagesProcessed: number;
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Extract text from a scanned PDF using Claude Vision API.
 * Sends the PDF directly to Claude for text extraction.
 * Claude can read PDF documents natively.
 */
export async function extractTextFromPdfWithOCR(
  buffer: Buffer,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _maxPages: number = 5
): Promise<OcrResult> {
  // Check if API key is available
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured. Cannot perform OCR.");
  }

  try {
    // Convert PDF buffer to base64
    const base64Pdf = buffer.toString("base64");

    // Send PDF directly to Claude for text extraction
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64Pdf,
              },
            },
            {
              type: "text",
              text: `Extract ALL text from this medical/pathology document.

Instructions:
- Extract every piece of text visible in the document
- Preserve the structure and layout as much as possible
- Include ALL values, numbers, dates, reference ranges, and medical terms exactly as they appear
- Format table data in a readable way
- Include headers, footers, patient info, and all sections
- Do NOT add any commentary, interpretation, or analysis
- Return ONLY the extracted text content

Begin extraction:`,
            },
          ],
        },
      ],
    });

    // Extract text from response
    const extractedText =
      response.content[0].type === "text" ? response.content[0].text : "";

    if (!extractedText || !extractedText.trim()) {
      throw new Error("Claude could not extract any text from the PDF.");
    }

    return {
      text: extractedText.trim(),
      pagesProcessed: 1, // Claude processes the entire document at once
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Claude Vision OCR error:", message);
    throw new Error(`Failed to extract text using Claude Vision: ${message}`);
  }
}
