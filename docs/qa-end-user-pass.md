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
