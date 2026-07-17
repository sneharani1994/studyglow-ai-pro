import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Server function for OCR extraction via Gemini Vision.
 *
 * Usage from client code:
 *   import { performOcr } from "@/lib/ocr.functions";
 *   const result = await performOcr({ data: { imageBase64, mimeType } });
 *
 * The handler body runs server-only. The dynamic import of the .server.ts
 * module is guaranteed not to leak into the client bundle.
 */
export const performOcr = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      imageBase64: z.string().min(1, "Image data is required"),
      mimeType: z
        .string()
        .regex(
          /^image\/(jpeg|png|jpg|webp)$/i,
          "Unsupported image type. Use JPG, PNG, or WebP.",
        ),
    }),
  )
  .handler(async ({ data }) => {
    // Dynamic import keeps the .server module truly server-only
    const { extractTextWithGeminiVision } = await import("./ocr.server");
    return extractTextWithGeminiVision(data.imageBase64, data.mimeType);
  });
