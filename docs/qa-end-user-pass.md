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
