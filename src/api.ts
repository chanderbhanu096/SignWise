import { AnalysisSchema, type Analysis, type Lang } from "./types";

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
export async function analyze(file: File, lang: Lang, text: string | null): Promise<Analysis> {
  const body: Record<string, unknown> = { lang, filename: file.name, mime: file.type };
  if (text && text.trim()) body.text = text;
  else body.dataB64 = await fileToB64(file);

  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json?.error ?? `http_${res.status}`);
  return AnalysisSchema.parse(json);
}

export async function ask(question: string, analysis: Analysis): Promise<{ answer: string; clauseId: string | null }> {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question, analysis }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json?.error ?? `http_${res.status}`);
  return json;
}

export async function translate(analysis: Analysis, target: Lang): Promise<Analysis> {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ analysis, target }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json?.error ?? `http_${res.status}`);
  return AnalysisSchema.parse(json);
}
