# SignWise quality review — 10 September 2026

Review base: `1cbd6cd` · Branch: `codex/quality-judge-user-review`

This pass examined the latest Git version from three perspectives: whether the
product behaves reliably, whether a short demonstration earns trust, and whether
someone unfamiliar with German contracts can use it. It combined code review,
synthetic regression cases and browser walkthroughs. No private contracts were
used. The fixes described below are on the local review branch. No GitHub push,
merge to master or Azure deployment is part of this pass.

## 1. Product quality and data integrity

| Problem found | Why it mattered | Change implemented |
| --- | --- | --- |
| Translations survived a change of contract. | Switching the next upload into English could show the previous contract's analysis. | `ContractSession` owns translations and cancellation. Starting over clears the cache; abandoned tickets cannot update the page or refill it. |
| Cancellation only changed the screen. Late answers and translations could still arrive. | Old work could overwrite a new result, and requests continued after the person left. | Cancellation reaches extraction, browser requests and the model client. Session and request checks also discard late responses. |
| Missing model credentials substituted rental sample data for an upload. | A reader could mistake invented sample costs for their own contract. | The API returns an unavailable-service error. Prepared examples remain a separate, explicit option. |
| Translation could change facts while remaining valid JSON; failure left the interface and analysis in different languages. | A translated amount, deadline or source could disagree with the original. | Validate unchanged structured facts, quotes, references and per-field prose figures. Keep the previous language and show an error if translation fails. This is a conservative check, not proof of equivalent meaning. |
| A quote was accepted when only its first sentence matched. Scans could inherit model-generated verification flags. | An invented second sentence could appear verified. | Match the full normalized quote. Clear model verification flags; images and scans remain explicitly unverified. |
| Scanned or mixed PDFs could lose content or be sent as unsupported raw PDF bytes. | A readable page could hide an unreadable page or embedded image from analysis. | Inspect text and drawing operations. Render all pages when any content needs vision, preserving page order. Enforce 12 pages and a 4 MB combined image budget. Reject blank or unreadable documents. |
| Currency display rounded away cents; some currency labels could crash formatting. | The number shown could differ from the obligation. | Preserve meaningful currency precision and show an unknown supplied label without inventing a replacement currency. |
| Date provenance treated date components as an unordered set. Equal amounts could suppress distinct commitments. | Different dates could appear to match, and a deposit equal to the rent could disappear. | Match dates and times by position; deduplicate commitments using their source clause as well as their figures. |
| An underscore in a contract template could truncate all following terms. | A blank amount field could hide later sections in the contract view. | Restrict footer removal to recognizable signature-only endings; retain substantive text after blanks. |
| API parsing and errors were inconsistent; invalid answers and invented source IDs were accepted. | Bad requests could crash development middleware, and failures could disclose internal error content. | Bound request sizes, validate input and output, normalize safe JSON failures, check answer sources, disable response caching and stop multiplying provider failures through retries. |
| Calendar text was not escaped and dates were not validated. | A malformed date or newline could produce an invalid or misleading reminder file. | Validate real ISO dates, escape text, include event identity and timestamp, fold UTF-8 lines and defer download cleanup. See [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545). |

The main implementation areas are [`App.tsx`](../src/App.tsx),
[`session.ts`](../src/session.ts), [`pdf.ts`](../src/pdf.ts),
[`api/_validation.ts`](../api/_validation.ts), [`verify.ts`](../src/verify.ts),
[`provenance.ts`](../src/provenance.ts) and [`ics.ts`](../src/ics.ts).

## 2. Demo credibility and judge perspective

The emphasis was on making the demonstration inspectable, with a clear boundary
between prepared examples, model output and deterministic checks.

- **Examples now open immediately and identify themselves as prepared examples.**
  The old simulated analysis delay suggested live work where none was happening.
  A rental-example shortcut also appears near the top of the landing page.
- **Facts now have usable source links where the analysis supplies a clause ID.**
  Rent, deposit and other overview values can be checked without searching through
  the finding list. Missing source IDs do not produce invented links.
- **The chart no longer invents a calendar or payment schedule.** It used to start
  every contract in October 2026 and place deposits or bonuses in assumed months.
  It now shows only the recurring base amount across numbered months, with extra
  payments and exclusions explained separately.
- **Absence of a detected issue no longer looks like approval.** Neutral messages
  replace green ticks. Rule coverage is described as supported comparisons, not
  a guarantee that every relevant provision was checked.
