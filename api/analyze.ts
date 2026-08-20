import { AnalysisSchema } from "../src/types";
import { analyzeContract } from "./_model";

export const config = { maxDuration: 300 };

const MAX_TEXT = 200_000; // ~50k tokens of contract text
const MAX_IMG_BYTES = 4 * 1024 * 1024;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { lang, filename, mime, text, dataB64 } = req.body ?? {};

  const hasText = typeof text === "string" && text.trim().length > 0;
  const hasImage = typeof dataB64 === "string" && dataB64.length > 0;
  if (!hasText && !hasImage) return res.status(400).json({ error: "no_readable_content" });
  if (hasText && text.length > MAX_TEXT) return res.status(413).json({ error: "too_large" });
  if (!hasText && hasImage) {
    if (!/^image\//.test(String(mime))) return res.status(415).json({ error: "unsupported_type" });
    if (Math.ceil((dataB64.length * 3) / 4) > MAX_IMG_BYTES) return res.status(413).json({ error: "too_large" });
  }

  try {
    const analysis = await analyzeContract({
      lang: lang === "de" ? "de" : lang || "en",
      filename: String(filename ?? "contract"),
      mime: String(mime ?? ""),
      text: hasText ? text : undefined,
      dataB64: hasImage ? dataB64 : undefined,
    });
    // Never ship an analysis that doesn't satisfy the contract, even from the stub.
    return res.status(200).json(AnalysisSchema.parse(analysis));
  } catch (err: any) {
    return res.status(502).json({ error: "analysis_failed", detail: err?.message });
  }
}
