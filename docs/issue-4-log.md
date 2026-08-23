# Issue #4 — Bugs & Improvements: implementation record

Branch: `issues` (cut from `master`)
Source: [#4](https://github.com/chanderbhanu096/SignWise/issues/4) — reported by @Chennn03
Preview host: https://signwise-hero-7c21.azurewebsites.net

One commit per reported item. Every entry below says what the report was, whether
it was worth fixing at all, what the root cause turned out to be, and why the fix
took the shape it did. Items judged **not worth fixing as asked** are recorded with
the argument, not silently dropped.

---

## 1 · "switching between languages quite slow"

**Worth fixing: yes.** Not because it can be made fast — a language switch on an
uploaded contract is a model round-trip and will always take seconds — but because
nothing on screen said so. The chrome (buttons, headings) flipped instantly while
the contract content stayed in the old language, which reads as broken rather than
as busy.

**Root cause.** `changeLang` called `translate()` and awaited it with no state of
its own: no pending flag, no cache. Switching DE → EN → DE paid for the same
translation twice.

**Fix.**
- `langCacheRef` keeps one analysis per language for the life of the contract, so
  every switch after the first is instant.
- `translating` state drives a `role="status"` banner and disables both language
  pills, so the wait is visible and a second click cannot queue a second call.
- The sample contracts are untouched: they are bilingual fixtures and were already
  instant.

**Why not something cleverer** (translate both languages up front, in the
background, right after analysis): it doubles the model spend on every single
upload to save a wait that most users never trigger. The cache gets the same
result for the users who actually switch, and costs nothing for the ones who don't.

## 2 · "use a brighter color like red for the important tag, right now similar to standard"

**Worth fixing: yes — but not with red.**

The complaint has two halves and only one of them is about brightness. "Important"
(teal `#0a464f` on `#e0f0f1`) and "Standard" (green `#1a6d4a` on `#eaf5ef`) were two
low-saturation dark-on-pale badges a few degrees apart on the colour wheel. At badge
size they are genuinely hard to tell apart. That is a real defect and it is fixed.

**Why not red.** The app states in its own UI that *"these levels show how much
attention something deserves. They do not say whether a clause is legally valid —
SignWise never judges that."* Red is read as invalid / dangerous / error. Putting a
red badge on a clause we explicitly refuse to judge would contradict the sentence
sitting two lines above it — in front of a Ministry of Justice jury, on a tool whose
whole pitch is that it explains rather than advises. Red stays reserved for genuine
errors (`.banner-error`).

**What was done instead — prominence from weight, not from alarm.**
- Important is now the only **solid filled** badge: white on `#0a464f`, against two
  outlined levels. It is the loudest thing in the row without claiming a verdict.
- Standard moves from green to neutral grey `#55666b`. It recedes, and it can no
  longer be confused with the teal.
- Important findings get a 3px accent bar on the row, so the level is readable
  before the badge text is.

Both halves of the report are answered: it is clearly brighter in the sense that
matters (contrast against its surroundings), and it is no longer similar to
Standard. Flipping to red later is a one-variable change if the team disagrees.

## 3 · "rethink the level, because we are not showing standard things at all — 5 important, 0 in other categories"

**Worth fixing: yes, and this was the most substantive report in the list.** Two
separate defects were hiding behind one symptom.

**Defect A — the counts described the cut-off, not the contract.** The triage chips
counted `analysis.findings`, which is capped at five and ordered most-important-first.
A contract whose top five all happen to be important therefore always renders as
"Important 5 · Worth checking 0 · Standard 0", regardless of what is in the document.
That number told the reader nothing about their contract and quietly implied the
whole thing was alarming.

Fixed by counting over `analysis.clauses` — everything the analysis surfaced. The
default list is unchanged (the five headline findings, ranked); selecting a level now
opens every clause at that level, including ones that never made the top five. On the
bundled rental example this turns `3 / 2 / 0` into `3 / 2 / 1`, and the Standard chip
now reveals a clause that the Overview simply never showed before.

A line under the chips states the scope out loud: *"SignWise looked at 6 clauses.
Below are the 5 that matter most — select a level to see every clause in it."*

**Defect B — the model was never asked for the ordinary clauses.** The prompt said
"return 3 to 5 findings" and said nothing at all about how many `clauses` to return,
so the model returned roughly the findings and nothing else. Counting over clauses
fixes nothing if clauses ≈ findings. The prompt now asks for every provision that
shapes the deal — typically 6 to 12, explicitly including the ordinary ones rated
"standard" — and defines `findings` as the top 3–5 *of those*.

**Why not a separate "standard provisions" summary section** (the report's other
suggestion): the Overview already carries five blocks and the Original screen already
lists every clause in document order. A sixth block restating the boring clauses adds
scrolling to the page whose job is triage. Filtering by level puts the same
information one click away, inside the control the reader is already using.

## 4 + 6 · "the symbols on the overview page are not the same as on the before-you-sign page" / "replace the ? with △"

Reported twice, one defect. **Worth fixing: yes** — this was a correctness problem,
not a styling preference.

**Root cause.** `?` meant two different things on two screens. On the Overview it was
the mark for the level *Worth checking*; on the decision brief it was the mark for
*a question to put to the other party*. A reader who learns the glyph on one screen
learns the wrong thing for the other.

**Fix — one mark vocabulary, four marks, no overlap:**

| mark | meaning | where |
|---|---|---|
| `!` | Important | overview, original |
| `△` | Worth checking / worth another look | overview, original, decision |
| `✓` | Clear / standard | overview, original, decision |
| `?` | A question for the other party | decision only |

**The orphan label.** The decision hero's badge row promised "✓ Clear from contract",
a phrase that appears nowhere else on the page — the section it points at is called
"What you're agreeing to". The badges now carry the exact headings of the three
sections below them, which turns the row from a glossary of invented terms into a
contents line. `stateClear` and `stateClarify` were then unreferenced and are deleted.

`.state-badge.clear` was pointing at the `--std-*` variables, so item 2's move of
Standard to grey would have quietly greyed out a positive state. It now has its own
`--ok-*` green: "clear" is a good outcome, "standard" is a neutral one, and they are
no longer the same colour by accident.

## 5 · "your cost over 12 months could be misleading as the landlord could increase the money"

**Worth fixing: yes, and this one is not cosmetic.** The chart holds today's rent
flat across twelve months. On the bundled rental example, one of the five findings
on the same page is *"Miete kann steigen"* — the page contradicted itself, and the
half that looked authoritative was the chart.

A tool that tells people what a contract commits them to cannot present a projection
as if it were a schedule. That is the kind of detail a Ministry of Justice jury reads
closely.

**Fix.** A line under every chart: *"A projection from the amounts written in your
contract, assuming they stay the same. Any increase or change your contract allows is
not included here."* The chart's `aria-label` says "projection" rather than "bar
chart" for the same reason.

**Why always, not only when an increase clause is detected.** Detecting one means
keyword-matching a model-written, localized clause title, and the failure mode is
silent: a contract that permits an increase, matched wrongly, shows a chart that
claims more certainty than it has. The sentence is true of every projection, so it
is shown for every projection. One line of copy beats a heuristic that can be wrong
in the direction that costs the reader money.

## 7 · "make the line/shadow underneath the top bar lighter, right now it is a green line"

**Worth fixing: yes, despite being filed as "not so important."** It is a
one-declaration change and the line sits under every screen in the app, so the cost
of fixing it is far below the cost of it being slightly wrong everywhere.

**Constraint.** The header's border line is a deliberate part of the design the repo
owner asked to keep when the hero branch was merged. So the line stays — only its
weight changes. The gradient's alphas are roughly halved (`0.42 → 0.20`,
`0.28 → 0.13`, `0.40 → 0.19`, `0.24 → 0.11`). It now reads as the brand tinting an
edge instead of a green rule the eye keeps returning to.

