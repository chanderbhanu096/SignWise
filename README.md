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
calls **Claude on Azure AI Foundry** (`claude-opus-5`) when credentials are set,
and falls back to the built-in sample analysis (tagged so the UI shows a "demo
mode" banner) when they aren't — so local dev and the demo never break on a
missing key.

Set the credentials (see [`.env.example`](.env.example)) in `.env.local` and in
your Vercel project:

```
ANTHROPIC_FOUNDRY_RESOURCE=your-foundry-resource-name
ANTHROPIC_FOUNDRY_API_KEY=your-foundry-project-api-key
MODEL_ID=claude-opus-5           # your Foundry deployment name
```

The PDF is sent to the model as a base64 document block; the model returns the
structured `Analysis` JSON, which is validated against the schema and whose
quotes are verified against the document text client-side before anything is
shown. The same seam fits the Anthropic API or Azure OpenAI with a one-file
change.

> **Foundry billing note:** Claude on Foundry is an Azure Marketplace purchase
> billed in Claude Consumption Units. It does **not** work on credit-only,
> sponsored, or free-trial subscriptions, and with a card on file the **card is
> charged, not Azure credits**.

## Architecture

Vite + React + TypeScript SPA; three Vercel serverless functions in `api/`
(`analyze`, `ask`, `translate`). No UI framework, router, state library, chart
or icon dependency — the data contract in [`src/types.ts`](src/types.ts) (one Zod
schema) drives the API, the sample fixture, and the UI types alike.

```
api/_model.ts     the only file that talks to a model (stub → Foundry next)
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
