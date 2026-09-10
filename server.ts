// Production server for Azure App Service: serves the built SPA and mounts the same
// api/* handlers used in dev. One process, all the existing code reused.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import analyze from "./api/analyze";
import ask from "./api/ask";
import translate from "./api/translate";
import { MAX_BODY_BYTES } from "./api/_http";

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, "dist");

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });
  app.use("/api", express.json({ limit: MAX_BODY_BYTES }));

  app.post("/api/analyze", (req, res) => analyze(req, res));
  app.post("/api/ask", (req, res) => ask(req, res));
  app.post("/api/translate", (req, res) => translate(req, res));
  app.use("/api", (req, res) => {
    const known = ["/analyze", "/ask", "/translate"].includes(req.path);
    if (known) res.setHeader("Allow", "POST");
    res.status(known ? 405 : 404).json({ error: known ? "POST only" : "not_found" });
  });

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const tooLarge = err?.type === "entity.too.large";
    const badJson = err?.type === "entity.parse.failed";
    res.status(tooLarge ? 413 : badJson ? 400 : 500).json({ error: tooLarge ? "too_large" : badJson ? "invalid_json" : "internal_error" });
  });

  app.use(express.static(dist));
  // SPA fallback: any non-api GET returns index.html.
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
  return app;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, () => console.log(`SignWise listening on :${port}`));
}
