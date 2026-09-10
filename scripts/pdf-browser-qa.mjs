import { createServer } from "vite";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Synthetic local checks only. Do not load the application's Vite config or
// environment files: the harness must never mount the Azure-backed API routes.
const root = fileURLToPath(new URL("../", import.meta.url));
const page = new URL("./pdf-browser-qa.html", import.meta.url);
const server = await createServer({
  configFile: false,
  envDir: false,
  publicDir: false,
  root,
  server: { host: "127.0.0.1", port: 5194, strictPort: true },
  plugins: [{
    name: "local-pdf-quality-harness",
    configureServer(vite) {
      vite.middlewares.use(async (req, res, next) => {
        const route = req.url?.split("?")[0];
        if (route?.startsWith("/api/")) {
          res.statusCode = 503;
          res.setHeader("content-type", "application/json");
          return res.end(JSON.stringify({ error: "local_test_only" }));
        }
        if (route !== "/__pdfqa") return next();
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.end(await readFile(page, "utf8"));
      });
    },
  }],
});
await server.listen();
console.log("Local PDF regression harness: http://127.0.0.1:5194/__pdfqa");
console.log("Click Run all PDF checks. Fixtures are synthetic; API requests stay local.");
