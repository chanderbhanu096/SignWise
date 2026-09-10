import { AnalysisSchema, type Analysis, type Lang } from "./types";
import { jsonEscape, redact, type Redaction } from "./redact";
import { contractMimeType } from "./upload";

async function fileToB64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  }
  return btoa(bin);
}

export class ApiError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

async function post(path: string, body: string, signal?: AbortSignal): Promise<string> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) cancel();
  // Longer than the provider's 180-second per-attempt limit, but still an overall
  // cap covering retries. Cancellation remains available throughout the wait.
  const timeout = setTimeout(() => controller.abort(new ApiError("request_timeout")), 210_000);
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiError(typeof err?.error === "string" ? err.error : `http_${res.status}`);
    }
    return await res.text();
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted) throw new ApiError("request_timeout");
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}

// Send extracted text when we have it (PDFs), else the raw image bytes for vision.
//
// Text is pseudonymised first (src/redact.ts): bank details, contact data and
// addresses are swapped for placeholders here in the browser and swapped back into
// the response here too, so the model host never receives them. A scanned upload has
// no text layer and goes as pixels, which cannot be filtered — the upload screen
// says so rather than implying a protection that isn't there.
export async function analyze(file: File, lang: Lang, text: string | null, signal?: AbortSignal, images?: string[]): Promise<Analysis> {
  // A filename can itself contain a person's name or address. It has no bearing
  // on explaining the contract and stays in the browser.
  const body: Record<string, unknown> = { lang, mime: contractMimeType(file) };
  let restore: Redaction["restore"] = (s) => s;
  if (images?.length) {
    body.images = images;
  } else if (text && text.trim()) {
    const r = redact(text);
    body.text = r.text;
    restore = r.restore;
  } else {
    body.dataB64 = await fileToB64(file);
  }

  // Restore on the raw JSON, before parsing: a placeholder can sit in any string
  // field the model wrote, including the verbatim quotes that get checked against
  // the original document.
  const raw = await post("/api/analyze", JSON.stringify(body), signal);
  return AnalysisSchema.parse(JSON.parse(restore(raw, jsonEscape)));
}

// The analysis carries the contract's verbatim quotes, so these two calls send the
// same personal data as the first one and get the same treatment. Redacting the
// serialised body works because a placeholder is JSON-safe wherever it lands.
export async function ask(question: string, analysis: Analysis, signal?: AbortSignal): Promise<{ answer: string; clauseId: string | null }> {
  const { text, restore } = redact(JSON.stringify({ question, analysis }));
  const result = JSON.parse(restore(await post("/api/ask", text, signal), jsonEscape));
  if (!result || typeof result.answer !== "string" || !result.answer.trim() ||
    (result.clauseId !== null && !analysis.clauses.some((c) => c.id === result.clauseId))) {
    throw new ApiError("ask_failed");
  }
  return result;
}

export async function translate(analysis: Analysis, target: Lang, signal?: AbortSignal): Promise<Analysis> {
  const { text, restore } = redact(JSON.stringify({ analysis, target }));
  return AnalysisSchema.parse(JSON.parse(restore(await post("/api/translate", text, signal), jsonEscape)));
}
