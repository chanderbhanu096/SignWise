# SignWise — Codex standards, performance and correctness audit

Audited 2026-09-14. This is a documentation deliverable; the proposed fix below is not implemented. Read `docs/audits/2026-09-14-claude-standards-performance.md` first with `cat`, then read `docs/audits/README.md`. Followed its convention: measured evidence, a bounded fix scope, and explicit declines.

Repository identity and initial working-tree state:

```text
$ git rev-parse --short HEAD
d2cfa96
$ git status --short
?? scratch-count.ts
```

The pre-existing untracked file was left alone. Commands below run from the repository root. Output blocks are actual output; excerpts are identified. Synthetic mutations are local probe inputs, not real contract facts or proposed UI filler. No live API or model calls were made by the probes.

## IN SCOPE — one proposed fix, ranked highest

### 1. High weight: Overview invents payment timing and misidentifies the payment

**Correctness and comprehension.** An expense with an amount but no `timingMonth` can be placed in the first contract month. The fallback does not require `kind === "deposit"`, yet the rendered caption calls an untimed fee a deposit. Separately, an explicitly timed deposit in the sixth contract month still receives the caption saying the first month is higher. These are incorrect timing/type claims, even though no calendar month names are invented. They violate the brief's data-honesty constraint and deserve priority over cosmetic or speculative performance work.

The schema permits missing timing. Source evidence:

```text
$ rg -n 'timingMonth|depositBump|bonusBump' src/types.ts src/i18n.ts src/sample.ts
```

Relevant actual output (excerpt):

```text
src/i18n.ts:454:  depositBump: "The first month is higher because of the deposit.",
src/i18n.ts:712:  depositBump: "Der erste Monat ist wegen der Kaution höher.",
src/types.ts:49:  timingMonth: z.number().int().min(0).max(11).nullable().optional(), // 0-11 if a known month
```

`sed -n '1,210p' src/screens/Overview.tsx` produced the following relevant excerpt:

```tsx
  // A deposit is due at the start whether or not the model said so.
  const fallback = category === "expense"
    ? items.filter((it) => it.amount != null && it.freq !== "annual" && it.freq !== "monthly").slice(0, 1).map((it) => ({ it, m: 0 }))
    : [];
  const overlay = placed.length ? placed : fallback;
```

The following executable probe renders the actual React component. It retains fixture amounts and changes only the payment kind/label or timing for explicitly synthetic cases:

```sh
node --import tsx --input-type=module <<'JS'
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Overview} from './src/screens/Overview.tsx';
import {sampleAnalysis} from './src/sample.ts';
for (const lang of ['de','en']) {
 for (const mode of ['fixture','unknown-fee','later-deposit']) {
  const a=sampleAnalysis(lang);
  const item=a.money.oneTime[0];
  if(mode==='unknown-fee') {item.kind='fee';item.label=lang==='de'?'Synthetische Gebühr':'Synthetic fee';delete item.timingMonth;}
  if(mode==='later-deposit') item.timingMonth=5;
  const h=renderToStaticMarkup(React.createElement(Overview,{analysis:a,filename:'synthetic',pages:null,onOpenClause(){},onOriginal(){},onDecision(){},onAsk(){},answer:null,asking:false,onAddCalendar(){},calMsg:''}));
  const amounts=[...h.matchAll(/class="bar-amt">([^<]+)/g)].map(m=>m[1]);
  console.log(JSON.stringify({lang,mode,input:{monthly:a.money.monthly,amount:item.amount,kind:item.kind,timingMonth:item.timingMonth??null},first:amounts[0],sixth:amounts[5],note:h.match(/class="chart-note">([^<]+)/)?.[1],compressedNote:h.includes('class="chart-scale-note"')}));
 }
}
JS
```

Actual output:

```json
{"lang":"de","mode":"fixture","input":{"monthly":1240,"amount":3000,"kind":"deposit","timingMonth":0},"first":"4.240","sixth":"1.240","note":"Der erste Monat ist wegen der Kaution höher.","compressedNote":true}
{"lang":"de","mode":"unknown-fee","input":{"monthly":1240,"amount":3000,"kind":"fee","timingMonth":null},"first":"4.240","sixth":"1.240","note":"Der erste Monat ist wegen der Kaution höher.","compressedNote":true}
{"lang":"de","mode":"later-deposit","input":{"monthly":1240,"amount":3000,"kind":"deposit","timingMonth":5},"first":"1.240","sixth":"4.240","note":"Der erste Monat ist wegen der Kaution höher.","compressedNote":true}
{"lang":"en","mode":"fixture","input":{"monthly":1240,"amount":3000,"kind":"deposit","timingMonth":0},"first":"4,240","sixth":"1,240","note":"The first month is higher because of the deposit.","compressedNote":true}
{"lang":"en","mode":"unknown-fee","input":{"monthly":1240,"amount":3000,"kind":"fee","timingMonth":null},"first":"4,240","sixth":"1,240","note":"The first month is higher because of the deposit.","compressedNote":true}
{"lang":"en","mode":"later-deposit","input":{"monthly":1240,"amount":3000,"kind":"deposit","timingMonth":5},"first":"1,240","sixth":"4,240","note":"The first month is higher because of the deposit.","compressedNote":true}
```

