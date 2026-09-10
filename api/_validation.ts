import { z } from "zod";
import { isDeepStrictEqual } from "node:util";
import { AnalysisSchema, type Analysis } from "../src/types";
import type { AnalyzeInput } from "./_model";
import { ApiFailure, requireJsonObject, validLanguage } from "./_http";
import { facts } from "../src/depth";

const MAX_TEXT = 200_000;
const MAX_IMG_BYTES = 4 * 1024 * 1024;
const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function parseAnalyzeInput(body: unknown): AnalyzeInput {
  const { lang = "en", filename, mime, text, dataB64, images } = requireJsonObject(body);
  if (!validLanguage(lang)) throw new ApiFailure("invalid_language");
  const hasText = typeof text === "string" && text.trim().length > 0;
  if (images !== undefined) {
    if (hasText || dataB64 || mime !== "application/pdf" || !Array.isArray(images) || !images.length) throw new ApiFailure("invalid_request");
    if (images.length > 12) throw new ApiFailure("too_many_pages", 413);
    let total = 0;
    for (const image of images) {
      if (typeof image !== "string" || !image.startsWith("data:image/jpeg;base64,")) throw new ApiFailure("invalid_image");
      const base64 = image.slice("data:image/jpeg;base64,".length);
      validateImage(base64, "image/jpeg");
      total += Buffer.byteLength(base64, "base64");
      if (total > MAX_IMG_BYTES) throw new ApiFailure("scan_too_large", 413);
    }
    return { lang, filename: typeof filename === "string" ? filename.slice(0, 255) : "contract", mime, images };
  }
  if (hasText) {
    if (text.length > MAX_TEXT) throw new ApiFailure("text_too_long", 413);
    return { lang, filename: typeof filename === "string" ? filename.slice(0, 255) : "contract", mime: "text/plain", text };
  }
  if (typeof dataB64 !== "string" || !dataB64) throw new ApiFailure("no_readable_content");
  if (typeof mime !== "string" || !IMAGE_MIMES.has(mime)) throw new ApiFailure("unsupported_type", 415);
  validateImage(dataB64, mime);
  return { lang, filename: typeof filename === "string" ? filename.slice(0, 255) : "contract", mime, dataB64 };
}

function validateImage(dataB64: string, mime: string) {
  if (dataB64.length > Math.ceil(MAX_IMG_BYTES / 3) * 4) throw new ApiFailure("too_large", 413);
  if (dataB64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(dataB64)) {
    throw new ApiFailure("invalid_image");
  }
  const bytes = Buffer.from(dataB64, "base64");
  if (bytes.length > MAX_IMG_BYTES) throw new ApiFailure("too_large", 413);
  const matching = mime === "image/jpeg"
    ? bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : mime === "image/png"
      ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (!matching) throw new ApiFailure("invalid_image");
}

const AnswerSchema = z.object({ answer: z.string().trim().min(1).max(12_000), clauseId: z.string().min(1).nullable().optional() });

export function parseAnswer(value: unknown, analysis: Analysis): { answer: string; clauseId: string | null } {
  const result = AnswerSchema.parse(value);
  if (result.clauseId && !analysis.clauses.some((clause) => clause.id === result.clauseId)) {
    throw new Error("unknown_answer_source");
  }
  return { answer: result.answer, clauseId: result.clauseId ?? null };
}

// Translation is allowed to change prose only. Model-valid JSON can still change
// the amount due or a supporting quote; reject that response before it is shown.
function translationFacts(a: Analysis) {
  return {
    docLanguage: a.docLanguage,
    glance: a.glance.map(({ clauseId, derived }) => ({ clauseId, derived })),
    money: {
      ...a.money,
      oneTime: a.money.oneTime.map(({ label: _label, ...facts }) => facts),
      variable: a.money.variable.map(({ clauseId }) => ({ clauseId })),
    },
    dates: a.dates.map(({ iso, tone }) => ({ iso, tone })),
    findings: a.findings,
    rights: a.rights.map(({ clauseId }) => clauseId),
    duties: a.duties.map(({ clauseId }) => clauseId),
    clauses: a.clauses.map(({ id, quote, ref, page, level, tags, legalRefs }) => ({
      id, quote, ref, page, level, tags,
      legalRefs: legalRefs?.map(({ law, section }) => ({ law, section })),
    })),
    confidence: a.confidence,
    decisionSummary: a.decisionSummary && {
      commitments: a.decisionSummary.commitments.map(({ clauseId }) => clauseId),
      reviewItems: a.decisionSummary.reviewItems.map(({ clauseId }) => clauseId),
      understandingQuestions: a.decisionSummary.understandingQuestions?.map(({ clauseId }) => clauseId),
      clarificationQuestions: a.decisionSummary.clarificationQuestions.map(({ clauseId }) => clauseId),
    },
  };
}

// Numeric fields are not the only place users read money and dates: glance.value,
// explanations and the decision brief all contain prose. Check each corresponding
// field so an unchanged money object cannot conceal a changed displayed amount.
// This is a conservative figure check, not a proof of semantic equivalence.
const MONTH_WORDS = [
  "jan|januar|january", "feb|februar|february", "mär|märz|mar|march", "apr|april", "mai|may", "jun|juni|june",
  "jul|juli|july", "aug|august", "sep|sept|september", "okt|oct|oktober|october", "nov|november", "dez|dec|dezember|december",
];
function proseFigures(value: unknown): unknown {
  if (typeof value === "string") {
    const normalized = MONTH_WORDS.reduce((text, names, i) => text
      .replace(new RegExp(`(\\b\\d{1,2}\\.?\\s+)(?:${names})\\b`, "gi"), `$1${i + 1}`)
      .replace(new RegExp(`\\b(?:${names})\\b(?=\\.?\\s+\\d{1,2}\\b)`, "gi"), String(i + 1)), value);
    return [...facts(normalized)].sort();
  }
  if (Array.isArray(value)) return value.map(proseFigures);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value).filter(([key, entry]) => key !== "verified" && key !== "lang" && entry !== undefined)
      .map(([key, entry]) => [key, proseFigures(entry)]),
  );
  return value;
}

export function parseTranslation(value: unknown, source: Analysis, target: string): Analysis {
  const translated = AnalysisSchema.parse(value);
  if (translated.lang !== target || !isDeepStrictEqual(translationFacts(translated), translationFacts(source)) ||
      !isDeepStrictEqual(proseFigures(translated), proseFigures(AnalysisSchema.parse(source)))) {
    throw new Error("translation_changed_contract_facts");
  }
  // Verification is a deterministic check against the document, never a model opinion.
  return {
    ...translated,
    clauses: translated.clauses.map((clause, i) => ({ ...clause, verified: source.clauses[i].verified })),
  };
}
