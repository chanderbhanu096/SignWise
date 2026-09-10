import { AnalysisSchema } from "../src/types";
import { askContract } from "./_model";
import { ApiFailure, checkAnalysisSize, MAX_QUESTION_LENGTH, requestSignal, requireJsonObject, sendFailure, validLanguage } from "./_http";
import { parseAnswer } from "./_validation";

export const config = { maxDuration: 120 };

export function createAskHandler(produce = askContract) {
  return async function handler(req: any, res: any) {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
    const request = requestSignal(req, res);
    try {
      const { question, analysis } = requireJsonObject(req.body);
      if (typeof question !== "string" || !question.trim()) throw new ApiFailure("empty_question");
      if (question.length > MAX_QUESTION_LENGTH) throw new ApiFailure("question_too_long");
      checkAnalysisSize(analysis);
      const parsed = AnalysisSchema.safeParse(analysis);
      if (!parsed.success || !validLanguage(parsed.data.lang)) throw new ApiFailure("bad_analysis");
      return res.status(200).json(parseAnswer(await produce(question.trim(), parsed.data, request.signal), parsed.data));
    } catch (err) {
      return sendFailure(res, err, "ask_failed");
    } finally {
      request.cleanup();
    }
  };
}

export default createAskHandler();
