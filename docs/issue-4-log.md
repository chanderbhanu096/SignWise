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
