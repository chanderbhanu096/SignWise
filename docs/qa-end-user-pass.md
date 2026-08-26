# QA pass — using SignWise as an end user

Branch `qa/end-user-pass`, started 2026-08-23.

The brief: stop waiting for bug reports. Use the product the way a real person
would, on a real contract, and find the abnormalities myself — then fix them and
write down what and why.

## How I tested

- Ran the app locally with the **real** Azure model (not the demo fixture).
- Uploaded the contract the app is actually being judged on:
  `Mietvertrag_Aberlestrasse_27 (1).pdf` — a 4-page Munich flat rental,
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

## 3 — The app told me my 4-page contract had 14 pages

**Seen.** Under the heading *"Ihr Vertrag auf einen Blick"*:

    Mietvertrag_Aberlestrasse_27 (1).pdf · 14 Seiten · erklärt auf Deutsch

The file is four pages. The same line, with the same 14, also appears at the top
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
than mangled.

**Two things the tests caught that I would not have.**

- The symbol goes **where the locale puts it**. German writes `1.180 €`, English
  writes `€1,180`, and the app's own `euro()` already does both — so a rewritten
  amount that always trailed the symbol would have re-created the exact mismatch
  in English that I was fixing in German. `Intl` is asked which way round, rather
  than it being hardcoded.
- The first version matched **from inside a number**: `12.50 EUR` came out as
  `1€2.50`, because the pattern could start at the "2". A lookbehind now stops a
  match beginning mid-number, and `Section 12.50 of the act` — no currency word —
  is correctly left alone.

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

---

## 7 — Every section of the contract was highlighted, so none of them were

**Seen.** The contract-text view, scrolled top to bottom on the real rental
contract: **20 of 20 blocks had a coloured background.** Nine pink, four amber,
seven teal. The subtitle above it reads *"Hervorgehobene Passagen sind die, aus
denen Ihre Punkte stammen"* — highlighted passages are the ones your points came
from — while pointing at a document with no un-highlighted passage in it.

Two things made it worse:

- "Standard" clauses were tinted with **`--brand-tint`**, the same teal as the
  active tab and the primary button. An ordinary clause looked selected.
- The **selected** passage was distinguished only by a slightly heavier border.
  Against 19 other coloured blocks it did not read as selected at all.

**Worth fixing?** Yes. Highlighting is a claim about scarcity; spend it on
everything and you have spent it on nothing. This is also the screen a juror will
scroll to check whether the analysis is really about *this* document, and a wall
of pink says "everything is alarming", which is the opposite of the product's
stated position that colour means attention and never validity.

**Fix.**

- `standard` loses its wash entirely — transparent background, grey rail. A
  standard clause is one with nothing to flag, so it should look like the page.
  The rail keeps it visibly clickable.
- `check` and `important` keep their amber and red tints. Now they are the only
  colour on screen, which is what makes them mean something. On this contract:
  13 marked, 7 plain.
- Selection now beats severity — the ring plus a background and a drop shadow, so
  the passage you clicked lifts off the page whatever its level.

**Not changed:** the tint colours themselves. They were chosen for contrast in an
earlier pass and still pass; the bug was how many blocks wore them.

---

## 8 — "Die erste Rate ist zu  Beginn fällig"

**Seen.** Double spaces scattered through the contract-text pane: *"zu  Beginn"*,
*"Ablauf des  zwölften Monats"*, *"Die Beschaffung weiterer Schlüssel"*.

**Cause.** The PDF is justified. `pdfjs` reports the inter-word padding the
typesetter inserted, and we render it literally.

**Worth fixing?** Small, but this is the pane whose entire promise is "this is
your contract as it is written", so it is the one place where looking subtly
wrong costs the most. It reads as a rendering defect.

**Fix.** Collapse runs of horizontal whitespace to one space, in `splitDocument`,
using `[^\S\n]{2,}` so newlines — which carry the paragraph structure — are
untouched. Worth being clear about the reasoning: this does not edit the
contract. The extra spaces are an artefact of *how the page was set*, not
something the document says, and removing them makes the pane look more like the
printed original rather than less. A test asserts both halves: no double spaces
left, line breaks still there.

---

## 9 — The headline hung 380px off to the left while it typed

**Seen.** At 1440px, mid-animation, the hero read

    Erst                                                 [empty half a screen]
              Laden Sie Ihren Vertrag hoch und sehen Sie…

The typewriter headline was hard against the left of the band while the paragraph
under it was centred. At narrow widths you don't see it, because the line finishes
typing and fills the box — which is why it survived this long.

