# QA pass — using SignWise as an end user

Branch `qa/end-user-pass`, started 2026-08-23.

The brief: stop waiting for bug reports. Use the product the way a real person
would, on a real contract, and find the abnormalities myself — then fix them and
write down what and why.

## How I tested

- Ran the app locally with the **real** Azure model (not the demo fixture).
- Uploaded the contract the app is actually being judged on:
  `Mietvertrag_Aberlestrasse_27 (1).pdf` — a 6-page Munich flat rental,
  20 numbered sections, German.
- Walked every screen, clicked every control, and asked of each one:
  1. Do I know where I am and how to get anywhere else?
  2. Is what it shows *true*?
  3. Does the control do what its label promises?
  4. Would I show this to a jury?
- Repeated at 1440px (laptop), 800px, and 375px (phone).

Three personas, deliberately:
- **The tenant** who just wants to know what this costs and what they are stuck with.
- **The sceptic** who checks whether every number on screen is really in the PDF.
- **The juror** who has five minutes and notices anything that looks unfinished.

Each finding below records what I saw, whether it was worth fixing, and why the
fix is the one I chose.

---
## 1 — Local runs silently served the demo fixture as if it were your contract

**Seen.** First upload of the real PDF. The page said
*"Ihr Vertrag auf einen Blick — Mietvertrag_Aberlestrasse_27 (1).pdf"* and then
showed a rent of 1.240 €, a start date of 01.10.2026 and six clauses. None of
that is in the file. It was the bundled rental sample, wearing my filename.

**Cause.** `api/_model.ts` decides `live = !!(ENDPOINT && API_KEY)` from
`process.env`. Vite only puts `.env*` files on `import.meta.env`, and only for
`VITE_`-prefixed keys — the dev API middleware runs in Node and never saw them.
So `live` was false and `analyzeContract` returned the stub. The README tells you
to put the credentials in `.env.local`; following the README did not work.

**Worth fixing?** Yes, and first — every other test I wanted to run would
otherwise have been run against fabricated data. It also silently disarms the one
thing this product is for.

**Fix.** `vite.config.ts` now loads the env files into `process.env` itself:

    Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

`loadEnv` reads the files, it does not expose anything to the browser bundle —
only `define` would do that, and we don't use it. Empty prefix so unprefixed
server keys are included.

**Left standing, deliberately.** The stub fallback itself. In production the
banner does say "Demo-Modus", and a hackathon demo that dies on a missing key is
worse than one that shows a sample. But see finding 3: the page around the banner
still claimed the sample was *your* contract, and that part I did fix.

---

## 2 — "Screens · 3 · Overview & answers · 4 · Original · 5 · Before you sign"

**Seen.** The bar above every document screen read `BILDSCHIRME` and then three
buttons numbered **3, 4 and 5**. On a 375px phone it was worse: the label is
hidden at that width, so the numbers had nothing to explain them, the active tab
was **clipped mid-word** by the right edge, and `+ Neuer Vertrag` was entirely
off-screen behind a horizontal scroll nobody would think to try.

**What was actually wrong.** Three separate things wearing one coat of paint:

1. **The numbers were leftovers.** They came from a five-screen mockup where 1
   was Upload and 2 was Analysis. Those two screens never show the bar, so the
   numbering permanently starts at 3. A number that starts at 3 promises a
   sequence and then doesn't deliver one.
2. **"Screens" is our word, not the reader's.** It describes the artefact
   (a mockup made of screens), not the thing (one contract, looked at three ways).
3. **`+ New contract` was pretending to be a fourth screen.** It isn't a view of
   this contract — it discards this contract. Same shape, same size, same row as
   its three neighbours, completely different consequence. That is also why it
   was the one that fell off the phone: as the last of four equal children in a
   scroller, it is always the first to go.

**Worth fixing?** Yes. It is the only persistent navigation in the product, it is
on screen for the entire session, and on a phone it was both unreadable and
missing a control.

**Fix.**

- Numbers dropped. The three views are destinations you can visit in any order,
  not steps — so they are tabs, and tabs don't count.
- Labels say what you get: **Überblick / Vertragstext / Vor der Unterschrift**
  (*Overview / Contract text / Before you sign*). "Original" became
  "Vertragstext" because "Original" describes provenance; a reader wants to know
  it is the contract's own words.
- The visible `BILDSCHIRME` label is gone. The information it carried is now in
  `aria-label="Ansichten dieses Vertrags"`, where it helps a screen reader and
  costs a sighted reader nothing.