The `box-shadow` was left alone: at `rgba(18,38,43,0.055)` it is neutral grey and not
what made the edge look green.

## 8 · "the animation looks super nice when deleting but when typing, the words are shaking"

**Worth fixing: yes.** It is the first thing anyone sees, including a jury.

**Measured, not guessed.** Sampling `.slogan-line` while it typed showed the line's
width moving between `890.16px` and `891.77px` — a spread of **1.61px** — and its left
edge moving `287.28 → 286.50`. A centred line shifts by half the width change, so the
headline was jumping ~0.8px on every keystroke. It is worse while typing than while
erasing only because erasing runs at 26ms per character against 55ms, so the eye has
less time to catch each jump.

**Two wrong suspects, both ruled out by measurement.** Kerning across the split
(0.016px — not it), and the inline-block caret between the typed text and the
remainder (making it `position: absolute` changed the spread by exactly nothing:
still 1.61px).

**Actual cause.** The line was `[typed text node][caret][hidden remainder span]`. The
browser snaps each inline box boundary to the pixel grid, so the sum of the snapped
parts depends on *where* the split falls — which moves by one character every 55ms.

**Fix.** One inline box per character, with the untyped ones `visibility: hidden`
instead of absent. The number and position of the box boundaries is then constant, so
the width is constant. Re-measured over 101 samples across typing and erasing:
**spread 0.00px**, first character pinned at `252.30px` on every frame. The caret
stays out of flow so it can sit at the split without contributing width.

