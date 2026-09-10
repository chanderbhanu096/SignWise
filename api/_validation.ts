import { z } from "zod";
import { isDeepStrictEqual } from "node:util";
import { AnalysisSchema, type Analysis } from "../src/types";
import type { AnalyzeInput } from "./_model";
import { ApiFailure, requireJsonObject, validLanguage } from "./_http";
import { canonical } from "../src/depth";

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

// A ref is a label a reader sees — "§ 6 · Seite 3" — and a translation is supposed
// to turn "Seite" into "page". What it must not change is which section and which
// page the label points at, so only that part is compared.
const refPointer = (ref?: string) => ref?.replace(/[^\d§]+/g, " ").trim();

// Translation is allowed to change prose only. Model-valid JSON can still change
// the amount due or a supporting quote; reject that response before it is shown.
function translationFacts(a: Analysis) {
  return {
    docLanguage: a.docLanguage,
    glance: a.glance.map(({ clauseId, derived }) => ({ clauseId, derived })),
    money: {
      ...a.money,
      // label is what a reader sees ("Kaution") and a translation is meant to change
      // it; clauseId is the machine link and is compared as it is.
      oneTime: a.money.oneTime.map(({ label: _label, ref, ...facts }) => ({ ...facts, ref: refPointer(ref) })),
      variable: a.money.variable.map(({ clauseId }) => ({ clauseId })),
    },
    dates: a.dates.map(({ iso, tone }) => ({ iso, tone })),
    findings: a.findings,
    rights: a.rights.map(({ clauseId }) => clauseId),
    duties: a.duties.map(({ clauseId }) => clauseId),
    // quote stays exact — it is the contract's own wording and the thing the browser
    // matches against the document.
    clauses: a.clauses.map(({ id, quote, ref, page, level, tags, legalRefs }) => ({
      id, quote, page, level, tags, ref: refPointer(ref),
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

// Numeric fields are not the only place users read an amount: glance.value, the
// explanations and the decision brief all state money in prose, and an unchanged
// money object cannot be allowed to conceal a changed displayed amount.
//
// Only money is compared, because only money survives a translation unchanged. Every
// other figure is written differently in each language by any correct translation —
// "zwölf Monate" becomes "12 months", "30. September 2027" becomes "September 30,
// 2027", "22:00 Uhr" becomes "10 PM", "einem Dritten" carries no number in English at
// all — and comparing those rejected two of four faithful translations of this app's
// own example contract, which is a language switch that never works. The figures
// behind those words are pinned exactly by translationFacts above (dates[].iso,
// money.*, freq, timingMonth), so nothing is left unchecked; this catches the one
// thing that is only ever stated in prose.
const AMOUNT = String.raw`(?<![\d.,])\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{1,2})?`;
const CURRENCY = String.raw`€|EUR|Euro|CHF|£|GBP|\$|USD|%`;
const MONEY_FIGURE = new RegExp(String.raw`(${AMOUNT})\s*(?:${CURRENCY})|(?:${CURRENCY})\s*(${AMOUNT})`, "gi");

function proseFigures(value: unknown): unknown {
  if (typeof value === "string") {
    const out = new Set<string>();
    for (const m of value.matchAll(MONEY_FIGURE)) {
      const figure = canonical(m[1] ?? m[2]);
      if (figure) out.add(figure);
    }
    return [...out].sort();
  }
  if (Array.isArray(value)) return value.map(proseFigures);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value).filter(([key, entry]) => key !== "verified" && key !== "lang" && entry !== undefined)
      .map(([key, entry]) => [key, proseFigures(entry)]),
  );
  return value;
}

// Which field broke the comparison. This message stays inside the thrown Error: it
// quotes contract prose, so it is never logged and never sent to a browser (see
// sendFailure). It exists for the person reproducing a rejection locally, because
// "translation_changed_contract_facts" alone gives no way to tell a model that
// really changed an amount from a rule that is too strict to satisfy — and this
// check has been both.
function firstDifference(a: unknown, b: unknown, path = ""): string | null {
  if (isDeepStrictEqual(a, b)) return null;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return `${path}.length ${a.length}!=${b.length}`;
    for (let i = 0; i < a.length; i++) {
      const d = firstDifference(a[i], b[i], `${path}[${i}]`);
      if (d) return d;
    }
  }
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a)) {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const d = firstDifference((a as any)[key], (b as any)[key], `${path}.${key}`);
      if (d) return d;
    }
  }
  return `${path}: ${JSON.stringify(a)?.slice(0, 80)} != ${JSON.stringify(b)?.slice(0, 80)}`;
}

export function parseTranslation(value: unknown, source: Analysis, target: string): Analysis {
  const translated = AnalysisSchema.parse(value);
  const changed =
    translated.lang !== target ? `lang: ${translated.lang} != ${target}`
      : firstDifference(translationFacts(translated), translationFacts(source), "facts")
        ?? firstDifference(proseFigures(translated), proseFigures(AnalysisSchema.parse(source)), "figures");
  if (changed) throw new Error(`translation_changed_contract_facts (${changed})`);
  // Verification is a deterministic check against the document, never a model opinion.
  return {
    ...translated,
    clauses: translated.clauses.map((clause, i) => ({ ...clause, verified: source.clauses[i].verified })),
  };
}
