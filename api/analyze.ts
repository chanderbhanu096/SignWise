import { AnalysisSchema } from "../src/types";
import { analyzeContract } from "./_model";

export const config = { maxDuration: 300 };

const OK_MIME = /^(application\/pdf|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|image\/(png|jpe?g|webp))$/;
const MAX_BYTES = 4 * 1024 * 1024; // Vercel serverless JSON body limit headroom

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { lang, filename, mime, dataB64 } = req.body ?? {};

  if (typeof dataB64 !== "string" || !dataB64) return res.status(400).json({ error: "empty_file" });
  if (typeof mime !== "string" || !OK_MIME.test(mime)) return res.status(415).json({ error: "unsupported_type" });
  if (Math.ceil((dataB64.length * 3) / 4) > MAX_BYTES) return res.status(413).json({ error: "too_large" });

  try {
    const analysis = await analyzeContract({
      lang: lang === "de" ? "de" : lang || "en",
      filename: String(filename ?? "contract"),
      mime,
      dataB64,
    });
    // Never ship an analysis that doesn't satisfy the contract, even from the stub.
    return res.status(200).json(AnalysisSchema.parse(analysis));
  } catch (err: any) {
    return res.status(502).json({ error: "analysis_failed", detail: err?.message });
  }
}