The probe's `compressedNote` field only detects the shared paragraph class; it does **not** establish which note is present. Exact compression-note evidence appears below. This is server rendering, not a browser layout measurement.

**Concrete definition of done for a subsequent fix:**

- Remove the unsupported timing fallback in Overview. Missing or null timing must not add an amount to any particular bar; keep that amount in the existing extras list and disclose its exclusion from the plotted projection in DE and EN. Do not silently present an incomplete projection as all contractual payments.
- Make the chart caption and existing chart `aria-label` describe the actual payment kind and supplied contract-month timing, or use accurate neutral wording. A fee must not be called a deposit; the sixth-month case must not say first month.
- Add rendered regression checks for the cases above in both languages, including missing and null timing. The unknown-fee case must have every bar equal to its recurring input; the later-deposit case must place the extra only in the supplied month. Assert totals from those inputs as **derived**, not as fabricated fixture facts. Keep exact amounts and the correctly timed existing fixture behavior.
- Preserve `payDerivedTag`, its source-clause link, contract-month labels, and `chartScaleNote` whenever compressed. Retain existing accessible controls and the print block. Put any new copy in both dictionaries and `Strings`. Use existing dependencies; no data-layer restructure or schema/export renaming.
- Verify Overview and Decision in DE and EN at 375px and 1400px, including source links, no page-level horizontal overflow, and print output. Run `npx tsc -b`, `npm test`, and `npm run build` in an environment allowing the tests' local sockets. This audit does not claim those browser checks passed.

This is one bounded chart-honesty fix, not authorization to implement changes during this documentation pass. It is distinct from all findings declined or already resolved in the Claude audit.

## OUT OF SCOPE — remaining observations, in descending weight

### 2. Medium weight: production entry point is outside the TypeScript build check

**Coding standards / verification coverage.** A clean configured TypeScript build does not establish that the production entry point is type-checked. Measured program membership, rather than inferred from filenames:

```sh
node --input-type=module <<'JS'
import ts from 'typescript';
const config=ts.readConfigFile('tsconfig.json',ts.sys.readFile);
const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,'.');
const program=ts.createProgram(parsed.fileNames,parsed.options);
for(const file of ['src/screens/Overview.tsx','api/analyze.ts','server.ts','vite.config.ts']) console.log(`${file}: ${program.getSourceFiles().some(s=>s.fileName===file||s.fileName.endsWith('/'+file))?'checked':'NOT checked'}`);
JS
```

Actual output:

```text
src/screens/Overview.tsx: checked
api/analyze.ts: checked
server.ts: NOT checked
vite.config.ts: NOT checked
```

`cat package.json` also produced these relevant lines (excerpt):

```json
    "build": "tsc -b && vite build",
    "start": "tsx server.ts",
```

**Declined:** build/server coverage is outside the pages' design surface and no production type error was demonstrated. A separate maintenance pass could add an appropriate check for runtime entry points. This does not reopen the Claude audit's `any` handler-signature finding or assert that the server is broken.

### 3. Lower weight: bundle-size baseline, no demonstrated performance regression

**Performance.** `npm run build` completed successfully; its actual emitted-size report is below. These are build artifacts and gzip estimates, not observed transfer times, runtime cost, or user latency. The separate sample chunk agrees with the prior audit's completed lazy-loading outcome. No additional loading optimization is justified by these sizes alone.

**Declined:** no browser/network profile demonstrating a bottleneck was obtained. Splitting more code or adding memoization on this evidence would be speculative. PDF processing and Upload are outside the page-design scope. No new performance finding is promoted merely because an asset is large.

### 4. Unranked follow-up candidates: visual hierarchy, intermediate widths and print

No browser rendering measurement was obtained for the Decision grouping, long commitment values, or chart scrolling at the requested widths. No usable browser automation tool was exposed in this session; local socket attempts also failed as recorded below. Server rendering does not measure CSS layout, overflow, print pagination, focus behavior, or interactive accessibility.

**Declined:** these remain verification questions, not demonstrated defects. Do not infer visual acceptance from a clean build or from the source guardrails below. A later browser pass should include the intermediate widths mentioned in the brief as well as the required widths and both languages.

### Previously declined / known items: retain the prior decisions

Evidence is the prerequisite command `cat docs/audits/2026-09-14-claude-standards-performance.md`. Its actual section titles include:

```text
## OUT OF SCOPE — do not touch in this run
## Outcome (2026-09-14, built by Codex, reviewed and accepted by Claude)
**Accepted with two open observations, neither blocking:**
```

Retain its decisions on the long Overview component, `any` in API signatures, language splitting, logo compression, and Overview memoization. Retain its two known open observations about demo-button busy feedback and the special-cased error message. No new measurement here overturns their stated reasons; their old size/count claims are not reasserted as fresh measurements. The proposed chart fix neither depends on nor reopens them.