**Cause, and why the obvious reading is wrong.** An earlier pass fixed a real
1.61px horizontal shimmer by giving every character its own inline box and keeping
the *untyped* characters in the flow with `visibility: hidden`, reserving the full
final width. That does hold the line perfectly still. It also means the visible
text always starts at the left edge of a box sized for the finished sentence — so
a centred headline is only centred on the last keystroke. The cure was ~380px; the
disease was 1.61px.

**Worth fixing?** Yes. This is the first thing anyone sees, and "our headline is
stuck to the left" is a louder defect than a sub-pixel wobble nobody reported.

**Fix.** `.slogan-ch.off { display: none }` — untyped characters take no space, so
the typed text shrink-wraps and stays centred. Both of the original properties are
kept, by two mechanisms that were already there:

- **No page reflow:** the invisible `.slogan-sizer` copies of every slogan sit in
  the same grid cell and hold the box at the largest line's width and height. The
  card below never moves.
- **No shimmer:** one inline box per character. Appending a character cannot
  re-snap the ones before it, which was the actual cause of the 1.61px.

The line does now grow outward from the centre, which is what a centred typewriter
is supposed to look like — motion by design, not the irregular wobble that was
fixed before.

**Measured, not eyeballed.** 26 samples across a full type-and-erase cycle:
centre offset `0px` at every text length, hero box `44 × 805` at every sample.

---

## 10 — "Dein Vertrag" / "Laden Sie Ihren Vertrag hoch"

**Seen.** The rotating headline said **"Dein Vertrag, einfach erklärt"** — *du* —
directly above a paragraph addressing the reader as **Sie**. A scan of every
German string in `i18n.ts` found exactly one informal address: this line.

**Worth fixing?** Yes, and it is a one-word fix. In German, mixing *du* and *Sie*
30px apart is not a stylistic preference, it reads as an error — and this is a
legal-information product under a Ministry of Justice patronage, where the formal
register is the right one and the inconsistency is the kind of thing a German
reader notices before they read anything else.

**Fix.** "Ihr Vertrag, einfach erklärt." The other two slogans were already neutral.

---

## 11 — "Add deadline to calendar" — which deadline?

**Seen.** The dates section lists three entries and offers one button:
*"Frist zum Kalender hinzufügen"*. It silently exports the first warning-toned
date. Nothing on the button says which of the three you are about to put in your
calendar, and you only find out after the `.ics` downloads and opens.

**Fix.** The button names its date: *"30.09.2028 in den Kalender übernehmen"*.
The selection logic was already right; it just wasn't saying what it had picked.

---

## 12 — 14 MB of pitch material was published with the app

**Seen.** Not on screen — in `public/`. `public/marketing/` held 14 MB of
whiteboard PNGs, a GIF, a **.pptx** and a **.zip**. Nothing in `src/`,
`index.html` or the API references any of it.

Anything in `public/` is copied verbatim into `dist/` and served, so all of it was
shipping in every zip deploy and sitting at a guessable URL on the live site.

**Worth fixing?** Yes, on both counts: it is dead weight in every deploy, and the
pitch deck being publicly fetchable from the demo host is not something anyone
chose.

**Fix.** `git mv public/marketing docs/marketing`. The files are kept — they are
the pitch material and clearly wanted — but `docs/` is not a served directory, so
they stop being published and stop being deployed. Nothing referenced them, so
nothing broke.

---

## 13 — Wording that described the artefact instead of helping the reader

Three labels, fixed together because they share one failure: they were written
from the inside.

| Was | Now | Why |
|---|---|---|
| `Originalvertrag` / "Original contract" | `Der Vertrag im Wortlaut` / "The contract itself" | "Original" describes provenance — as opposed to a copy? A translation? What the reader wants to know is that these are the contract's own words. |
| "Hervorgehobene Passagen sind die, aus denen Ihre Punkte stammen." | "Ihr Vertrag vollständig. Markierte Passagen sind die, aus denen ein Punkt stammt — wählen Sie eine aus, um die Erklärung zu sehen." | The old line said what the colours mean and nothing else. It never says the whole contract is here (the thing people were unsure about), and never says the marks are clickable — which is the only interaction on the screen. |
| "Über die verfügbaren Quellenlinks gelangen Sie zurück zum Wortlaut in Ihrem Vertrag." | "Jeder Punkt hier führt zurück zum Wortlaut, aus dem er stammt." | Nineteen words of officialese ("über die verfügbaren Quellenlinks") for a six-word idea, on a screen whose entire premise is plain language. |

---

## 14 — "New contract New contract"

**Seen.** Reading the page as text (which is roughly what a screen reader does),
the nav came out as:

    Overview | Contract text | Before you sign | + | New contract | New contract

**Cause.** My own fix from finding 2. The button carries a visible label that is
hidden on phones, plus a visually-hidden copy so the name survives that. On
desktop both are in the accessible tree, so the name is announced twice.

