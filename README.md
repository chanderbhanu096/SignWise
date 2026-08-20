# SignWise

**Verstehen, bevor Sie unterschreiben.** — Understand before you sign.

SignWise reads a consumer contract and explains it in plain language, so someone
with no legal training knows what they are agreeing to before they sign. It
highlights the clauses that matter, shows what the contract will cost, makes
notice periods and deadlines legible, and answers *"what are the 3–5 things I
must understand before I sign?"* — always pointing back to the exact wording in
the document.

Built for the [Legal Loves Tech Hackathon 2026](https://legallovestech.de/),
challenge **StMJ (IV) — "Was unterschreibe ich? Erkläre mir meinen Vertrag"**,
under the patronage of the Bavarian Ministry of Justice.

> SignWise explains your contract; it does not replace legal advice, and never
> judges whether a clause is valid or tells you whether to sign.

## What it does

- **5 screens**: Upload → Analysis → Overview → Original document → Before you sign.
- **Findings first, chat second.** A structured summary — glance card, 3–5 ranked
  findings, cost breakdown, date timeline, rights vs. responsibilities — is the
  main experience. "Ask about this contract" is secondary and cites its source.
- **Provenance is enforced.** Every finding carries its § reference, page, and a
  verbatim quote, and the quote is checked against the document text (client-side,
  via pdf.js) before it is shown. Unverified findings are marked, not hidden.
- **Three content classes, always labelled**: *From your contract* (verbatim),
  *Explained by SignWise* (the AI's plain language), *General legal information*
  (clearly separated, never a statement about your contract).
- **Calm severity**: Important (navy) · Worth checking (amber) · Standard (green).
  Red is reserved and unused — nothing here is styled as a threat.
- **German-first, bilingual** (DE/EN), with Turkish/Ukrainian/Arabic planned for
  the users the challenge names. `Intl` formats money and dates per locale
  (`1.240 €` vs `€1,240`).
- **Accessible** (WCAG 2.2 AA): keyboard navigation, focus trapping in the clause
  panel, `aria-live` progress, `lang` on German passages inside an English UI,
  44px targets, `prefers-reduced-motion`, and a print-to-PDF summary.

## Run it

```bash
npm install
npm run dev      # full stack (Vite + the api/ handlers as dev middleware)
```

Open http://localhost:5173 and click **"Mit einem Beispielvertrag testen"** — a
real Berlin Mietvertrag, explained instantly, with nothing to upload.

```bash
npm test         # schema + quote-verification checks
npm run build    # typecheck + production build
```

## The model

Contract reading runs through **one file**: [`api/_model.ts`](api/_model.ts). It
calls a **GPT model on Azure OpenAI** when credentials are set, and falls back to
the built-in sample analysis (tagged so the UI shows a "demo mode" banner) when
they aren't — so local dev and the demo never break on a missing key.

Set the credentials (see [`.env.example`](.env.example)) in `.env.local` and as
App Settings on your Azure Web App:

```
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-azure-openai-key
AZURE_OPENAI_DEPLOYMENT=gpt-4o           # your deployment name
AZURE_OPENAI_API_VERSION=2024-10-21
```

The contract text (extracted from the PDF client-side via pdf.js, or an image
for scanned contracts via GPT-4o vision) is sent to the model, which returns the
structured `Analysis` JSON. That JSON is validated against the schema and its
quotes are verified against the document text before anything is shown. Only this
one file talks to a model — swapping to Claude, Bedrock, etc. is a one-file change.

## Deploy (Azure App Service)

The app is a single Node process ([`server.ts`](server.ts)) that serves the built
SPA and the API — no Functions rewrite, no separate API project.

1. Create a **Web App** (Linux, **Node 20 LTS**) on your Azure subscription.
2. **Deployment Center** → connect this GitHub repo/branch. Azure builds
   (`npm install && npm run build`) and starts it on every push.
3. Set the **Startup Command** to `npm start`.
4. Add the Azure OpenAI variables above under **Settings → Environment variables**.

CLI equivalent:

```bash
az webapp up --name signwise --runtime "NODE:20-lts" --sku B1
az webapp config set --name signwise --startup-file "npm start"
```

Without the Azure OpenAI settings the site still runs — in demo mode.

## Architecture

Vite + React + TypeScript SPA; three `(req,res)` handlers in `api/`
(`analyze`, `ask`, `translate`), served by [`server.ts`](server.ts) in production
and by Vite dev middleware locally. No UI framework, router, state library, chart
or icon dependency — the data contract in [`src/types.ts`](src/types.ts) (one Zod
schema) drives the API, the sample fixture, and the UI types alike.

```
server.ts         Express server for Azure App Service (serves SPA + API)
api/_model.ts     the only file that talks to a model (Azure OpenAI + fallback)
src/types.ts      the Analysis contract — one schema, everywhere
src/sample.ts     the bilingual demo contract
src/verify.ts     verbatim quote verification (pure, tested)
src/pdf.ts        client-side PDF text extraction
src/screens/      Upload · Analyzing · Overview · Original · Decision
src/components/    ClausePanel · Severity
```

## Deploy

```bash
vercel --prod
```

Set `MODEL_ID` and the Foundry credentials as environment variables once the
model call is wired in.
