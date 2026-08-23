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