- **Statutory comparisons were narrowed and corrected.** The recurring-services
  rule now reflects the current one-month notice provisions and insurance
  exclusion in [§ 309 no. 9 BGB](https://www.gesetze-im-internet.de/bgb/__309.html).
  Liability and subletting pattern checks no longer treat common exceptions as
  blanket exclusions. These remain limited wording checks, not a legal opinion.
- **Sample wording is more careful.** A suggested early rental reminder is
  labelled as a reminder, not the final contractual deadline. Payment explanations
  avoid adding unsupported claims about when funds must reach an account.
- **Privacy and verification copy matches the implementation.** It no longer
  promises universal masking, complete extracted text, universal quote verification
  or deployment-specific retention settings that have not been established.
- **Saved summaries retain caveats.** Example, scan and confidence notices remain
  visible when printing; a saved brief should not look more certain than the page.

## 3. End-user journey and accessibility

The walkthrough covered a first-time reader, a person moving between German and
English, and keyboard/mobile use.

| Friction or failure | Resulting behavior |
| --- | --- |
| A blank animated headline delayed the explanation of the product. | The first slogan is visible immediately. Animation can be paused and responds to reduced-motion preferences. |
| Cancellation was hidden for 15 seconds. | Cancel is available from the start, and progress is described as an estimate rather than measured completion. |
| Empty uploads, omitted MIME types and multiple dropped files were poorly handled. | Empty and multiple-file choices receive explicit errors. Supported file extensions supply missing MIME information consistently. |
| A scan could send visible personal details without a document-specific pause. | Before any photo or rendered PDF pages leave the browser, a confirmation explains unmasked details and unavailable independent quote verification. Declining returns to upload. |
| Q&A erased the question and could submit while another request was pending. | Keep the draft, show the answered question, cap input at 2,000 characters, prevent overlapping submissions and disable Q&A during translation. Errors read as errors rather than answers. |
| The legal panel allowed focus to escape, and background content remained interactive. | Both panels trap keyboard focus, make the background inert, lock background scrolling, close on Escape and return focus to their opener. |
| View changes could leave focus at a removed control or the old scroll position. | New screens focus their heading; source navigation preserves the selected passage. |
| The contract screen claimed completeness even for images. | Readable PDFs show extracted text with limitations; image mode explicitly presents detected excerpts. Figure-source labels also retain unverified-source status. |

These changes preserve the existing visual design and the three-screen structure.
The goal was a clearer, more dependable journey, not a new visual theme.

## Verification and performance

| Check | Recorded result |
| --- | --- |
| Baseline automated suite | 105 tests passing before this review. |
| New client regression suite | 18 tests passing. Fetch is mocked and restored between cases; no model requests. |
| Expanded automated suite | **170/170 pass**, including API boundaries, model-adapter retries and cancellation, PDF payloads, quote fidelity, figures, commitments and calendar exports. |
| Browser walkthroughs | Rental and employment examples in German and English; 1440 px desktop and 375 px mobile. Source navigation, new-contract reset, panel focus traps, Escape and return focus checked. No page overflow or application console errors observed in those journeys. |
| Real browser PDF harness | **12/12 pass** after the initial run exposed blank-page handling gaps. Covers readable, scanned, mixed, blank, trailing-blank, embedded-image, vector-signature, malformed, over-limit and cancelled documents, plus transport privacy. |
| Upload and error walkthrough | Synthetic empty/damaged PDFs, unavailable-service errors for readable PDFs and confirmed images, image-consent cancellation, DE/EN error translation, and retained Q&A drafts checked in the real UI against an isolated no-key server. No sample substitution. |
| Demo fidelity audit | Rental and employment fixtures pass in both languages; calculated dates remain explicitly identified. |
| Production build | Passes. Main JavaScript decreased from 763.77 kB to **417.35 kB** before gzip (130.38 kB gzipped). The 366.61 kB PDF chunk loads only when needed. |
| Dependencies | **`npm audit` reports 0 vulnerabilities**, including development dependencies. The lockfile resolves `qs` 6.16.0; Vite moved from 5.x to 6.4.3. Maintainer references: [qs advisories](https://github.com/ljharb/qs/security/advisories), [Vite advisories](https://github.com/vitejs/vite/security/advisories). |
| Publication | Local review branch. No GitHub push, merge to master or new Azure deployment. |

The PDF harness and browser checks use synthetic documents. Automated request
tests do not establish live Azure model quality, latency or cost. Bundle figures
refer to generated JavaScript files, not total page weight or measured load time.

To reproduce: run `npm test`, `npm run build`, `npm audit` and
`npx tsx scripts/audit-demo.ts`. For actual PDF rendering, run
`npm run test:pdf-browser`, open <http://127.0.0.1:5194/__pdfqa> and select
**Run all PDF checks**. This harness disables application configuration and
environment loading, blocks API routes, and uses only synthetic documents.

## Remaining limits and deployment work

- **Model meaning can still be wrong.** Valid JSON, an existing source ID, matching
  wording and preserved numbers do not prove that an explanation is accurate or
  complete. The prose-figure guard also cannot establish semantic equivalence.
- **Scans remain imperfect.** Small print, handwriting, poor images and unusual
  layouts can be misread. PDFs with decorative graphics may conservatively use
  image mode, sending more visible information and giving up independent text
  verification. The confirmation explains this tradeoff.
- **Text masking is partial.** Pattern matching can miss names and other personal
  information. Rendered images are not masked. The upload should contain only
  information the person is allowed to share.
- **Rule coverage is deliberately limited.** Statutory comparisons use a small set
  of wording patterns and a bundled source index. A missed match is not evidence
  that a contract complies with the law. Source availability is not applicability
  to an individual case.
- **Live deployment behavior was not verified in this pass.** No new Azure model
  calls or deployment were performed. Region, provider retention, diagnostic logs,
  quotas and actual processing configuration need confirmation in Azure.
- **Public-service controls need deployment decisions.** Configure appropriate
  rate limiting, spending limits, monitoring and abuse controls before treating
  this prototype as an unrestricted production service. Request size limits alone
  do not provide those controls.
- **The operator must supply accurate privacy information.** Controller identity,
  contact details, processing arrangements and retention statements must reflect
  the actual deployment; code inspection cannot establish them.

The remaining items are distinct from the reproducible code and interface bugs
fixed here. They require operational configuration, broader model evaluation or
specialist review rather than a stronger claim in the interface.
