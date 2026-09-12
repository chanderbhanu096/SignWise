import type { IncomingMessage } from "node:http";
import { APIConnectionError, APIConnectionTimeoutError } from "openai";

export const MAX_BODY_BYTES = 8 * 1024 * 1024;
export const MAX_ANALYSIS_BYTES = 1024 * 1024;
export const MAX_QUESTION_LENGTH = 2_000;

export class ApiFailure extends Error {
  constructor(public code: string, public status = 400) {
    super(code);
  }
}

// Every call to these routes spends model quota, and the routes are open: the
// address is meant to be handed to a jury, and nothing stands between a loop and an
// empty subscription. A window per caller is the whole defence — no dependency, no
// store, and it costs nothing when nobody is abusing it.
//
// Generous on purpose. An analysis takes about a minute to read, so twenty requests
// in ten minutes is far more than a person browsing their own contract will ever
// make, and far less than a script needs to be worth running.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 20;
const MAX_CALLERS = 10_000; // bounded: a burst of unique addresses must not grow it forever
const calls = new Map<string, number[]>();

/** The client, as far as we can tell. Azure terminates TLS, so the socket is a proxy. */
export function callerKey(req: any): string {
  const forwarded = req?.headers?.["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
  return (first || req?.socket?.remoteAddress || "unknown").replace(/:\d+$/, "");
}

export function rateLimit(req: any, now = Date.now()) {
  const key = callerKey(req);
  const recent = (calls.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    calls.set(key, recent);
    throw new ApiFailure("too_many_requests", 429);
  }
  recent.push(now);
  calls.set(key, recent);
  if (calls.size > MAX_CALLERS) {
    for (const [k, times] of calls) {
      if (times.every((at) => now - at >= WINDOW_MS)) calls.delete(k);
      if (calls.size <= MAX_CALLERS) break;
    }
  }
}

/** Test hook: the window is process-wide state. */
export const resetRateLimitForTest = () => calls.clear();

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
  let failure: ApiFailure;
  const providerStatus = error && typeof error === "object" && "status" in error ? error.status : undefined;
  if (error instanceof ApiFailure) failure = error;
  else if (error instanceof APIConnectionTimeoutError) failure = new ApiFailure("request_timeout", 504);
  else if (providerStatus === 401) failure = new ApiFailure("service_authentication_failed", 503);
  else if (providerStatus === 403) failure = new ApiFailure("service_access_denied", 503);
  else if (providerStatus === 404) failure = new ApiFailure("service_configuration_error", 503);
  else if (providerStatus === 429) failure = new ApiFailure("service_limit_reached", 503);
  else if (error instanceof APIConnectionError || (typeof providerStatus === "number" && providerStatus >= 500)) {
    failure = new ApiFailure("service_unavailable", 503);
  } else failure = new ApiFailure(fallback, 502);
  // Log only our own fixed categories, never error.message/stack/body. Provider
  // errors can embed the submitted contract or authentication details.
  if (failure.status >= 500) console.warn("[SignWise request failed]", { operation: fallback, code: failure.code, status: failure.status });
  return res.status(failure.status).json({ error: failure.code });
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