## Verification actually performed

```text
$ npx tsc -b
[no output; exit 0]
```

The original test attempt was `npm test > /tmp/signwise-codex-audit-tests.log 2>&1`; `head -n 15 /tmp/signwise-codex-audit-tests.log` exposed this actual error (excerpt):

```text
> signwise@0.1.0 test
> tsx --test test/*.test.ts
Error: listen EPERM: operation not permitted /var/folders/x8/f2zlnwc56wn11cy9qbrzmc580000gn/T/tsx-501/30307.pipe
```

The shell wrapper's final `tail` succeeded, which is not a successful test run. Retried the same test glob without the tsx CLI IPC server:

```sh
node --import tsx --test test/*.test.ts > /tmp/signwise-codex-audit-node-tests.log 2>&1; result=$?; tail -n 10 /tmp/signwise-codex-audit-node-tests.log; exit $result
```

Actual output (exit 1):

```text
  ...
1..181
# tests 195
# suites 0
# pass 193
# fail 2
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1622.267875
```

`rg -n -A 22 -B 4 'not ok|EPERM|ERR_' /tmp/signwise-codex-audit-node-tests.log` identified the failures (actual excerpts):

```text
3:not ok 1 - model adapter validates responses and has bounded, cancellable provider calls
9:  error: 'listen EPERM: operation not permitted 127.0.0.1'
139:not ok 19 - production API returns JSON for malformed requests and unknown paths and prevents caching
145:  error: 'listen EPERM: operation not permitted 127.0.0.1'
```

These are environment-blocked local-server checks. Do not report the brief's historical all-passing count as this audit's result; the observed run above is incomplete verification.

```text
$ npm run build

> signwise@0.1.0 build
> tsc -b && vite build

vite v6.4.3 building for production...
transforming...
✓ 74 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                              0.58 kB │ gzip:   0.36 kB
dist/assets/signwise-logo-Bj4l9E7T.svg      73.14 kB │ gzip:  10.45 kB
dist/assets/pdf.worker.min-yatZIOMy.mjs  1,375.84 kB
dist/assets/index-Det-pcKS.css              47.14 kB │ gzip:  10.23 kB
dist/assets/sample-BhmGuEtM.js              71.42 kB │ gzip:  21.18 kB
dist/assets/index-CTtQBCXa.js              362.58 kB │ gzip: 115.65 kB
dist/assets/pdf-B6DRSPcb.js                366.62 kB │ gzip: 108.35 kB
✓ built in 1.97s
```

## Hard-constraint evidence and limits

Command:

```sh
rg -n 'payDerivedTag|chartScaleNote|aria-label=|RECUR_SHARE|const compressed|const months' src/screens/Overview.tsx
rg -n '@media \(max-width: 540px\)|@media print|review-card\[data-level' src/styles.css
```

Actual output (selected lines):

```text
88:  const months = Array.from({ length: 12 }, (_, i) => `${analysis.lang === "de" ? "Monat" : "Month"} ${i + 1}`);
106:  const RECUR_SHARE = 0.58;
107:  const compressed = monthly > 0 && maxBar > monthly * 1.8;
169:      aria-label={`${s.showClause}: ${label}`}
346:                      {s.payBasis(fmt(derivedPay.hourly), hoursLabel)} · <span className="derived">{s.payDerivedTag}</span>
447:                aria-label={
475:              {compressed && <p className="chart-scale-note">{s.chartScaleNote}</p>}
614:.review-card[data-level="important"] { border-left-color: var(--imp-fg); }
615:.review-card[data-level="check"] { border-left-color: var(--chk-fg); }
616:.review-card[data-level="standard"] { border-left-color: var(--std-fg); }
712:@media (max-width: 540px) {
871:@media print {
```

An exact-note probe was also run, avoiding the shared-class ambiguity above:

```sh
node --import tsx --input-type=module <<'JS'
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Overview} from './src/screens/Overview.tsx';
import {sampleAnalysis} from './src/sample.ts';
import {t} from './src/i18n.ts';
for(const lang of ['de','en']) {
 const a=sampleAnalysis(lang);
 const h=renderToStaticMarkup(React.createElement(Overview,{analysis:a,filename:'synthetic',pages:null,onOpenClause(){},onOriginal(){},onDecision(){},onAsk(){},answer:null,asking:false,onAddCalendar(){},calMsg:''}));
 console.log(JSON.stringify({lang,scaleNotePresent:h.includes(t(lang).chartScaleNote),chartAriaMentionsDeposit:h.includes(t(lang).depositBump)}));
}
JS
```

Actual output:

```json
{"lang":"de","scaleNotePresent":true,"chartAriaMentionsDeposit":true}
{"lang":"en","scaleNotePresent":true,"chartAriaMentionsDeposit":true}
```

`scaleNotePresent` establishes presence of the exact compression note for these fixture renders. The other field searches the whole HTML despite its name; it is not an isolated accessible-name assertion. These probes do not establish browser accessibility or print acceptance. All source, dictionaries, dependencies, styles and accessibility attributes are left unchanged by this audit.
