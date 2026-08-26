import { AnalysisSchema, type Analysis, type Lang } from "./types";
import { jsonEscape, redact, type Redaction } from "./redact";

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

// Send extracted text when we have it (PDFs), else the raw image bytes for vision.
//
// Text is pseudonymised first (src/redact.ts): bank details, contact data and
// addresses are swapped for placeholders here in the browser and swapped back into
// the response here too, so the model host never receives them. A scanned upload has
// no text layer and goes as pixels, which cannot be filtered — the upload screen
// says so rather than implying a protection that isn't there.
export async function analyze(file: File, lang: Lang, text: string | null): Promise<Analysis> {
  const body: Record<string, unknown> = { lang, filename: file.name, mime: file.type };
  let restore: Redaction["restore"] = (s) => s;
  if (text && text.trim()) {
    const r = redact(text);
    body.text = r.text;
    restore = r.restore;
  } else {
    body.dataB64 = await fileToB64(file);
  }

  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err?.error ?? `http_${res.status}`);
  }
  // Restore on the raw JSON, before parsing: a placeholder can sit in any string
  // field the model wrote, including the verbatim quotes that get checked against
  // the original document.
  const raw = await res.text();
  return AnalysisSchema.parse(JSON.parse(restore(raw, jsonEscape)));
}

// The analysis carries the contract's verbatim quotes, so these two calls send the
// same personal data as the first one and get the same treatment. Redacting the
// serialised body works because a placeholder is JSON-safe wherever it lands.
export async function ask(question: string, analysis: Analysis): Promise<{ answer: string; clauseId: string | null }> {
  const { text, restore } = redact(JSON.stringify({ question, analysis }));
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: text,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err?.error ?? `http_${res.status}`);
  }
  return JSON.parse(restore(await res.text(), jsonEscape));
}

export async function translate(analysis: Analysis, target: Lang): Promise<Analysis> {
  const { text, restore } = redact(JSON.stringify({ analysis, target }));
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: text,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err?.error ?? `http_${res.status}`);
  }
  return AnalysisSchema.parse(JSON.parse(restore(await res.text(), jsonEscape)));
}

// Does this deployment have ElevenLabs credentials at all? Anything other than a
// clear yes counts as no, so a broken or missing endpoint hides the card rather
// than offering a button that cannot work.
export async function audioAvailable(): Promise<boolean> {
  try {
    const res = await fetch("/api/audio");
    return res.ok && (await res.json())?.configured === true;
  } catch {
    return false;
  }
}

// The contract itself is never included in this call. The server turns the
// existing analysis into a short script and sends only that script to ElevenLabs.
export async function createAudioBriefing(analysis: Analysis, language: "de" | "en"): Promise<Blob> {
  const res = await fetch("/api/audio", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ analysis, language }),
  });
  if (!res.ok) throw new ApiError((await res.json().catch(() => ({})))?.error ?? `http_${res.status}`);
  return res.blob();
}
