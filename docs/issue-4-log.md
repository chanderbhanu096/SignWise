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
