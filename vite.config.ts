import { defineConfig, loadEnv, type Connect } from "vite";
import react from "@vitejs/plugin-react";
import type { ServerResponse } from "node:http";
import { ApiFailure, readApiJson } from "./api/_http";

// Dev-only: run the same api/*.ts handlers Azure runs in prod, as middleware.
// Handlers are plain (req, res) => void with a JSON body — no multipart, no framework.
function apiDev() {
  return {
    name: "signwise-api-dev",
    configureServer(server: { middlewares: Connect.Server; ssrLoadModule: (id: string) => Promise<any> }) {
      server.middlewares.use(async (req: any, res: ServerResponse, next: Connect.NextFunction) => {
        if (!req.url?.startsWith("/api/")) return next();
        const name = req.url.split("?")[0].slice("/api/".length);
        res.setHeader("content-type", "application/json");
        res.setHeader("cache-control", "no-store");
        res.setHeader("x-content-type-options", "nosniff");
        if (!["analyze", "ask", "translate"].includes(name)) {
          res.statusCode = 404;
          return res.end(JSON.stringify({ error: "not_found" }));
        }
        if (req.method !== "POST") {
          res.setHeader("Allow", "POST");
          res.statusCode = 405;
          return res.end(JSON.stringify({ error: "POST only" }));
        }
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.ts`);
          const body = await readApiJson(req);
          (req as any).body = body;
          await mod.default(req, jsonRes(res));
        } catch (err) {
          if (res.destroyed || res.writableEnded) return;
          res.statusCode = err instanceof ApiFailure ? err.status : 500;
          res.end(JSON.stringify({ error: err instanceof ApiFailure ? err.code : "internal_error" }));
        }
      });
    },
  };
}

// Give the dev res the res.status().json() shape the handlers use.
function jsonRes(res: ServerResponse) {
  const r = res as any;
  r.status = (code: number) => ((res.statusCode = code), r);
  r.json = (obj: unknown) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(obj));
  };
  return r;
}

export default defineConfig(({ mode }) => {
  // The api/* handlers read credentials from process.env, the way they do on Azure.
  // Vite only puts .env files on import.meta.env (client side, VITE_ prefix), so
  // without this configured dev handlers would report the service as unavailable.
  // Empty prefix = load every key; loadEnv alone
  // exposes nothing to the browser bundle.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return { plugins: [react(), apiDev()] };
});
