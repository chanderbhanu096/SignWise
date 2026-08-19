import { AnalysisSchema } from "../src/types";
import { askContract } from "./_model";

export const config = { maxDuration: 120 };

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { question, analysis } = req.body ?? {};
  if (typeof question !== "string" || !question.trim()) return res.status(400).json({ error: "empty_question" });

  const parsed = AnalysisSchema.safeParse(analysis);
  if (!parsed.success) return res.status(400).json({ error: "bad_analysis" });

  try {
    return res.status(200).json(await askContract(question, parsed.data));
  } catch (err: any) {
    return res.status(502).json({ error: "ask_failed", detail: err?.message });
  }
}
