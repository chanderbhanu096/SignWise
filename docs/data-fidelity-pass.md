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

## Still open

- Rotate the Azure OpenAI API key — pasted in plain text in chat in an earlier
  session, still not rotated.
- The Art. 13 DSGVO notice names "das Projektteam SignWise"; a production
  deployment needs a real named controller.
- `qa/end-user-pass` has not been merged to master.
