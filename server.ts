// Production server for Azure App Service: serves the built SPA and mounts the same
// api/* handlers used in dev. One process, all the existing code reused.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import analyze from "./api/analyze";
import ask from "./api/ask";
import translate from "./api/translate";

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, "dist");

const app = express();
app.use(express.json({ limit: "8mb" }));

app.post("/api/analyze", (req, res) => analyze(req, res));
app.post("/api/ask", (req, res) => ask(req, res));
app.post("/api/translate", (req, res) => translate(req, res));

app.use(express.static(dist));
// SPA fallback: any non-api GET returns index.html.
app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`SignWise listening on :${port}`));