**Cost.** ~35 `<span>`s re-rendered every 55ms, which is nothing, and 0.3px wider
than a plain text run — the hidden sizers use the same markup so they still reserve
the correct box. Word wrapping is unaffected: verified at 375px, where the slogans
break at spaces (`"Erst verstehen, dann " / "unterschreiben."`) with no mid-word
breaks and no horizontal overflow.

## 9 · "little alignment issue for the box" (screenshot: employment compensation)

**Two thirds of this was already fixed before the issue was picked up**, in
`f27988f` on master. The screenshot shows the state before that commit:

- the "Brutto pro Monat" card stretched to the full height of its tallest sibling,
  leaving ~290px of white space under a single number — grid items stretch by
  default, fixed with `align-items: start` on `.money`;
- "Weitere mögliche Zahlungen" sat *inside* the "Zusätzliche Vergütung" card, as a
  block with no amount inside rows that align around one — it is now its own card.

Verified on this branch: the compensation card is 138px tall against its 312px
neighbour, and the three cards are separate.

**One part of the report was still live, and it is the row alignment itself.**
`.money-row` was a `flex-wrap: wrap` row, so a label long enough to collide with its
amount pushed the amount onto a line of its own. On the employment example the total
row *"Mögliche Gesamtvergütung pro Jahr — 42.480 €"* did exactly that, so two amounts
sat flush right and the third sat below its label. That is the misalignment, and it
was introduced by the earlier wrap fix.

Now a two-column grid, `minmax(0, 1fr) auto`: a long label wraps inside its own
column and the amount stays on the first line, flush right. All four amounts in the
card now share an edge at the same x (`790`), on one line each, with no overflow.

## 10 · "rename overview — we could even ask our own questions; something like Summary and Clarify"

**Worth fixing: yes.** "Overview" describes the first block on the screen and
undersells the rest of it. The screen carries the findings triage, the money section,
the dates, the rights and duties — and the one thing no other screen has, a box where
the reader asks their own question about their own contract and gets an answer that
links back to the wording. That is the demo's strongest moment and the nav label was
hiding it.

**Named `3 · Overview & answers` / `3 · Überblick & Antworten`, not "Clarify".**
"Clarify" is already taken, and taken for the opposite thing: the decision brief's
*"Questions to clarify"* are the points the contract leaves open, which the reader has
to take to the landlord or employer. Calling the overview "Clarify" too would put the
same word on the screen that *answers* questions and the screen that *collects* the
ones nobody can answer yet — the identical collision that item 4/6 was about. Under
"answers" the contrast is the right way round: answers here, open questions there.

Checked at 375px: the longer label costs ~65px in a nav strip that is already an
`overflow-x: auto` scroller, and adds no page overflow.

## 11a · comment: "I don't know what happened here… probably just my browser" (screenshot: the screen switcher on the landing page)

**Could not reproduce, and the fix is still worth making.**

The screenshot shows the upload screen — hero, eyebrow, upload card — with the demo
screen switcher (`3 · Überblick · 4 · Original · 5 · Vor der Unterschrift`) sitting
above it. That combination requires `analysis !== null` while `screen === "upload"`.

I traced every route into the upload screen: the "+ new contract" dialog clears the
analysis before switching, the analysing screen's cancel and the error path are only
reachable from an upload that already had no analysis. I could not construct the
state through the UI, and the reporter's own "probably just my browser" is plausible.

**Fixed anyway, because the condition was wrong even where the flow was right.** The
switcher tested `analysis && screen !== "analyzing"`, and the low-confidence and
translation banners tested even less than that. What kept the landing page clean was
the confirm dialog remembering to null the analysis — an invariant enforced by
discipline in a callback, not by the condition that does the rendering. One
`inDocument` flag now states it once:

