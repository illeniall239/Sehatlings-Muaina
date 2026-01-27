import mammoth from "mammoth";

export interface DOCXExtractionResult {
  text: string;
  messages: string[];
}

export async function extractTextFromDOCX(
  buffer: Buffer
): Promise<DOCXExtractionResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });

    return {
      text: result.value,
      messages: result.messages.map((m) => m.message),
    };
  } catch (error) {
    console.error("DOCX extraction error:", error);
    throw new Error("Failed to extract text from DOCX");
  }
}
