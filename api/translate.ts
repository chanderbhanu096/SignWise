import { AnalysisSchema } from "../src/types";
import { translateAnalysis } from "./_model";
import { ApiFailure, checkAnalysisSize, requestSignal, requireJsonObject, sendFailure, validLanguage } from "./_http";
import { parseTranslation } from "./_validation";

export const config = { maxDuration: 300 };

export function createTranslateHandler(produce = translateAnalysis) {
  return async function handler(req: any, res: any) {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
    const request = requestSignal(req, res);
    try {
      const { analysis, target } = requireJsonObject(req.body);
      if (!validLanguage(target)) throw new ApiFailure("invalid_language");
      checkAnalysisSize(analysis);
      const parsed = AnalysisSchema.safeParse(analysis);
      if (!parsed.success || !validLanguage(parsed.data.lang)) throw new ApiFailure("bad_analysis");
      return res.status(200).json(parseTranslation(await produce(parsed.data, target, request.signal), parsed.data, target));
    } catch (err) {
      return sendFailure(res, err, "translate_failed");
    } finally {
      request.cleanup();
    }
  };
}

export default createTranslateHandler();
