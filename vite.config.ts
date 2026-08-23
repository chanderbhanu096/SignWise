import { defineConfig, loadEnv, type Connect } from "vite";
import react from "@vitejs/plugin-react";
import type { ServerResponse } from "node:http";

// Dev-only: run the same api/*.ts handlers Vercel runs in prod, as middleware.
// Handlers are plain (req, res) => void with a JSON body — no multipart, no framework.
function apiDev() {
  return {
    name: "signwise-api-dev",
    configureServer(server: { middlewares: Connect.Server; ssrLoadModule: (id: string) => Promise<any> }) {
      server.middlewares.use(async (req: any, res: ServerResponse, next: Connect.NextFunction) => {
        if (!req.url?.startsWith("/api/")) return next();
        const name = req.url.split("?")[0].slice("/api/".length);
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.ts`);
          const body = await readJson(req);
          (req as any).body = body;
          await mod.default(req, jsonRes(res));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err?.message ?? "dev api error" }));
        }
      });
    },
  };
}

function readJson(req: any): Promise<unknown> {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c: Buffer) => (raw += c));
    req.on("end", () => resolve(raw ? JSON.parse(raw) : {}));
  });
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
  // without this the dev handlers see no key and quietly serve the sample fixture
  // under the uploaded file's name. Empty prefix = load every key; loadEnv alone
  // exposes nothing to the browser bundle.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return { plugins: [react(), apiDev()] };
});
