import process from "node:process";

/**
 * Server-only OCR service using Google Gemini Vision API.
 * The .server.ts suffix prevents Vite from bundling this into the client.
 *
 * On Cloudflare Workers / Nitro, read process.env INSIDE a function
 * (module-scope reads resolve to undefined at build time).
 */

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const OCR_PROMPT = `Extract all handwritten and printed text from this image.

Requirements:
- Preserve headings exactly as written.
- Preserve bullet points and numbered lists.
- Preserve line breaks and paragraph spacing.
- Preserve indentation and text hierarchy.
- Preserve all punctuation marks.
- Correct obvious OCR spelling mistakes when confidence is high.
- Do not summarize the content.
- Do not explain the content.
- Do not add any commentary.
- Return ONLY the extracted text, nothing else.`;

// ── Public types ───────────────────────────────────────────────────────────

export interface OcrResult {
  text: string;
  confidence: number | null;
  error?: string;
}

// ── Main extraction function ───────────────────────────────────────────────

export async function extractTextWithGeminiVision(
  imageBase64: string,
  mimeType: string,
): Promise<OcrResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      text: "",
      confidence: null,
      error: "GEMINI_API_KEY is not configured on the server.",
    };
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: OCR_PROMPT },
              {
                inlineData: {
                  mimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "Unknown error");
      return {
        text: "",
        confidence: null,
        error: `Gemini API error (${response.status}): ${errorBody}`,
      };
    }

    const data = await response.json();

    const extractedText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    if (!extractedText) {
      return {
        text: "",
        confidence: null,
        error: "Gemini returned no text. The image may be unclear or empty.",
      };
    }

    // Gemini doesn't provide a numeric confidence score — estimate heuristically.
    const confidence = estimateConfidence(extractedText, data);

    return { text: extractedText, confidence };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gemini Vision request failed.";
    return { text: "", confidence: null, error: message };
  }
}

// ── Confidence heuristic ───────────────────────────────────────────────────

/**
 * Estimate OCR confidence from the Gemini response.
 * Since Gemini doesn't expose a per-word confidence score the way Tesseract
 * does, we approximate using finish-reason, word count, and character-range
 * heuristics.
 */
function estimateConfidence(
  text: string,
  response: Record<string, unknown>,
): number | null {
  try {
    const candidate = (response as any)?.candidates?.[0];
    const finishReason: string | undefined = candidate?.finishReason;

    // Non-normal stop → lower confidence
    if (finishReason && finishReason !== "STOP") return 60;

    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

    if (wordCount < 3) return 50;
    if (wordCount < 10) return 70;

    const hasStructure =
      text.includes("\n") || text.includes("•") || text.includes("-");
    const hasNormalChars = /^[\x20-\x7E\n\r\t\u00A0-\u024F•–—''""…]+$/m.test(
      text,
    );

    if (hasStructure && hasNormalChars && wordCount > 20) return 95;
    if (hasNormalChars && wordCount > 10) return 90;
    if (wordCount > 5) return 85;

    return 80;
  } catch {
    return null;
  }
}
