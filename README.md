# SignWise

**Verstehen, bevor Sie unterschreiben.** — Understand before you sign.

SignWise reads a contract and explains it in plain language, clause by clause, in
German or English. The point is that you know what you are agreeing to before you
sign it.

It will not tell you whether to sign. That is a lawyer's job, and in Germany there
is a law about it — § 2 Abs. 1 RDG. So SignWise explains, quotes and cites, and
stops there. That boundary is a design rule, not a footer.

**[Try it →](https://signwise-hero-7c21.azurewebsites.net)** Two example contracts
are built in, so there is nothing to upload.

Built for the [Legal Loves Tech Hackathon 2026](https://legallovestech.vercel.app/),
challenge **StMJ (IV) — "Was unterschreibe ich? Erkläre mir meinen Vertrag"**, under
the patronage of the Bavarian Ministry of Justice.

## What you get

Drop in a PDF — or open one of the examples — and you land on three screens.

**Overview** is the summary: the 3–5 things that actually matter, ranked, each one a
click away from the sentence it came from. Under it, what the contract costs you and
when, and the dates you cannot miss.

**Contract text** is your whole document, not a list of excerpts. Every numbered
section is clickable and has its own explanation — including the dull ones, because
dull depends on who is reading. A German rental contract is full of sections a native
speaker skips and a newcomer cannot parse at all. Colour is reserved for the sections
that need attention; the rest are quiet, and still explained.

**Before you sign** is the brief: what you are committing to, what deserves a second
look, and questions worth putting to the other side.

There is also a question box that answers only from your contract and points back at
the clause it used.

Every explanation comes at three depths — Simple, Standard, Detailed. Each one is a
complete explanation written to be read on its own, not a sentence bolted onto the
one below it. Asking for more detail can never take a figure away; `src/depth.ts`
enforces that rather than trusting the model to remember.

## How it stays honest

A contract explainer that gets a number wrong is worse than no explainer. Five things
keep that from happening.

1. **Quotes are verified against the document** in the browser, before anything is
   rendered. A passage SignWise cannot find is marked unverified rather than shown as
   if it were the contract.

2. **Every figure is traced.** At the detailed level, *Where these figures come from*
   says of each number whether it is in this clause, in another clause, arithmetic on
   figures the contract does state (`1.190 € = 8 % × 14.880`), or nowhere in the
   document. That last case is what used to read as a misquote —
   see [`docs/data-fidelity-pass.md`](docs/data-fidelity-pass.md).

3. **Citations are looked up, not invented.** [`src/lawindex.ts`](src/lawindex.ts)
   holds close to 6,000 real section numbers across 30 German codes, scraped from
   gesetze-im-internet.de. A § the model makes up gets no link, rather than a
   confident link to a 404.

4. **Statutes are quoted, never applied.** Eight benchmarks put the statute's general
   rule beside your contract's own figure — *"5.800 € bei 1.450 € Nettokaltmiete — das
   4,0-Fache"* — and stop there. A test fails if any of them ever writes "unwirksam"
   or "void" into the line describing your contract.

5. **Personal data never leaves the page.** IBANs, addresses, e-mail addresses, phone
   numbers and tax IDs are replaced with placeholders in the browser before the text
   is sent, and put back in the answer.

Three content classes are labelled on every screen and never blend: *From your
contract* (verbatim), *Explained by SignWise* (plain language), *General legal
information* (never a statement about your contract).

German and English are checked against each other, not just translated: a script
fails the build if the two languages state different figures anywhere on the screen.

Keyboard navigation, focus trapping, `aria-live` progress, `lang` on German passages
inside an English page, 44 px targets, `prefers-reduced-motion` and a print-to-PDF
summary — WCAG 2.2 AA.

## Run it

```bash
npm install
npm run dev
```

Open <http://localhost:5173> and click **"Mietvertrags-Beispiel ansehen"**. The
examples need no API key — a Berlin rental contract and an employment contract, both
explained instantly.

```bash
npm test                        # 100 tests
npm run build                   # typecheck + production build
```

The one worth knowing about is the demo audit:

```bash
npx tsx scripts/audit-demo.ts
```

It walks both example contracts in both languages and fails on: a quote that is not
verbatim in the document, a depth level that loses a figure or repeats a sentence, a
level no longer than the one below it, page numbers running backwards, a figure
claimed to be in a clause that is not, a glance value with no source in the document,
and the two languages stating different figures.

With a key in `.env.local`, the same checks run against **live model output** on a
contract written to trip every statutory benchmark:

```bash
npx tsx scripts/model-audit.ts de
```

## Connecting a model

Contract reading goes through one file: [`api/_model.ts`](api/_model.ts). It calls a
GPT model on Azure OpenAI when credentials are set, and falls back to the built-in
sample — tagged, so the UI shows a demo banner — when they are not. Local dev and the
public demo never break on a missing key.

```
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-azure-openai-key
AZURE_OPENAI_DEPLOYMENT=your-deployment-name
AZURE_OPENAI_API_VERSION=2024-10-21
```

Put them in `.env.local` (see [`.env.example`](.env.example)) and, on Azure, under
**Settings → Environment variables**.

PDF text is extracted in the browser with pdf.js — a scan with no text layer goes to
the vision model instead — then pseudonymised, then sent. What comes back is validated
against a Zod schema and its quotes are checked against the document before any of it
reaches a screen. Because only this one file talks to a model, swapping providers is a
one-file change.

## The audio briefing (optional)

The Overview offers a two-voice spoken summary, about two minutes, in German or
English. It is built from the explanation already on the screen — the top three
findings, one key date, and a line telling you to go back to the original. The
contract itself never leaves the server, and nothing is generated until the reader
picks a language and asks for it.

```
ELEVENLABS_API_KEY=your-elevenlabs-api-key
ELEVENLABS_HOST_VOICE_ID=your-first-voice-id
ELEVENLABS_GUIDE_VOICE_ID=your-second-voice-id
```

Leave them unset and the card does not appear at all — the same rule the rest of the
app follows: a feature that cannot work should not offer itself.

## Deploying (Azure App Service)

One Node process ([`server.ts`](server.ts)) serves the built SPA and the API. No
Functions, no separate API project.

1. Create a **Web App** (Linux, **Node 20 LTS**).
2. Set the **Startup Command** to `npm start`.
3. Add the Azure OpenAI variables under **Settings → Environment variables**.
4. Deploy from GitHub (Deployment Center), or by zip:

```bash
npm run build
zip -qr deploy.zip dist api src server.ts package.json package-lock.json \
    tsconfig.json index.html vite.config.ts -x "*.DS_Store"
az webapp deploy --resource-group <rg> --name <app> --src-path deploy.zip --type zip
```

Two things that cost an afternoon each:

- `SCM_DO_BUILD_DURING_DEPLOYMENT` is on, so App Service runs `npm run build` itself.
  The zip needs the **sources** (`index.html`, `vite.config.ts`), not just `dist/`.
- A zip deploy **never deletes**. Files removed from the repo stay on the server until
  you pass `--clean true`. And because `server.ts` has an SPA fallback, a missing file
  answers **200** with `index.html` — check the content type, not the status code,
  when you are verifying that something is gone.

## Where things are

Vite + React + TypeScript, three `(req,res)` handlers in `api/`, no router, no state
library, no UI framework, no chart or icon dependency. One Zod schema in
[`src/types.ts`](src/types.ts) drives the API, the fixture and the UI types alike.

```
server.ts              Express server for Azure App Service (SPA + API)
api/_model.ts          the only file that talks to a model
api/analyze|ask|translate.ts

src/types.ts           the Analysis contract — one schema, everywhere
src/sample.ts          the two example contracts, DE + EN

src/depth.ts           figure extraction and the three explanation depths
src/provenance.ts      where each figure in an explanation comes from
src/lawcheck.ts        statutory benchmarks — cite the rule, never the verdict
src/lawindex.ts        ~6,000 real section numbers (generated)
src/redact.ts          browser-side pseudonymisation
src/decision.ts        the "before you sign" brief
src/document.ts        splitting the contract into readable sections
src/verify.ts          verbatim quote verification (pure, tested)
src/pdf.ts             client-side PDF text extraction
src/contract.ts        official law URLs, gated on the index
src/i18n.ts            every string, DE + EN

src/screens/           Upload · Analyzing · Overview · Original · Decision
src/components/        ClausePanel · FigureSources · DepthPicker · LegalNotice
                       Severity · Section · Slogan · ConfirmDialog

scripts/audit-demo.ts  end-to-end checks over the example contracts
scripts/model-audit.ts the same checks against live model output
```

## Notes

- [`docs/data-fidelity-pass.md`](docs/data-fidelity-pass.md) — why the explanation
  once disagreed with the contract: every issue with its cause, its fix, and the test
  that fails if it comes back.
- [`docs/legal-quality-pass.md`](docs/legal-quality-pass.md) — the scoring rubric, the
  statutory benchmarks, pseudonymisation, and the RDG / DSGVO / KI-VO boundary.
- [`docs/qa-end-user-pass.md`](docs/qa-end-user-pass.md) — end-user QA findings.
