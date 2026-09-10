import type { IncomingMessage } from "node:http";

export const MAX_BODY_BYTES = 8 * 1024 * 1024;
export const MAX_ANALYSIS_BYTES = 1024 * 1024;
export const MAX_QUESTION_LENGTH = 2_000;

export class ApiFailure extends Error {
  constructor(public code: string, public status = 400) {
    super(code);
  }
}

export function validLanguage(value: unknown): value is string {
  return typeof value === "string" && value.length <= 35 && /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(value);
}

export function requireJsonObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiFailure("invalid_request");
  return value as Record<string, unknown>;
}

export function checkAnalysisSize(analysis: unknown) {
  if (Buffer.byteLength(JSON.stringify(analysis) ?? "") > MAX_ANALYSIS_BYTES) throw new ApiFailure("too_large", 413);
}

// Never send provider messages or schema errors back to a browser: they can
// contain contract excerpts, infrastructure details, and request identifiers.
export function sendFailure(res: any, error: unknown, fallback: string) {
  if (res.destroyed || res.writableEnded) return;
  return error instanceof ApiFailure
    ? res.status(error.status).json({ error: error.code })
    : res.status(502).json({ error: fallback });
}

export function requestSignal(req: any, res: any) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const close = () => { if (!res.writableEnded) abort(); };
  req.on?.("aborted", abort);
  res.on?.("close", close);
  if (req.aborted || res.destroyed) abort();
  return {
    signal: controller.signal,
    cleanup() {
      req.off?.("aborted", abort);
      res.off?.("close", close);
    },
  };
}

// JSON parsing belongs inside a rejecting promise. Throwing from an event
// callback bypasses middleware's catch block and can stop the dev server.
export function readApiJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let failed = false;
    req.on("data", (chunk: Buffer) => {
      if (failed) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        failed = true;
        chunks.length = 0;
        reject(new ApiFailure("too_large", 413));
      } else chunks.push(chunk);
    });
    req.on("end", () => {
      if (failed) return;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new ApiFailure("invalid_json"));
      }
    });
    req.on("error", reject);
    req.on("aborted", () => reject(new ApiFailure("request_aborted")));
  });
}