```ts
const inDocument = !!analysis && screen !== "upload" && screen !== "analyzing";
```

The switcher and all three analysis banners read from it. The state in the screenshot
is now unreachable by construction rather than by accident. Verified: overview shows
the switcher, "start over" returns to a landing page with zero banners and no nav.

## 11b · comment: "§ 2 BetrKV does not turn into a forward link"

**Worth fixing: yes, and it uncovered two links that were already broken.**

**Root cause.** Law citations are mapped to gesetze-im-internet.de through a
deliberate allow-list, and anything not on it renders as plain text rather than a
guessed URL. `BetrKV` (Betriebskostenverordnung) — the single most-cited regulation in
a German tenancy after the BGB itself — was not on the list. The fallback worked
exactly as designed; the list was too short.

**What checking the list turned up.** Verifying every slug against a live section page
showed that `tkg` and `vvg` both 404. A German law that is re-enacted gets a dated
slug, and both had moved: `tkg_2021` and `vvg_2008`. Those two are the telecom and
insurance statutes — the two contract types the app names in its own suggestion
sets — and they were not falling back to plain text. They were rendering a working-
looking link, labelled "View official law ↗", straight to a 404. That is a worse
failure than the one reported, and nothing in the app surfaced it.

**Fix.** The allow-list now covers what consumer contracts actually cite: BetrKV,
HeizkostenV and ZPO for renting; ArbSchG, BBiG, MuSchG and BEEG for employment;
UWG, UKlaG, PAngV, FernUSG, ProdHaftG, BDSG and TTDSG for subscriptions, insurance and
consumer protection — with `tkg` and `vvg` corrected. Every slug was checked with a
request to a real section page (`/betrkv/__2.html`, `/tkg_2021/__56.html`, …), not
inferred from the abbreviation.

Two tests were added, covering the dated-slug cases and the rental citations, so the
next re-enactment fails in CI rather than in front of a reader. GG was left off
deliberately: the Grundgesetz uses `art_13.html` rather than `__13.html`, and one
special case is not worth carrying for a law no consumer contract cites.

---

## Summary

| # | Report | Verdict | Commit |
|---|---|---|---|
| 1 | Language switching slow | Fixed (cache + visible wait) | `keep a translated copy per language and show the wait` |
| 2 | Important tag too similar to Standard | Fixed, **not with red** — argued above | `make the important level the loudest badge and neutralise standard` |
| 3 | Levels show 5 important, 0 of anything else | Fixed — two defects, UI *and* prompt | `count the levels over the whole contract, not the top five` |
| 4 + 6 | Symbols differ between screens; `?` should be `△` | Fixed — one mark, one meaning | `use one mark for one meaning across the screens` |
| 5 | 12-month cost chart could mislead | Fixed — stated as a projection | `say the 12-month chart is a projection` |
| 7 | Header line too green | Fixed — line kept, weight halved | `soften the header hairline to a tint` |
| 8 | Slogan shakes while typing | Fixed — 1.61px → 0.00px, measured | `stop the slogan shaking as it types` |
| 9 | Alignment issue in the compensation box | Mostly fixed already; the live part fixed | `hold the amount on its own line in the money rows` |
| 10 | Rename "Overview" | Fixed — "Overview & answers", not "Clarify" | `name the overview screen after what it can do` |
| 11a | Screen switcher on the landing page | Not reproducible; condition hardened anyway | `keep the analysis chrome off the landing page` |
| 11b | BetrKV not linked | Fixed — and two live links were 404ing | `link the laws consumer contracts actually cite` |

Nothing in the list was dropped. Two reports were answered differently from how they
were phrased — no red for Important (item 2) and no "Clarify" in the overview's name
(item 10) — and both arguments are written out above rather than left implicit.

**Verification.** 30/30 tests pass. Checked at 1280×900 and 375×812, both languages,
both bundled examples, across all five screens: no horizontal overflow, no console
errors on a clean session.

---

### Item 2, revisited twice — reverted to solid teal

Red (`#8f2822`) was tried on 2026-08-23 as a warm attention ramp — red · amber · grey
— and reverted the same day at the repo owner's request. The shipped treatment is the
one described under item 2 above: **Important is solid teal `#0a464f` with white
text**, the only filled badge; Worth checking stays outlined amber; Standard stays
neutral grey.

