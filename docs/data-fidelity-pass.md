# Data fidelity pass — why the explanation disagreed with the contract

**Branch** `qa/end-user-pass` · live at <https://signwise-hero-7c21.azurewebsites.net>

The report was two sentences: the demo contract looks like it is missing clauses,
and the numbers under *Explained by SignWise* sometimes do not match the contract.
Both turned out to be true, and neither had a single cause.

This is the log: every issue found, why it happened, how it was fixed, and what
now fails if it comes back.

---

## 1. `facts()` read every number as if it were German

**Severity: high — wrong in shipping logic, not just in the demo.**

`facts()` extracts the figures from a piece of text. Two other things depend on
it: `depthText()` uses it to decide whether an explanation level dropped
something, and `decision.ts` uses it to decide whether two commitment cards are
showing the same amount.

It stripped `.` as a thousands separator and read `,` as a decimal point —
correct for German, wrong for everything the app renders in English.

| text | read as | should be |
| --- | --- | --- |
| `€1,240` | `1.240` | `1240` |
| `€3,000` | `3` | `3000` |
| `€42,480` | `42.480` | `42480` |
| `01.11.2026` | `1112026` | a date |

So in English, both of those decisions were being made on nonsense. A date was
worse than wrong: it became one seven-digit figure that could never match
anything, and counted as a fact of its own on every comparison.

**Fix.** A separator means what follows it says it means: exactly three digits
and nothing after them is grouping, anything else is a decimal point. Dates are
split into day, month and year — which is also what makes a German `01.11.2026`
and an English `1 November 2026` agree on the facts they state.

Ordinals were added at the same time. A notice clause is nothing but ordinals —
*"bis zum dritten Werktag"*, *"zum Ablauf des zweiten Monats"* — and it shared no
figure at all with the explanation written about it.

**Guarded by** `test/depth.test.ts` — "a figure means the same thing in German and
in English notation", "a date is read as its parts", "ordinals carry their figure".

---

## 2. Three kinds of figure, presented as one kind

**Severity: high — this is the reported symptom.**

> *"Kleine Reparaturen bis 150 € je Fall zahlen Sie selbst, im Jahr höchstens
> 8 % der Jahresmiete — rund 1.190 €."*

Reads as three things the contract says. Two of them are: 150 € and 8 % are in
§ 13. The third is not in the contract anywhere — it is 8 % of the annual rent
from § 4, worked out. The same pattern ran through the demo: a probation period
ending on a date the contract never prints, a notice period taken from the law,
an annual salary total that is twelve months plus the holiday payment.

Nothing distinguished them, so a derived figure read as a misquote.

**Fix.** `src/provenance.ts` traces every figure in an explanation back to where
it actually comes from — this clause, another clause, arithmetic on figures the
contract does state, or nowhere in the document — and the detailed level lists
them underneath. Simple and standard stay plain prose: someone who asked for the
short version is not asking to audit it.

The arithmetic had to be talked down four separate times:

| it claimed | why | rule added |
| --- | --- | --- |
| 20 days of statutory holiday = `1 % × 2,026` | any figure could be a percentage; 2026 was a year | a percentage has to be written as one somewhere in the contract; dates are not quantities |
| `12 = 12 × 1` | 1 came from the ordinal in "die **ersten** sechs Monate" | no term may be 1 |
| 8 extra holiday days = `6 + 2` | six months and two weeks, from an unrelated probation clause | derive amounts only — counts are small and plentiful, so arithmetic finds an explanation for any of them |
| `1.680 € = 2 × 2 + 1.680` | a 0.5 % tolerance is wide enough to accept 1,684 | tolerance is for rounding only (`0.5 + 0.05 %`), and no term may be as large as the answer |