**Fix.** One `aria-label` on the button, and both spans `aria-hidden`. The name is
now correct in both layouts and stated once. Caught by testing the output, not the
screenshot — the kind of thing that is invisible until you read the page the way
assistive tech does.

---

## 15 — When the model is unreachable, the demo wore your document's identity

**Seen.** This is finding 1 looked at from the user's side rather than the
developer's. With no credentials, the server answers with the sample fixture
tagged `stub`, and a banner says *"Demo-Modus — es wird die Beispielanalyse
gezeigt."* Correct. But the page around the banner read:

    Ihr Vertrag auf einen Blick
    Mietvertrag_Aberlestrasse_27 (1).pdf · 14 Seiten · erklärt auf Deutsch

Your filename. A rent, a start date, a deposit and a set of clauses from a
completely different contract. One dismissible strip of yellow standing between a
reader and the conclusion that these are their numbers.

**Worth fixing?** The demo fallback itself: keep it. A hackathon demo that shows a
white error screen because a key expired is worse than one that shows a worked
example, and the banner is honest about which it is. **Attributing that example
to a document we never read: no.** That is the one thing this product cannot do.

**Fix.** Two lines. When the analysis is tagged `stub`, the screens show the
sample's own filename, and the page count is dropped entirely.

The page count is the more interesting half. It is a **real** fact — I really did
extract 4 pages from the uploaded PDF — but it is a fact about a file that this
analysis does not describe. A true number in the wrong place is more convincing
than a false one, and therefore worse. `pages` is `null` on the stub path.

**Verified properly**, not reasoned about: I moved `.env.local` aside, restarted,
uploaded the real contract, and read the result. First attempt still showed
`· 4 Seiten` — the filename was fixed and the page count was not, which is exactly
the bug I would have shipped if I had stopped at "the code looks right". Fixed and
re-checked:

    Beispiel-Mietvertrag_Kastanienallee.pdf · erklärt auf Deutsch   [Demo-Modus banner]

---

## Looked at, deliberately not changed

Recording these matters as much as the fixes — a QA pass that only lists changes
looks like everything else was fine, and some of these were close calls.

**The address and the IBAN in the contract text.** § 1 shows the flat's full
address; § 4 shows the landlord's IBAN. Tempting to strip, and an earlier pass did
remove the party block and the signature block. Those were right: names, dates of
birth and signature lines are *about the people*, not about the deal, and the
screen is no worse without them. The address and the account are **terms of the
contract** — where you are renting, where the money goes. A view called "the
contract in full" that quietly deletes clauses is a worse product than one that
shows the contract. Left as written.

**The bar chart puts the whole deposit in month one.** The contract splits it into
three instalments, and a right listed further down the same page says so. The
schema has no notion of instalments, so the chart cannot know. Adding one would
mean a schema change, a prompt change and a chart change to fix one cosmetic
overstatement on a chart already captioned as a projection. Instead the label now
carries it — *"Kaution, in 3 Monatsraten — 3.540 €"* — so the fact is on screen
next to the figure. Not free of the flaw, but the flaw is now stated rather than
hidden. **Worth doing properly if this ships beyond the hackathon.**

**"5 Dinge, die Sie vor der Unterschrift wissen sollten" vs the "Vor der
Unterschrift" tab.** Same phrase, two things. Mildly confusing, and I could not
find a rewording that was clearly better rather than merely different. Left.

**The first "wichtiger Termin" is the contract's own date.** Not a deadline you
can miss, under a heading about missing deadlines. That is the model choosing what
to list, and the section is honest about being a timeline. Not worth a prompt rule
that might suppress genuine dates.

**The bundled examples show no page count.** They have no PDF, so there is nothing
to count. I considered a plausible constant and rejected it — see finding 3.

**The stub fallback.** Kept, deliberately. See finding 15.

**The `pdf.worker` chunk is 1.3 MB.** Real, and the build warns about it. It is
also the thing that reads the PDF in the browser instead of shipping it somewhere,
which is a privacy property worth 1.3 MB. Not a QA bug.

---

## What I ran

- `npm test` — 50 tests, green. Six are new: three for the currency rewrite
  (including "quotes stay verbatim"), one for the commitment de-duplication, one
  for PDF padding, one for locale symbol placement.
- `tsc -b` — clean.
- The real contract end to end, twice, against the live model: nav, every finding,
  all three explanation depths, the contract-text view, the decision brief, the
  ask box, DE→EN translation.
- Both bundled examples, after the changes, to make sure the fixes for a real PDF
  did not break the demo path.
- The stub path with credentials removed.
- 1440px, 800px and 375px.
- Production build: **16 MB → 2.1 MB**.

## What is still worth doing