Both halves of the original report still hold: Important is clearly the loudest badge
in the row, and it can no longer be confused with Standard. The colour lives in one
variable (`--imp-fg`), so this remains a one-line decision if anyone wants to revisit
it a third time.

---

# Issue #5 — Bugs: implementation record

Source: [#5](https://github.com/chanderbhanu096/SignWise/issues/5) — reported by @Chennn03.
Same rules as above: each item gets a verdict, and the ones not worth doing as asked
are recorded with the argument.

## 5.1 · "switching the language is really slow, but not a priority to fix"

**No new work — already fixed, and the screenshot proves it.** The image attached to
this line shows the EN pill greyed out mid-switch, which is the busy state added in
issue #4 item 1. That round also added a per-language cache, so the second switch and
every switch after it is instant.

The first switch stays slow and always will: translating an analysis is a model call
of several seconds. What was fixable was the silence around it, and that is done.
Making it genuinely fast would mean translating into both languages on every upload —
doubling the model spend on every single contract to save a wait most readers never
trigger. Not worth it, and the reporter agrees it is not a priority.

## 5.2 · "oops" (screenshots: the cost cards misaligned, and a hole beside the third)

**Worth fixing: yes. Two real bugs in one screenshot, and one of them was mine.**

Reproduced at a 900px viewport: card 1 at `top: 0`, cards 2 and 3 at `top: 18px`,
inside a grid row they are supposed to share — and with two columns the third card
was orphaned, leaving an empty half-row beside it.

**Bug A — a stray sibling margin.** `.card + .card { margin-top: 18px }` was applying
to cards inside grid containers, which already space themselves with an 18px `gap`.
It pushed every card except the first one down by 18px within its own cell — visible
in `.money` and in `.two` (rights and duties). The same rule was also beating
`.block { margin-top: 30px }` on specificity in normal flow, quietly cutting the
section rhythm on the overview from 30px to 18px. The rule is deleted: every place
that stacks cards already spaces them.

**Bug B — the orphan.** `repeat(auto-fit, minmax(min(100%, 300px), 1fr))` with three
cards always leaves a hole at two columns. `.money` is now `flex-wrap` with
`flex: 1 1 300px`, so a wrapped last card grows to fill its own row. Verified at 1280
(three across, all `top: 0`), 900 (two across plus a full-width third) and 375
(stacked), no overflow anywhere.

## 5.3 · "it looked at all clauses and summarized 15 points/findings"

**No action — this is the issue #4 item 3 change doing its job.** Their contract now
yields 15 surfaced clauses with the 5 most important listed, and the line under the
chips says exactly that. Before that change the same contract would have reported
"5 important, 0 of anything else", which said nothing about the contract at all.

## 5.4 · "nothing happened when click on explanation level"

**Worth fixing: yes. The control was real, in the wrong place.**

Simple / Standard / Detailed sets `depth`, which selects between `clause.simple.*`.
That text is rendered in exactly two places — the clause panel and the original view's
explanation pane — and the control was sitting in the overview header, where nothing
on screen responds to it. Pressing it there genuinely did nothing visible. Not a
state bug: a control placed away from its effect.

It now sits inline in the pane label of the text it rewrites, in both places, as a
smaller variant of the same segmented control. `aiMeta` ("AI explanation · Standard ·
English") became redundant next to it and is deleted. Verified: all three levels
change the paragraph in the panel and in the original view, and `aria-pressed`
follows.

## 5.5 · "the level red important matches to the yellow one which is worth another look !!!!"

**Worth fixing: yes — this was the sharpest observation in the issue.** It is a
correctness problem, not a colour preference.

**Root cause.** `getDecisionSummary` ranks review items by *consequence*, so it draws
from clauses at both the `important` and `check` level. The panel holding them was
styled entirely as the `check` level — amber top border, amber `△` mark, and a
heading, "Worth another look", one word away from the level name "Worth checking". So
a clause the overview called **Important** was re-labelled by the section it landed in.

**Fix — the section stops claiming a level, and each item states its own.**
- Every review card now leads with its clause's real `<Severity>` badge. On the rental
  example the panel reads `△ Worth checking`, `△ Worth checking`, `! Important`,
  matching the overview exactly.
- The panel's amber border and `△` mark are gone. The four sections are numbered steps
  (1–4) in a walkthrough, because that is what they are — organised by what to *do*,
  not by severity. The numbers are computed, so removing the clarify panel when a
  contract leaves nothing open does not leave a gap in the sequence.
- The hero's legend row is deleted. It paired a level mark with each section heading,
  which could not be true for a section that mixes levels — it was the thing that
  taught the wrong mapping in the first place.

The level marks `!` `△` `✓` now appear only on clauses, and mean one thing each
everywhere in the app.

## 5.6 · Wording of the "Before you sign" categories

Asked for separately alongside #5. The headings named states; they now name actions,
in words a non-lawyer uses:

| was | is |
|---|---|
| Worth another look · Genauer ansehen | **Read these again before you sign** · **Vor der Unterschrift noch einmal lesen** |
| Questions to clarify · Fragen, die Sie klären sollten | **Ask the other side about these** · **Das sollten Sie nachfragen** |
| Check your understanding · Prüfen Sie Ihr Verständnis | **Can you explain it in your own words?** · **Können Sie es in eigenen Worten erklären?** |

"What you're agreeing to" was already plain and is unchanged. The review sub-heading
now says why the section exists — "These clauses have the biggest consequences for
you" — instead of restating the heading. Renaming the review section also removes the
last near-collision with the level name "Worth checking".

## 5.7 · "What this means for you" in simpler language

Asked for separately. The prompt described the JSON shape of `means` and `simple` and
said nothing about how to write them, so the model wrote like a contract.

The prompt now specifies the register, using the bundled fixture — which was always
written this way — as the worked example: one or two short sentences answering "what
does this mean for me?", saying what the reader has to **do, pay or watch out for**,
with the contract's own figure or date in them. Everyday words, active voice, direct
address, under about 15 words a sentence, "Sie" in German. No restating the clause, no
reusing its legal wording (and where a term is unavoidable — Kaution, Kündigungsfrist,
Nebenkosten — name it once and explain it in the same sentence), no filler, no advice.

The three `simple` levels are defined as differing in **coverage, not difficulty**:
"detailed" adds the mechanism and the exceptions, and must not mean more legalese.
That matters more now that the level switch is next to the text (5.4) and people will
actually press it.

The bundled examples keep their hand-written text — they are the fixture, and they
already read the way the prompt now asks for.

---

## Item 2, third pass — red, tested against the supplied swatches

The repo owner supplied a red swatch set and asked for it to be tested rather than
assumed, with the amber "Worth checking" left alone. Measured first, applied second.

**Contrast against white badge text** (the Important badge is the only solid fill, so
this is the gating number — AA needs 4.5:1):

| swatch | vs white text | verdict |
|---|---|---|
| `#5c0000` darkest | 14.43 | passes, but reads near-black at badge size |
| `#8e0a0a` dark | **9.55** | **chosen** — unmistakably red and clears AAA |
| `#d95e5e` medium | 3.42 | fails AA — cannot carry text |
| `#e89a9a` light | 2.21 | fails AA — cannot carry text |

The two light swatches are not usable as a filled badge, so they were put where they
do work: `#e89a9a` is now `--imp-bd` (the row's border tint), and the wash behind an
Important passage is `#fdecec`, the same lightness family as the existing amber wash.
The chosen ramp is `--imp-fg: #8e0a0a` · `--imp-bg: #fdecec` · `--imp-bd: #e89a9a`.

Verified in place: badge white-on-red **9.55:1**, document body text on the red wash
**10.24:1**, the amber level untouched at 10.63:1.

**Also implemented on the original document view, as asked — and it turned out to be
a real gap.** `Original.tsx` set `data-tone={c.level === "check" ? "warning" : "normal"}`,
so the document highlighted *check* passages in amber and gave **important** passages
the same brand-teal wash as ordinary *standard* ones. The loudest level was the one
the document did not mark at all. `data-tone` is now the level itself, and all three
tones are styled: red wash for important, amber for check, teal for standard, with the
selection ring following the same colour.

**One accessibility fix found on the way.** The passage label inside a highlight
(`.doc-clause .tag`, `--muted-2`) measured 3.66–3.91:1 against the washes — under AA
on all three tones, including the teal one that predates any of this. Moving it to
`--muted` puts every tone at 7.2:1 or better.
