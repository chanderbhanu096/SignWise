# SignWise

**Verstehen, bevor Sie unterschreiben.** — Understand before you sign.

SignWise reads a consumer contract and explains it in plain language, so someone
with no legal training knows what they are agreeing to before they sign. It
highlights the clauses that matter, shows what the contract will cost, makes
notice periods and deadlines legible, and answers *"what are the 3–5 things I
must understand before I sign?"* — always pointing back to the exact wording in
the document.

Built for the [Legal Loves Tech Hackathon 2026](https://legallovestech.vercel.app/),
challenge **StMJ (IV) — "Was unterschreibe ich? Erkläre mir meinen Vertrag"**,
under the patronage of the Bavarian Ministry of Justice.

**Live:** <https://signwise-hero-7c21.azurewebsites.net> — no upload needed, two
worked examples are built in.

> SignWise explains your contract. It cites the law but never applies it to your
> case, never judges whether a clause is valid, and never tells you whether to
> sign. That boundary is § 2 Abs. 1 RDG, and it is a design rule, not a footer.

## What it does

**Five screens** — Upload → Analysis → Overview → Original document → Before you sign.

**Findings first, chat second.** A structured summary — glance card, 3–5 ranked
findings, cost breakdown, date timeline, rights vs. responsibilities — is the main
experience. "Ask about this contract" is secondary and cites its source.

**The whole document, not a list of excerpts.** The original pane renders every
section of the contract and marks the passages a finding came from. It drops the
party block and the signature block on purpose: those carry the most personal data
in the file and say nothing about what you are agreeing to.

**Three explanation depths, three complete explanations.** Simple, Standard and
Detailed are not one sentence with more bolted on — each is written to be read on
its own. `depthText()` enforces the property that matters: asking for *more*
detail can never take information away. It checks the level being shown against
the ones below it and puts back any figure only a lower level carries.

**Every figure is traced.** At the detailed level, *Where these figures come from*
lists each number in the explanation and where it actually comes from — this
clause, another clause, arithmetic on figures the contract does state
(`1.190 € = 8 % × 14.880`), or nowhere in the document. This is what stops a
derived total from reading like a misquote. See
[`docs/data-fidelity-pass.md`](docs/data-fidelity-pass.md).

**Statutory benchmarks, not verdicts.** Eight benchmarks (§§ 551 I, 551 II, 573c I,
555, 309 Nr. 7, 553 I, 558 III, 309 Nr. 9 BGB) put the statute's general rule beside
your contract's own figure — *"5.800 € bei 1.450 € Nettokaltmiete — das 4,0-Fache"*
— and stop there. A test asserts no benchmark ever writes "unwirksam" or "void"
into the line describing your contract.

**Verified citations.** `src/lawindex.ts` holds 5,000 real section numbers across
30 German codes, scraped from gesetze-im-internet.de. A citation the model invents
gets no link, rather than a confident link to a 404.

**Pseudonymisation in the browser.** IBANs, addresses, e-mail addresses, phone
numbers and tax IDs are replaced with placeholders *before* the text leaves the
page, and restored in the response. Art. 5(1)(c) DSGVO data minimisation, done
where it can be checked.

**Three content classes, always labelled**: *From your contract* (verbatim),
*Explained by SignWise* (the model's plain language), *General legal information*
(clearly separated, never a statement about your contract).

**Calm severity**: Important (navy) · Worth checking (amber) · Standard (green).
Red is reserved and unused — nothing here is styled as a threat.

**German-first, bilingual** (DE/EN). `Intl` formats money and dates per locale
(`1.240 €` vs `€1,240`), and a test asserts both languages state the same figures
and order the commitment cards identically.

**Accessible** (WCAG 2.2 AA): keyboard navigation, focus trapping in the clause
panel, Escape to close, `aria-live` progress, `lang` on German passages inside an
English UI, `<html lang>` following the interface language, 44 px targets,
`prefers-reduced-motion`, and a print-to-PDF summary.

## Run it

```bash
npm install
npm run dev
```

Open <http://localhost:5173> and click **"Mietvertrags-Beispiel ansehen"** — a
Berlin Mietvertrag, explained instantly, with nothing to upload. There is a second
button for an employment contract, which exercises the income-side framing.

```bash
npm test         # 95 tests — schema, quotes, depth, provenance, law index, redaction
npm run build    # typecheck + production build
```

### Checking the demo data

```bash
npx tsx scripts/audit-demo.ts
```

Walks both fixtures in both languages and fails on: a quote that is not verbatim
in the document, a depth level that loses a figure or repeats a sentence, a level
no longer than the one below it, page numbers running backwards, a figure claimed
to be in a clause that is not, a glance value with no source in the document, or
the two languages stating different figures.

```bash
npx tsx scripts/model-audit.ts de     # needs .env.local
```

Runs the same checks against **live model output** on a ten-section contract
written to trip the statutory benchmarks.

## The model

Contract reading runs through **one file**: [`api/_model.ts`](api/_model.ts). It
calls a GPT model on **Azure OpenAI (Sweden Central)** when credentials are set,
and falls back to the built-in sample analysis — tagged, so the UI shows a demo-mode
banner — when they aren't. Local dev and the demo never break on a missing key.

```
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-azure-openai-key
AZURE_OPENAI_DEPLOYMENT=your-deployment-name
AZURE_OPENAI_API_VERSION=2024-10-21
```

Put them in `.env.local` (see [`.env.example`](.env.example)) and in **Settings →
Environment variables** on the Web App.

The contract text is extracted from the PDF **client-side** via pdf.js — a scanned
image goes to the vision model instead — pseudonymised, then sent. What comes back
is validated against the Zod schema and its quotes are verified against the
document text before anything reaches a screen. Only this one file talks to a
model, so swapping providers is a one-file change.

## Deploy (Azure App Service)

A single Node process ([`server.ts`](server.ts)) serves the built SPA and the API —
no Functions rewrite, no separate API project.

1. Create a **Web App** (Linux, **Node 20 LTS**).
2. Set the **Startup Command** to `npm start`.
3. Add the Azure OpenAI variables under **Settings → Environment variables**.
4. Deploy from GitHub (Deployment Center) or by zip.

```bash
npm run build
zip -qr deploy.zip dist api src server.ts package.json package-lock.json \
    tsconfig.json index.html vite.config.ts -x "*.DS_Store"
az webapp deploy --resource-group <rg> --name <app> --src-path deploy.zip --type zip
```

Two things worth knowing, both learned the hard way:

- `SCM_DO_BUILD_DURING_DEPLOYMENT` is on, so App Service runs `npm run build`
  itself — the zip needs the **sources** (`index.html`, `vite.config.ts`), not just
  `dist/`.
- A zip deploy **never deletes**. Files removed from the repo stay on the server
  until you pass `--clean true`. And because `server.ts` has an SPA fallback, a
  missing file answers **200** with `index.html` — check the content type, not the
  status code, when you are verifying that something is gone.

Without the Azure OpenAI settings the site still runs, in demo mode.

## Architecture

Vite + React + TypeScript SPA; three `(req,res)` handlers in `api/` (`analyze`,
`ask`, `translate`), served by [`server.ts`](server.ts) in production and by Vite
dev middleware locally. No UI framework, router, state library, chart or icon
dependency. The data contract in [`src/types.ts`](src/types.ts) — one Zod schema —
drives the API, the fixture and the UI types alike.

```
server.ts            Express server for Azure App Service (SPA + API)
api/_model.ts        the only file that talks to a model
api/analyze|ask|translate.ts

src/types.ts         the Analysis contract — one schema, everywhere
src/sample.ts        the bilingual demo contracts (rental + employment)

src/depth.ts         figure extraction + the three explanation depths
src/provenance.ts    where each figure in an explanation comes from
src/lawcheck.ts      statutory benchmarks — cite the rule, never the verdict
src/lawindex.ts      5,000 real section numbers (generated)
src/redact.ts        browser-side pseudonymisation
src/decision.ts      the "Before you sign" brief
src/document.ts      splitting the contract into readable blocks
src/verify.ts        verbatim quote verification (pure, tested)
src/pdf.ts           client-side PDF text extraction
src/contract.ts      official law URLs, gated on the index
src/i18n.ts          all strings, DE + EN

src/screens/         Upload · Analyzing · Overview · Original · Decision
src/components/      ClausePanel · FigureSources · DepthPicker · LegalNotice
                     Severity · Section · Slogan · ConfirmDialog

scripts/audit-demo.ts    end-to-end checks over the fixtures
scripts/model-audit.ts   the same checks against live model output
scripts/build-law-index.mjs
```

## Documentation

- [`docs/data-fidelity-pass.md`](docs/data-fidelity-pass.md) — why the explanation
  disagreed with the contract: eight issues, each with its cause, its fix, and the
  test that fails if it comes back.
- [`docs/legal-quality-pass.md`](docs/legal-quality-pass.md) — the scoring rubric,
  the statutory benchmarks, pseudonymisation, and the RDG/DSGVO/KI-VO boundary.
- [`docs/qa-end-user-pass.md`](docs/qa-end-user-pass.md) — end-user QA findings.
