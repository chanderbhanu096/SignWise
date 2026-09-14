# SignWise — audit findings for the builder

Audited 2026-09-14 on branch `codex/quality-judge-user-review` at commit `c99a915`.
Every claim below was measured, not estimated; the command that produced it is given.

Baseline: `npm test` 201 pass / 0 fail, `npx tsc -b` clean, `npm run build` clean.

---

## IN SCOPE — fix these two

### P1. Both demo contracts ship to every visitor (performance)

`src/sample.ts` is **82KB / 1172 lines** of analysis fixture data for the two
built-in example contracts. `src/App.tsx:4-11` imports it **statically**, so it
is bundled into the main chunk and downloaded by everyone — including a visitor
who uploads their own PDF and never opens a demo.

Evidence:

```
$ grep -c "Kastanienallee" dist/assets/index-*.js   → 1  (present)
$ ls -la src/sample.ts                              → 85231 bytes
$ ls -la dist/assets/index-*.js                      → 432493 bytes
```

The codebase already has the pattern to fix this. `src/App.tsx:196` defers the
PDF extractor exactly this way:

```ts
const { extractPdfText } = await import("./pdf");
```

**Task:** defer `./sample` the same way, so its payload loads only when a
visitor actually opens one of the two demo contracts. Six named exports are
involved (`sampleAnalysis`, `SAMPLE_DOC_TEXT`, `SAMPLE_FILENAME`,
`employmentAnalysis`, `EMPLOYMENT_DOC_TEXT`, `EMPLOYMENT_FILENAME`); find their
use sites before moving anything.

**Definition of done:** `grep -c "Kastanienallee" dist/assets/index-*.js`
returns 0 after `npm run build`, the string appears in some other emitted chunk,
and both demo buttons still load their contract with no visible delay or flash.
Report the before/after byte size of the main chunk.

**Watch out:** the demo path is synchronous today. Making it async must not
introduce a state where the UI has committed to "a contract is loaded" before
the data arrives. If the honest fix needs a loading state, say so rather than
papering over it — a half-rendered contract screen is worse than the 82KB.

### S2. Inline style props that compete with the stylesheet (standards)

`src/screens/Overview.tsx` has **18** remaining `style={{…}}` props. This pattern
already caused one shipped bug in this exact file: an inline `minWidth: 54` on
the chart columns silently outranked the `@media (max-width: 540px)` rule, so
the phone width never governed and the CSS said one thing while the page did
another. Two heading overrides of the same shape were removed in `c99a915`.

**Task:** move to CSS *only* those inline values that a stylesheet rule also
targets, or that a responsive rule would plausibly need to reach — a size, a
width, a display mode on an element that already carries a class. Leave one-off
spacing (`marginTop: 12` on an element no rule targets) alone; converting those
is churn, not a fix.

**Definition of done:** rendering is pixel-identical. State which props you moved
and which you deliberately left, with the reason.

---

## OUT OF SCOPE — do not touch in this run

These are real, and they are deliberately excluded. Changing them here would
make the diff unreviewable.

- **`Overview.tsx` is 655 lines in one component.** A genuine long-function
  smell. It is also the file that just absorbed a two-round design pass; a
  structural split now would bury the two fixes above in noise. Worth doing
  later, on its own, against its own review.
- **`any` in `api/` handler signatures** (`api/analyze.ts:9`, `ask.ts:9`,
  `translate.ts:9`, `_http.ts:37,48,83,102`). These are the serverless handler
  shape. Typing them is a contained improvement but touches the trust-critical
  request path, which deserves its own review.
- **`src/i18n.ts` is 39KB and ships both languages to every visitor.** Splitting
  by language is possible but the app toggles DE/EN live; a lazy language would
  add a loading state to a control that is currently instant. Bad trade.
- **`signwise-logo.svg` is 72KB.** Vite already emits it as a separate asset
  rather than inlining it, so it is not in the JS bundle. Compressing it is a
  content change, not a code change.
- **Memoization in `Overview.tsx`.** Only `lawByClause` is memoized; the chart
  maths and the pay derivation recompute per render. The component re-renders on
  language toggle, depth change and ask-answers — none of them hot paths — so
  measured impact is about nil. Do not add `useMemo` here on principle; it is
  cost without benefit and it would be one more thing to keep correct.

---

## Hard constraints (unchanged, and they outrank both tasks)

- **Never invent data.** Every figure on screen comes from the analysis or a
  disclosed derivation. Chart month labels stay `Monat 1..12` — fabricated
  calendar months were removed on purpose and must not come back.
- **Derived figures stay labelled derived.** `derivedPayFor` in `src/pay.ts`
  feeds the pay hero; the `payDerivedTag` string and the source-clause link
  stay visible.
- **Chart honesty.** When the tallest bar exceeds 1.8x the recurring amount the
  scale compresses (`RECUR_SHARE = 0.58`); every bar keeps its exact figure and
  `chartScaleNote` must render whenever `compressed` is true.
- **Both languages.** New or changed UI copy needs entries in both dicts and in
  the `Strings` type in `src/i18n.ts`. German compounds are long; layouts must
  hold at DE lengths.
- **Both widths.** 375px and ~1400px. The phone block is
  `@media (max-width: 540px)`; the `@media print` block must keep working.
- **Accessibility stays.** Chart `aria-label`s must keep describing what is
  actually drawn. `.review-card[data-level]` carries meaning by border *and*
  text, never colour alone.
- **No new dependencies.**

## Verification

- `npx tsc -b` — clean
- `npm test` — 201 passing
- `npm run build` — clean, and report the main chunk size before and after
