import { AnalysisSchema } from "../src/types";
import { analyzeContract } from "./_model";
import { requestSignal, sendFailure } from "./_http";
import { parseAnalyzeInput } from "./_validation";

export const config = { maxDuration: 300 };

export function createAnalyzeHandler(produce = analyzeContract) {
  return async function handler(req: any, res: any) {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
    const request = requestSignal(req, res);
    try {
      const analysis = await produce(parseAnalyzeInput(req.body), request.signal);
      return res.status(200).json(AnalysisSchema.parse(analysis));
    } catch (err) {
      return sendFailure(res, err, "analysis_failed");
    } finally {
      request.cleanup();
    }
  };
}

export default createAnalyzeHandler();