- The three tabs are a `grid-template-columns: repeat(3, 1fr)` — equal width,
  always the full row, never a scroller. On a phone they tighten and wrap to two
  lines rather than overflow.
- `+ New contract` left the tab group. It sits outside it, `flex: 0 0 auto` so it
  never shrinks, with a **dashed** border so it reads as "leave here" rather than
  "another tab". On a phone it collapses to `+` and keeps its name via a
  visually-hidden span.

**Why not a numbered wizard instead?** Because the app doesn't work that way —
every screen links to every other, and "Before you sign" is a place you go back
to. Numbering would have been a promise the product breaks.

**Also fixed here, spotted in the same screenshot.** The `<h1>` on "Vor der
Unterschrift" was wearing a 3px teal box. The screen focuses its heading on mount
so a screen reader announces the new view — a good pattern — but the global
`:focus-visible` rule then painted a ring around a non-interactive heading, which
looks like a text field. `[tabindex="-1"]:focus { outline: none }` keeps the
announcement and drops the box.

---

## 3 — The app told me my 6-page contract had 14 pages

**Seen.** Under the heading *"Ihr Vertrag auf einen Blick"*:

    Mietvertrag_Aberlestrasse_27 (1).pdf · 14 Seiten · erklärt auf Deutsch

The file is six pages. The same line, with the same 14, also appears at the top
of the contract-text view.

**Cause.** Literally this, in two files:

    {filename} · {s.fileMeta(14)}

A mockup value that was never wired up.

**Worth fixing?** This is the one finding I did not have to think about. The
entire promise of SignWise is "we only tell you what your document says", and the
very first line under your own filename was a number we invented. A juror who
opens their own PDF and counts the pages finds it in ten seconds. Everything else
on the screen becomes suspect at that point.

**Fix.** `extractPdfText` already walks `doc.numPages` to pull the text — the
count was sitting right there and being thrown away. It now returns
`{ text, pages }`, and the count travels with the analysis to both screens.

**The interesting half: what to show when there is no count.** Image uploads have
no pages, and the two bundled examples are TypeScript fixtures, not PDFs. The
tempting move is a plausible constant. That is the same bug again with a nicer
number. So `pages` is `number | null`, and `fileMeta(null)` simply drops the
segment — *"Beispiel-Mietvertrag.pdf · erklärt auf Deutsch"*. Nothing invented,
nothing missing. Singular/plural handled while I was in there.

---

## 4 — The same clause had two different numbers on the same screen

**Seen.** In the contract-text view, the tag above a highlighted passage read:

    §§ 12-13 — Punkt 12
    § 14 — Punkt 13
    §§ 15-16 — Punkt 14

Meanwhile the list of findings *directly to the right of it* was numbered 1 to 5.
There is no Punkt 12. Reading the document, the § 5 Kaution passage was tagged
"Punkt 5" while the list called the very same clause "3".

**Cause.** Two independent numbering schemes:

- `Original.tsx` built `findingNo` from `[...analysis.clauses].sort(by page)` —
  a running index over **all 20 clauses**.
- Everywhere else numbers `analysis.findings`, the top five.

Both call the result "Punkt N".

**Worth fixing?** Yes. This is the exact confusion that produced the original bug
report ("§§ 12-13 — Finding 12"). A number is an identity claim; two schemes
under one label means neither can be trusted, and the reader is left trying to
find "Punkt 12" in a list of five.

**Fix.** There is exactly one numbering: position in `analysis.findings`. A
passage that is one of the headline findings shows `§ 5 — Punkt 3`; a passage that
isn't shows just its section, `§ 17`. No clause has a number that doesn't appear
in a list, and no list has a number the document doesn't use.

**The same bug, second location.** Filtering the overview to "Wichtig 9"
renumbered those nine clauses 1–9 — inventing a *third* set of numbers, and
implying a ranking that filter doesn't produce. A filtered list is every clause at
a level in document order, so it now carries no rank badge at all. Each row still
shows its severity chip and its section reference, which is what identifies it.

---

## 5 — Two notations for the same money, sometimes in adjacent cards

**Seen.** On the overview:

    MONATLICHE GESAMTZAHLUNG    1.480,00 EUR      <- model prose
    JEDEN MONAT                 1.480 €           <- app-formatted