What it does explain, on the real model's output over a ten-section contract:
`1.680,00 EUR = 1.450 + 230` (cold rent plus the operating-cost advance),
`4.350 € = 3 × 1.450` (a penalty of three months' rent),
`42.480 € = 12 × 3.440 + 1.200`.

**Guarded by** `test/provenance.test.ts` — eleven tests, including "only amounts
are derived, never counts" and "statutory figures are reported as not in the
contract, not invented into one".

---

## 3. Every 3 satisfied every other 3

Found while testing issue 2's fix. The rental notice clause says *"bis zum
**dritten** Werktag … zum Ablauf des **zweiten** darauffolgenden Monats"*. The
explanation says *"mit rund **drei** Monaten Frist"*. Provenance reported the
three months as **stated in this clause** — matching the 3 of the third working
day.

Same shape one clause over: `1. November 2026` scanned as a plain number is the
figure 1, and 1 appears in any clause containing *"die **ersten** sechs Monate"*,
so the start date was reported as something the probation clause states.

**Fix.** Figures are matched with their unit — `3|month` is not `3|`. Written
dates are parsed as dates in both languages, not as the number in front of a
month name. Both fixes turned false *"the contract says this"* claims into honest
*"not stated verbatim in the contract"* ones, which for the notice period is the
more interesting fact anyway: three months is what § 9 works out to, not what it
says.

**Guarded by** `test/provenance.test.ts` — "a figure has to match in its unit,
not just its digits", "a written date is read as a date in both languages".

---

## 4. The depth levels read as three sentences glued together

The levels were written as *increments*: level 2 was the text to append to level
1. That made losing information impossible, which was the point — on a real
contract 6 of 15 clauses had been dropping a fact going from standard to
detailed. But it read exactly like what it was.

**Fix.** The levels are three complete explanations now, each written to be read
alone, each longer and more precise than the one below it. The guarantee moved
into `depthText()`, which checks the level being shown against the ones below and
puts back a figure only a lower level carries. So a model that still returns
increments — and every analysis cached from before this change — renders exactly
as it used to.

`api/_model.ts` was rewritten to match, with the cumulative rule stated as the
hard rule and a worked WRONG/RIGHT example.

**Guarded by** `test/depth.test.ts` and `scripts/audit-demo.ts`: no level may lose
a figure, repeat a sentence, or be shorter than the level below it.

---

## 5. The demo contracts had holes

The rental example jumped § 2 → § 4 → § 6, missing §§ 3, 5, 8, 10 and 12. The
employment example was missing §§ 3 and 6 and listed what it did have out of
document order. The rental *glance* also claimed a start date of 01.10.2026 that
appeared nowhere in the document.

**Fix.** Both contracts are complete and in order, with a party block at the top
that the document view drops on purpose — which demonstrates the omission rather
than hiding it. Two of the eight new sections are explained clauses rather than
filler: **§ 12 Betreten der Mieträume** and **§ 6 Arbeitszeit**. § 3 Mietzeit now
states the start date the glance card was quoting.

**Guarded by** `scripts/audit-demo.ts`: every clause quote must verify verbatim
against the document, every clause must be reachable in the rendered document,
and no glance value may state a figure the document does not contain.

---

## 6. `§ 12 … Seite 4` sat between two `Seite 3` clauses

My own bug, introduced in issue 5 and caught by clicking through the document
pane: the new access clause was given page 4 in a three-page document, so page
numbers ran backwards.

**Fix.** Page 3. `scripts/audit-demo.ts` now walks the document in order and
fails if a page number goes backwards, or if the label a reader sees disagrees
with the page field behind it.

---

## 7. The page never changed language

`index.html` hardcodes `<html lang="de">` and nothing updated it. Switching the
interface to English left the document declared as German, so a screen reader
read English out with a German voice, and the browser tab stayed German whatever
the reader had chosen.

**Fix.** One effect in `App.tsx` sets `document.documentElement.lang` and
`document.title` from the active language.

---

## 8. The commitment cards reordered themselves when you switched language

**Severity: medium — visible to anyone who presses the language button.**

`commitmentPriority()` ranks the "What you're agreeing to" cards with a keyword
score over the *localized* text. The pattern meant to catch a recurring payment
was the bare stem `monat` — which also matches the German plural noun **Monate**.

So a notice period of *"3 Monate"* scored 100, as a monthly payment, and
outranked the deposit. Its English twin *"3 months"* scored 90, as a notice
period. The same contract listed its commitments in a different order depending
on which language button the reader had pressed.

**Fix.** A recurring payment has to be said adverbially in either language —
`monatlich`, `pro/im/je monat`, `monthly`, `per month`. Never the bare noun.

**Guarded by** `test/decision.test.ts` — "commitment cards are in the same order
in German and in English", over both fixtures.

---

## Verified

- **95 unit tests**, `tsc --noEmit` clean.
- `scripts/audit-demo.ts` — clean across rental × employment × German × English:
  quotes verify, no depth level loses a figure or repeats itself, every level is
  longer than the one below, page order holds, no figure is claimed to be in a
  clause that is not, and the two languages state the same figures.
- `scripts/model-audit.ts` — **live Azure OpenAI runs** over a ten-section trap
  contract in both languages. No level loses a figure, none repeats a sentence,
  every derived total is named as arithmetic rather than quoted, and 6 of 7
  statutory benchmarks fire as expected.
- **In the browser**, both examples: all document passages clickable, all
  explanations populated, depth preserved across screens, the clause panel
  surviving a language switch with its clause and depth intact, Escape and
  backdrop closing it, keyboard Enter opening it, rapid language clicks safe.
- **English UI scanned for untranslated German** on all three document screens —
  the only German left is the contract's own section names, which is intended.
- **375 px**: no horizontal scroll, nothing wider than the viewport, no tap
  target under 36 px, provenance rows wrap instead of overflowing.

## Deliberately not changed

- **The contract's own section names stay German in the English UI** (`§ 4 Miete
  · page 3`). Translating a heading the reader has to find on the page would make
  it harder to find, not easier. The label is mixed-language and carries no `lang`
  attribute for the German half — marking the whole span would mispronounce
  "page 3", and splitting the ref format is not worth it for this.
- **`context` is not split into "statutory" and "computed"**. The app cannot tell
  the difference without asking the model, and asking the model for provenance
  defeats the purpose of checking it.
- **Timeline dates are computed, and the audit says so** rather than treating it
  as a defect: a notice deadline is arithmetic on the start date by definition.

---

# Whole-contract pass — 26 August 2026

The report this time: *should every clause be selectable in the contract view, not
just the ones a finding points at? A German contract read by someone who works in
English has no "straightforward" sections.* The answer was yes, and the app already
said so — `ANALYZE_SYSTEM` has told the model to surface every substantive section
since the first legal-quality pass. The demo fixture was the thing that never caught
up. Making it catch up surfaced eight more issues; six of them were nothing to do
with the fixture.

## 10. Half the demo contract could not be clicked

**Severity: high — the main screen of the main demo.**

Seven of the fourteen rental sections (§§ 1, 3, 5, 7, 8, 10, 14) and two of the ten
employment sections (§§ 3, 10) had no explanation. They rendered as `.doc-plain`:
smaller, grey, no hover, no cursor, nothing on click. A judge clicking through the
document finds seven dead paragraphs between live ones.

The cause was that the fixture only ever carried the clauses a *finding* points at,
while the app's own prompt asks a real upload for every section. The demo was behind
the spec the app holds the model to.

**Fixed** by writing all nine sections as full clauses — German and English, three
depth levels each, level `standard` for the routine ones (no tint in the document
pane, so the colour still marks attention) and `check` for § 5 Betriebskosten, an
unquantified recurring cost, and § 8 Untervermietung, a restriction whose relevance
depends entirely on the reader. `SAMPLE_DOC_TEXT` and `EMPLOYMENT_DOC_TEXT` now quote
the clause objects instead of repeating their text, so the document and the
explanation cannot drift apart.

Two knock-on improvements fell out of it: the "Nebenkosten" variable-cost row and the
clarification question about it now point at § 5, the section that actually states
them, instead of § 4 Miete which only mentions them in passing — and the derived
review list picks § 5 as its third item, which is the strongest thing in this
contract that no number is attached to.

**Guard**: `audit-demo.ts` already fails when a clause is never marked in the rendered
document. It now also reports the block count, so 14 clauses / 14 blocks is visible.

## 11. An uploaded contract could still have dead sections

The prompt asked for every section "that carries an obligation, a cost, a deadline or
a right". Boilerplate — Schriftformklausel, salvatorische Klausel, Schlussbestimmungen
— failed that test and stayed grey.

**Fixed**: the prompt now asks for every numbered section without exception, names the
boilerplate explicitly, and says why (the reader can click any of them, and the dull
ones are exactly what a non-native reader cannot skip).

**Guard**: `scripts/model-audit.ts` gained a coverage check — every `§ N` heading in
the source text must appear in some clause's quote or ref. Live Azure runs on the
ten-section trap contract: **all 10 surfaced, in German and in English.**

## 12. A numeral inside a German compound was invisible

**Severity: medium — wrong in shipping logic.**

German writes numbers into words: *sechsmonatige Probezeit*, *Dreimonatsfrist*,
*zweiwöchige Kündigungsfrist*. `facts()` matched whole words, so the German timeline
entry "Beginn der sechsmonatigen Probezeit" stated no figure at all, while the English
"Start of the six-month probation period" stated a 6 — the hyphen split the token.

The same fact, visible on one side and invisible on the other. Two things depend on
`facts()`: the depth-cumulative repair (which then cannot tell that a level dropped a
figure) and provenance (which then reports a figure as *not stated in the contract*
when the clause states it as a compound).

**Fixed**: a numeral counts when it is followed by a time or quantity stem
(`monat`, `woch`, `jahr`, `tag`, `stund`, `zimmer`, `fach`). The stem is the whole
point — without it "zweifellos" reads as a 2, "vierteljährlich" as a 4 and "Achtung"
as an 8.

**Guard**: two tests in `test/depth.test.ts`, one for each direction.

## 13. Switching language during the analysis left the two out of step

**Severity: high — a judge switching to English on the progress screen sees it.**

The job captured the language it started with (`sampleAnalysis(lang)`,
`analyze(file, lang, …)`), and `changeLang` returned early while `analysis` was still
null. Pick EN while the progress bar is running and you land on a German analysis
under an English interface.

**Fixed**: one function, `toLang(analysis, lang)`, used by both the language buttons
and the moment an analysis arrives. The resolve effect already re-runs on a language
change, so the arriving analysis is brought into whatever language is current.

## 14. A translated analysis was never re-verified

`changeLang` set the model's translated copy straight into state. `verified` and the
currency notation were then whatever the model echoed back through a 16k JSON
round-trip — both are client-side facts that the app derives deterministically.

**Fixed**: both language paths now run through `verifyAnalysis`, which re-checks every
quote against the extracted document text and re-applies the app's currency notation.

## 15. Parity checking stopped at the clause explanations

This is why #12 survived. `auditParity` compared `simple` / `standard` / `detailed`
and nothing else — so the glance row, the timeline, the money items, the rights and
duties and the whole decision brief could state different figures in the two languages
and nothing noticed.

**Fixed**: `auditParity` now walks every display string in both analyses, position by
position, and fails on any figure one language states and the other does not. It
caught #12 the first time it ran.

## 16. The contract pane printed clipped

`.doc` scrolls inside `max-height: 70vh`. Nothing in `@media print` released it, so
Ctrl+P from the contract screen produced one screenful of a 1,938 px document and
stopped. Three lines of print CSS.

## 17. Wording that no longer described the behaviour

- The contract screen said *"Marked passages are the ones a finding came from — select
  one to see its explanation."* Colour now means attention, not availability. Rewritten
  in both languages, along with the empty-state hint.
- The screen-reader counter under the level filter said *"Showing 6 of 14 findings"*
  next to a heading that says there are 5. It counts clauses; it now says clauses.
- The README claimed severity Important was navy and that "red is reserved and unused".
  Both were left over from before the severity scale became a warm attention ramp on
  23 August — `--imp-fg` is `#8e0a0a`, deliberately, and the scale deliberately has no
  green in it because green would endorse a clause. Stale documentation, not drift; the
  claim is gone.

## 18. Two silly rows in the provenance panel

Opening up the routine sections put two clauses under *Where these figures come from*
that had never been there, and both showed something a reader would laugh at.

§ 7's "Ruhezeit ist von 22:00 bis 6:00 Uhr" was scanned as plain numbers, so it
produced three rows and one of them read **"00 — steht in dieser Klausel"**. A clock
time now matches as one token and joins the dates: compared by its parts, never
derived from other figures, because it is a position on a clock and not a quantity.

§ 1 listed the **14** of "Kastanienallee 14" beside the number of rooms. A house
number is a number in the text and nothing to do with the tenancy. Addresses now come
out of the scanned text before figures are read, using the two patterns `redact.ts`
already has — they are what decides what an address is everywhere else in the app, so
they decide it here rather than a second, worse pattern being written next door.

**Guard**: two tests in `test/provenance.test.ts`, one per case.

## Verified after

- `npm test` — 100 pass, 0 fail. `tsc --noEmit` clean.
- `npx tsx scripts/audit-demo.ts` — ALL CLEAN across rental × employment × DE × EN,
  now with 14 and 10 clauses instead of 7 and 8.
- `npx tsx scripts/model-audit.ts de` and `en` — live Azure, clean, all 10 sections
  surfaced in both, the same six statutory benchmarks fired in both.
- In the browser, both fixtures: every screen snapshotted in DE, in EN and in DE again.
  Structure, figures and ordering identical; the DE → EN → DE round trip is
  byte-identical. The only difference between the languages is the labels.
- Every clause × every depth × both languages: identical figures, each level strictly
  longer than the one below, the same number of provenance rows.
- All 17 legal citations across both fixtures resolve to a real section page.
- Language buttons clicked 24 times in a row: one pressed state, consistent
  `<html lang>`, nothing lost. Panel open across a language switch: same clause, same
  depth, contract wording still German.
- 375 px: no horizontal page scroll on any screen, the compensation chart scrolls
  inside its own container, tapping a routine section opens the sheet.

## Still open

- Rotate the Azure OpenAI API key — pasted in plain text in chat in an earlier
  session, still not rotated.
- The Art. 13 DSGVO notice names "das Projektteam SignWise"; a production
  deployment needs a real named controller.
- ~~`qa/end-user-pass` has not been merged to master.~~ Fast-forwarded into `master`
  on 26 August and deployed to both hosts; the two branches and both sites are now the
  same commit.
