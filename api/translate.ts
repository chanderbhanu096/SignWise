import { AnalysisSchema } from "../src/types";
import { translateAnalysis } from "./_model";

export const config = { maxDuration: 300 };

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { analysis, target } = req.body ?? {};
  if (typeof target !== "string" || !target) return res.status(400).json({ error: "no_target" });

  const parsed = AnalysisSchema.safeParse(analysis);
  if (!parsed.success) return res.status(400).json({ error: "bad_analysis" });

  try {
    return res.status(200).json(AnalysisSchema.parse(await translateAnalysis(parsed.data, target)));
  } catch (err: any) {
    return res.status(502).json({ error: "translate_failed", detail: err?.message });
  }
}
