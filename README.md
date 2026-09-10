<div align="center">
  <img
    src="https://github.com/user-attachments/assets/7de15e54-9a30-4903-8cfe-667697f1a9b5"
    alt="SignWise Logo"
    width="180"
  />

  <h1>SignWise</h1>

  <h3>AI-Powered Contract Understanding</h3>

  <p>
    <b>Understand your contract before you sign it.</b>
  </p>

  <p>
    <a href="https://signwise-hero-7c21.azurewebsites.net">
      <img src="https://img.shields.io/badge/Live%20Demo-Visit%20SignWise-4F46E5.svg" alt="Live Demo">
    </a>
    <a href="https://www.typescriptlang.org/">
      <img src="https://img.shields.io/badge/TypeScript-blue.svg" alt="TypeScript">
    </a>
    <a href="https://react.dev/">
      <img src="https://img.shields.io/badge/React-61DAFB.svg" alt="React">
    </a>
    <a href="https://vite.dev/">
      <img src="https://img.shields.io/badge/Vite-646CFF.svg" alt="Vite">
    </a>
  </p>
</div>

---

SignWise helps you understand a German or English contract before signing.
Upload a document, explore its costs, deadlines and obligations, and open the
quoted passage behind a finding.

**[Try the live demo](https://signwise-hero-7c21.azurewebsites.net/)** — rental and
employment examples open instantly. Their explanations are prepared in advance;
opening an example does not run a new AI analysis.

## What SignWise gives you

- **A quick overview** of important costs, dates and responsibilities.
- **Plain-language explanations** at Simple, Standard or Detailed depth.
- **Contract text and source passages** beside their explanations.
- **A before-you-sign brief** with commitments, review points and useful questions.
- **Contract-based answers** that link back to the supporting clause.
- **German and English** throughout the experience.

SignWise explains what the document says. It does not decide whether a clause is
valid, provide legal advice or tell you whether to sign.

## How it works

![Animated SignWise workflow: upload, extract, protect, analyse, verify and explain](docs/signwise-workflow.svg)

1. **Upload** — choose one PDF, JPG, PNG or WebP file, up to 4 MB. PDFs can have
   up to 12 pages.
2. **Extract** — readable PDF text is extracted in your browser. PDFs containing
   scans, images or vector graphics conservatively use images of all pages, so
   visible content is not silently dropped. Even decorative graphics can trigger
   this mode.
3. **Protect** — recognised identifiers in text are replaced with placeholders
   before sending and restored in the browser afterwards. This is best-effort
   masking; names and other sensitive details may remain. Filenames stay local.
4. **Analyse** — Azure OpenAI returns findings, amounts, dates, explanations and
   source references in a structured response.
5. **Verify** — Zod checks the response structure. Where extracted text is
   available, quoted wording is matched against it.
6. **Explain** — explore the result in Overview, Contract Text and Before You Sign.

Before any photo or PDF page images are sent, SignWise asks you to confirm that
you want to share the visible details without masking. You can cancel instead.
Rendered PDF images have a combined image-data limit of 4 MB. Their quotes are
**not independently verified**. The PDF file itself stays in your browser.

A quote match checks wording, not whether an explanation is correct, complete or
legally sound. Text extraction and AI analysis can miss content; check important
points against your original file.

## The three screens

### Overview

Main facts, important findings, costs and deadlines. Available source links open
the supporting clause. The chart projects only the recurring monthly base amount;
additional payments are listed separately.

### Contract text

Extracted text split into readable sections, with selectable source passages.
The view can omit identifying or signature blocks, and extraction may be incomplete.
For scans and images, it shows detected excerpts rather than the complete document.

### Before you sign

A practical summary of your commitments, points worth reviewing and questions to
clarify with the other party.

## Run locally

You need Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open <http://localhost:5173> and choose one of the example contracts.

```bash
npm test       # automated checks
npm run build  # type-check and create the production build
```

The prepared examples and their language switch work without an API key. Asking
a new question or analysing your own upload requires the model connection below.

## Connect Azure OpenAI

Copy [`.env.example`](.env.example) to `.env.local` and add:

```env
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_DEPLOYMENT=your-deployment-name
AZURE_OPENAI_API_VERSION=2025-01-01-preview
```

The model integration is isolated in [`api/_model.ts`](api/_model.ts). If the
credentials are missing or the service cannot be reached, uploads show an error;
they are never replaced with sample results. The prepared examples remain available.

### If an upload fails

- **AI connection needs updating:** check that the Azure endpoint and key belong
  to the same resource. Local `.env.local` settings can differ from the deployed
  app. Restart the development server after changing them; never commit keys.
- **Capacity or usage limit:** wait and check the Azure deployment's limits.
- **Timed out or cut short:** retry, or use a shorter document. Cancellation stays
  available, and failed output is never presented as your analysis.

Authentication, timeout and invalid-response failures are reported separately.
Server diagnostics record safe categories, not contract text or provider error
messages. See the [OpenAI error-code guidance](https://developers.openai.com/api/docs/guides/error-codes).

## Project structure

```text
api/                  Model-backed analyse, ask and translate endpoints
src/screens/          Upload, progress, overview, contract and decision screens
src/components/       Shared interface components
src/types.ts          Zod schema shared by the API and interface
src/redact.ts         Browser-side identifier pseudonymisation
src/session.ts        Per-contract cancellation and translation cache
src/verify.ts         Verbatim quote verification
src/depth.ts          Explanation-depth consistency checks
src/lawcheck.ts       General statutory comparisons without legal verdicts
scripts/              Demo and model audit scripts
server.ts             Express server for the SPA and API on Azure
```

PDF extraction loads only when a PDF is selected, keeping the initial page and
example journey lighter.

## Deploy to Azure App Service

SignWise runs as one Node process: Express serves the built React app and the three
API endpoints.

1. Create a Linux Web App using Node.js 20 or newer.
2. Set the startup command to `npm start`.
3. Add the Azure OpenAI variables in the Web App settings.
4. Deploy the repository with build-on-deploy enabled.

For zip deployments, use `--clean true` so files removed from the repository do not
remain on the server.

## Useful technical notes

- [`docs/quality-review-2026-09-10.md`](docs/quality-review-2026-09-10.md) records the
  latest quality review, fixes and checks.
- [`docs/data-fidelity-pass.md`](docs/data-fidelity-pass.md) explains the checks that
  keep figures and quotes tied to the contract.
- [`docs/qa-end-user-pass.md`](docs/qa-end-user-pass.md) records the end-user QA pass.