And on "Vor der Unterschrift", the deposit had two cards side by side reading
`3.540,00 EUR` and `3.540 €`. I had to stop and check whether those were two
different charges. They are the same charge.

**Cause.** Two writers. Amounts the app computes go through `euro()` → `Intl`
→ `1.480 €`. Amounts the model writes into its own sentences copy the contract's
own style → `1.480,00 EUR`. Both are correct German. Together they look like two
different numbers.

**Worth fixing?** Yes — on a page whose whole job is "here is what this costs",
making a reader compare two renderings of one figure is the most expensive kind
of small inconsistency. And it is systemic: every model sentence that names an
amount was affected.

**Fix, and why this one.** The obvious move is to ask the model for "€". Prompt
requests are unenforceable and do nothing for an analysis already on screen. So
this is a rule the app applies, not a request: `styleCurrencyDeep` walks the
analysis once, on arrival, and rewrites the currency word in every prose field.

Three details that make it safe:

- **`quote` and `ref` are excluded**, along with ids, codes and enum values. A
  quote must stay exactly as the contract wrote it — that is the thing the
  verifier checks against the PDF, and the thing a reader compares by eye. Skip
  by key name, so a field added later is prose by default and only opted out
  deliberately.
- **Zero cents only.** `1.480,00 EUR → 1.480 €`, but `12,50 EUR → 12,50 €`.
  Dropping real cents would be an accuracy loss, not a formatting change.
- **Non-breaking space** between figure and symbol, so `1.480` and `€` never end
  up on different lines.

A currency with no symbol in the table (CHF) is left exactly as written rather
than mangled. Four tests cover the cases above, including the "quotes stay
verbatim" one, which is the one that would actually hurt if it regressed.

---

## 6 — The deposit was on screen twice, and a per-reminder fee was filed as "one-time, at the start"

Two findings from the same card, both about the app asserting things it hadn't
checked.

### 6a — Two "Kaution" cards, side by side

**Seen.** "Vor der Unterschrift" → *Was Sie zusagen*, cards 2 and 4:

    3.540,00 EUR    Kaution   Sie dürfen die Kaution in drei gleichen Monatsraten leisten.
    3.540 €         Kaution   Ein zusätzlicher Betrag laut Vertrag.

Same clause, same amount, same title. As a reader I stopped to work out whether
these were two deposits.

**Cause.** `normalise()` in `decision.ts` merges the model's brief with a derived
fallback and de-duplicates on
`` `${item.clauseId}:${commitmentPriority(item)}` `` — a **keyword score** used as
a concept id. The model's card scored 100 because its explanation contains
"Monats**raten**", which matches the `/monat/` in the rent pattern. The derived
card scored 95 via `/kaution/`. Different keys, so both survived.

**Worth fixing?** Yes, and the dedupe key was worth replacing rather than
patching. A score built to *rank* things was doing duty as an *identity* — a
category error that will keep producing duplicates on other contracts, just with
different words.

**Fix.** De-duplicate on `clauseId + title` — what the reader actually sees. Two
cards with the same title on the same clause are a duplicate no matter how they
scored; two genuinely different concepts sharing a clause (an indefinite duration
and its notice period) have different titles and both survive, which was the
original reason for not keying on `clauseId` alone. The model's wording wins
because it is merged first. A regression test builds exactly this collision.

### 6b — "Einmalig, zu Beginn"

**Seen.** Under that heading: *"Mahnkosten je schriftlicher Mahnung — 5 €"*. A
fee charged per reminder letter is neither one-time nor at the start.

**Cause.** `money.oneTime` is really "every amount that is not the monthly
figure". The heading dated the whole bucket.

**Fix.** The heading no longer claims a timing it cannot know: *"Weitere Beträge
in diesem Vertrag"* / *"Other amounts in this contract"*. Each row still carries
its own frequency note and section reference, which is where per-item timing
belongs. I also added one prompt line so per-event fees go to `money.variable`
where they belong — but the heading is the fix that works on analyses that
already exist.

### 6c — And it was listed twice

Under the 12-month chart sat a second list of the same items, prefixed
*"Zusätzliche Zahlung — Zeitpunkt nicht angegeben"*. So `Mahnkosten` appeared
once as "one-time, at the start" and once as "timing not specified", about 400px
apart, contradicting each other.

`unplaced` was every item the chart couldn't place — but the card above the chart
already lists **every** item, so `unplaced` could only ever be a duplicate of
something already on screen. Deleted, along with the string it used. Best kind of
fix.