- Rotate the Azure OpenAI key. It was pasted in plain text in chat in an earlier
  session and has not been rotated since.
- Deposit instalments as a real concept in the schema, so the chart stops
  overstating month one.

---

## Deploy note

Target: **signwise-hero-7c21** (the host the hero-UI branch used), not the
master host.

The first attempt failed with a bare `Status Code: 400`. The useful detail was
three log levels down, in the Oryx build detail:

    error during build: Could not resolve entry module "index.html".

`SCM_DO_BUILD_DURING_DEPLOYMENT` is on for this app, so App Service runs
`npm run build` itself after unpacking — and my zip contained `dist/`, `src/` and
`api/` but not `index.html` or `vite.config.ts`, which is what Vite builds *from*.
Repackaged with the build entry included.

Worth writing down because the surface error says nothing: a zip deploy to an app
with server-side build enabled needs the **sources**, not just the built output.

The zip is checked before every deploy for `.env*`, the QA test PDF, and
`marketing/` — the test PDF is the real rental contract, with an address and a
bank account in it, and it must never reach a public host.

**A zip deploy does not remove anything.** After the successful deploy the new
bundle was live, and `/marketing/signwise-whiteboard-one-slide.pptx` still
returned the real 1.78 MB file: `az webapp deploy` unpacks over `wwwroot` without
clearing it, so files deleted from the repo stay on the server forever. Finding 12
was fixed in the build and not on the host. Redeployed with `--clean true`.

Also worth recording, because it nearly sent me the wrong way: probing for the
test PDF returned **200**, which looks like the contract is published. It is not —
`server.ts` has an SPA fallback that answers any unknown non-API GET with
`index.html`, so a missing file returns 200 and 584 bytes of HTML. **Status code
alone cannot tell you whether a file is gone on an SPA host**; the content type
can. `text/html, 584b` = absent, `application/vnd...presentation, 1784465b` =
very much present.

---

## 16 — The audio briefing branch, merged — 26 August 2026

`origin/NewFeatureTesting` had been sitting on the remote since before the
whole-contract pass, one commit, "Add ElevenLabs audio briefing but it needs to
be tested". It never showed up in `git branch -vv` because there was no local
copy of it — **`git branch -vv` lists local branches only; a remote-only branch
is invisible to it.** Use `git branch -a` when the question is "is there anything
I have not merged".

It still fitted after twelve commits of drift. One conflict, in the README, which
was mine to resolve because I had rewritten the file underneath it. `App.tsx`,
`Overview.tsx` and `styles.css` auto-merged. The script builder reads `findings`,
`clause.means`, `dates[].tone` and `contractType`, all of which survived.

Two things changed on the way in.

**`@elevenlabs/elevenlabs-js` and `dotenv` were dependencies that nothing
imported.** The handler talks to ElevenLabs with plain `fetch`, and nothing in
the repo loads dotenv — vite.config puts the env on `process.env` itself. Both
removed.

**The card rendered whether or not the server could ever produce audio.**
Neither App Service app has `ELEVENLABS_API_KEY`, `ELEVENLABS_HOST_VOICE_ID` or
`ELEVENLABS_GUIDE_VOICE_ID`, so `/api/audio` could only answer 503 — which the UI
catches as "Die Audio-Zusammenfassung konnte gerade nicht erstellt werden." A
"Create audio" button that fails on every press in front of a judge is worse than
no button at all. A `GET /api/audio` now answers `{"configured":boolean}` and the
card returns `null` until that comes back true.

The probe lives **inside the handler**, not as a route in `server.ts`. The dev
middleware in `vite.config.ts` routes every method of `/api/<name>` to that
module's default export, so a GET mounted only on the express side would have
answered `{"configured":…}` in production and `405 POST only` in dev — the exact
class of dev/prod split that hides until the demo.

`server.ts` uses `app.all("/api/audio", …)` rather than `app.post`, so both
methods reach the same handler the way dev does.

### Verified on the preview host

`assets/index-BuyQNuon.js`, `signwise-hero-7c21`:

- `GET /api/audio` → `200 {"configured":false}`
- `POST /api/audio` → `503 {"error":"audio_not_configured"}`
- Overview renders with **no audio card** and no console errors.
- With the probe stubbed to `true`, the card appears — kicker, "Lieber zuhören?",
  the language dialog, and the ElevenLabs privacy line — and pressing Create audio
  runs the **real** POST, takes the 503 and shows the German error without
  crashing or leaving a spinner running.

### Not done, and why

**The ElevenLabs call itself has still never run.** Everything above tests the
paths around it; `text-to-dialogue` with `eleven_v3` has not once been executed,
because there is no API key. Until it has, this stays off `master`. Setting the
three values on `signwise-hero-7c21` is the only thing standing between here and
a real answer.
