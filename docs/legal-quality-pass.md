# Legal-quality pass — statutory grounding, data minimisation, depth levels

Branch `qa/end-user-pass`, continuing from [docs/qa-end-user-pass.md](qa-end-user-pass.md).
Live at <https://signwise-hero-7c21.azurewebsites.net>.

This pass started from the hackathon's own scoring sheet rather than from the code,
then used the two reference repositories the organisers link from the materials page
to decide what was actually worth building.

---

## 1. What the jury is scoring

`LLT2026_Bewertungskriterien.pdf`, final pitches, 27 August 2026. Six criteria, each
scored 1–10 by every juror, **60 points maximum**:

| # | Kriterium | Max | Leitfrage |
|---|-----------|-----|-----------|
| 1 | Problemverständnis & Relevanz | 10 | Challenge korrekt verstanden? Zielgruppe klar? Reales rechtliches Problem? |
| 2 | Innovationsgrad | 10 | Originell? Geht über bekannte Ansätze hinaus? Echter Mehrwert? |
| 3 | Technische Umsetzung | 10 | Ø aus 3a Coding/Mockups, 3b Kreativität, 3c Usability, 3d Design |
| 4 | **Rechtliche Qualität** | 10 | **Rechtliche Korrektheit, Berücksichtigung rechtlicher Anforderungen, Bewusstsein für rechtliche Grenzen** |
| 5 | Präsentation & Pitch | 10 | Struktur, verständliche Vermittlung, Kompetenz |
| 6 | Praxistauglichkeit & Impact | 10 | Realistische Umsetzbarkeit, gesellschaftlicher Mehrwert |

Criterion 4 is a full sixth of the score, and it was the weakest part of the app.
Everything below is aimed there first, with criterion 2 and 3c as the second target.

The challenge itself (`Challenges StMJ (IV) – Was unterschreibe ich`) names the legal
frame it expects to see considered: Vertragsschluss (§§ 145 ff. BGB), Rechte und
Pflichten (§§ 320 ff. BGB), Laufzeiten und Kündigung, Verbraucherschutz (§§ 312 ff.
BGB) and **AGB-Kontrolle, insbesondere Transparenz und Verständlichkeit (§§ 305 ff.
BGB)** — while stating explicitly: *"Eine vollständige rechtliche Prüfung der
Wirksamkeit einzelner Klauseln ist nicht erforderlich"* and *"Ziel ist nicht die
rechtliche Beratung"*.

That pair of sentences is the design constraint for this whole pass: **cite the law,
never render the verdict.**

Dr. Radtke's lecture from the hackathon (`Was darf Legal Tech II`) supplies the rest
of the checklist a jury of lawyers will have in mind — KI-VO, Art. 5/6/13/44 ff.
DSGVO, and the EuGH's SRB reasoning on pseudonymisation. It is cited where used.

---

## 2. What the two reference repositories were actually good for

**[Liquid-Legal-Institute/Legal-Text-Analytics](https://github.com/Liquid-Legal-Institute/Legal-Text-Analytics)**
is a resource index, not a library. Most of it is training corpora and research
tooling for building models — no use to a prototype that calls a hosted GPT. Three
things in it were directly useful:

- **Gesetze im Internet** as the canonical, machine-readable source of German
  statutory law. It is what made finding #2 below fixable rather than merely
  identifiable.
- The repository's framing of *Data Anonymization* and *Reference and Coreference
  Extraction* as first-class legal-NLP tasks, which is where finding #3 came from.
- **AGB-DE** ("Detecting void clauses in German standard form consumer contracts")
  as the shape of the problem the trap contract exposes — with the deliberate
  decision **not** to copy its output, because a tool that labels clauses "void" is
  doing exactly what the challenge excludes and what § 2 Abs. 1 RDG reserves.

Deliberately not taken: the German legal BERT models, LexNLP, Blackstone and the
court-decision corpora. All of them would mean shipping a second inference stack to
do worse what the hosted model already does on contract prose.

**[Klotzkette/claude-fuer-deutsches-recht](https://github.com/Klotzkette/claude-fuer-deutsches-recht)**
is a prompt/skill collection for lawyers, not a library either — and it is aimed at
professionals producing *verwertbare Endprodukte*, the opposite of a consumer tool.
What transferred is its **citation discipline**, stated there as: free sources only,
no blind citation, and case law only "mit Gericht, Datum, Aktenzeichen und
verifizierbarer Quelle". Two rules were adopted from it verbatim in spirit:

1. A citation that cannot be verified does not get presented as a source (#2).
2. No case law is cited at all in this app, because a citation this tool cannot
   verify is worse than no citation. Every statutory benchmark added below rests on
   statute text only — see "deliberately not done".

Its disclaimer structure (§§ 203/204 StGB, § 43e BRAO, DSGVO) is a professional-user
checklist and does not apply to a consumer tool; the consumer equivalents are in #4.

---

## 3. Findings and fixes

### Finding 1 — Asking for **more** detail took information away
*Reported by the user. Severity: high — it is the control the whole "einfache
Sprache" claim rests on.*

The clause explanation has three levels (Einfach / Standard / Ausführlich). The model
was writing three *rewrites* of the same sentence rather than three depths of one
explanation, so switching level swapped facts in and out.

Measured on the Munich test tenancy, before the fix:

- **6 of 15 clauses lost a content word** moving up a level.
  `§ 6`: "Küche und Bad **spätestens** alle **drei Jahre** renovieren" became "Küche
  und Bad nach drei" — the *spätestens* that makes it an obligation, gone.
  `§ 3`: standard said "330,00 EUR Vorauszahlungen", detailed dropped the total.
  `§ 9`: standard said "auch für Kleintiere", detailed dropped the category.
- `detailed` added a **median of 65 characters** over `standard`. The control
  visibly did almost nothing.

The prompt already asked for cumulative levels, in bold, with a worked example. It
was not enough — this is the same lesson as the quote verification: **a checkable
rule beats a prompt request.**

**Fix — the levels are now increments, and the app composes them.**
`simple` is a complete sentence; `standard` is *only what is added* at the standard
level; `detailed` is *only what is added* on top. [src/depth.ts](../src/depth.ts)
renders level 1, then 1+2, then 1+2+3. Cumulativeness stops being something the
model has to remember and becomes something the data shape cannot violate.

A model that ignores the instruction and returns three self-contained rewrites
anyway — and every analysis produced before today — still has to render. So each
part is checked before it is appended: a part that brings back the figures already
on screen is a rewrite and *supersedes* what it restates instead of duplicating it.
That check is what makes this safe to ship against a model's output rather than a
fixture.

After: **0 fact drops** in 26 fixture renderings (both languages, both examples) and
**0 in 14 clauses** of a fresh model run on the same trap contract. The prompt and
both shipped example contracts were rewritten to the incremental shape, so the demo
shows the behaviour rather than describing it.

Two bugs in my own composition check, both found by measurement rather than reading:

- German `ein/eine/einen` were being read as the figure 1. "bis **eine** Seite
  kündigt" made a level look like a restatement of one containing a 1, and the
  replacement then dropped the year 2026. English "one" had the identical problem
  ("one side"). Both removed from the numeral table: missing a figure only makes the
  check *append*, which is the harmless direction — at worst a sentence repeats,
  never a fact disappears.
- The word-overlap fallback was getting a second vote after the figures had already
  decided. An increment naturally reuses vocabulary ("Betrag", "zahlen") without
  repeating anything, so the fallback overrode the figures and dropped "3.000 €"
  from the deposit clause. Figures now decide alone whenever there are any.

Tests: [test/depth.test.ts](../test/depth.test.ts) — the monotonicity property is
asserted over every fixture clause in both languages, so a future fixture edit that
breaks it fails the build.

### Finding 2 — Invented statutory citations became links to official law
*Severity: high. Nothing in front of a Ministry of Justice jury is worse than a
fabricated § presented as an official source.*

The model returns citations like `{ law: "BGB", section: "§ 551" }`, and
`getOfficialLawUrl` turned them into `gesetze-im-internet.de/bgb/__551.html`. Nothing
checked that the section exists. `§ 9999 BGB` would have rendered as a confident link
labelled "Gesetzestext ansehen" and delivered a 404.

**Fix — verify the citation against the real law before it becomes a link.**
[scripts/build-law-index.mjs](../scripts/build-law-index.mjs) fetches the official
table of contents of all 30 laws the app can map and records every section number
that actually exists: **5,000 sections across 30 laws, 25 KB**, committed as
[src/lawindex.ts](../src/lawindex.ts). A citation whose section is not in the index
falls back to plain text — the citation is still shown, it just is not dressed up as
a verified source. The fallback path already existed for unknown laws; it now covers
unknown sections too.

Side effect worth having: the generator run also confirmed all 30 slug mappings
resolve, including the dated ones (`tkg_2021`, `vvg_2008`, `muschg_2018`,
`bbig_2005`, `pangv_2022`, `bdsg_2018`).

### Finding 3 — Cited statutes said nothing, on the contract that needed them most
*Severity: high. This is criterion 4 in one line.*

Run the Munich trap tenancy through the app as it stood. It is a purpose-built
minefield: a 5.800 € deposit on 1.450 € net cold rent, six months' notice for the
tenant, an automatic 8 % annual rent rise, a 150 €/day penalty, liability limited to
intent, subletting excluded outright.

The model surfaced every one of those clauses, rated them correctly, and cited § 551,
§ 573c, § 558 and § 553 next to them. And then said nothing about what any of those
provisions contain. A reader saw *"Sie zahlen 5.800,00 EUR Kaution"* beside a link
labelled "§ 551 BGB" and learned exactly nothing. On the penalty clause it cited
§ 546 and § 546a and **missed § 555 BGB entirely** — the one provision squarely on
point.

The citation was decoration.

**Fix — statutory benchmarks, computed in the app, not asked of the model.**
[src/lawcheck.ts](../src/lawcheck.ts) holds eight benchmarks. Each states what a
statute lays down *in general*, and a small deterministic test reads the contract's
own figure. Where the two diverge, they are put side by side and the tool stops:

> **§ 551 Abs. 1 BGB**
> *Was das Gesetz allgemein sagt* — Eine Mietsicherheit für Wohnraum darf das
> Dreifache der Monatsmiete ohne Betriebskosten nicht übersteigen.
> *Was in Ihrem Vertrag steht* — Ihr Vertrag: 5.800 € bei 1.450 € Nettokaltmiete —
> das 4,0-Fache.
> *Diese Gegenüberstellung ist eine Information, keine Rechtsberatung und keine
> Prüfung der Wirksamkeit. Ob eine Klausel in Ihrem Fall gilt, kann nur eine
> Rechtsberatung beurteilen — zum Beispiel Mieterverein, Verbraucherzentrale oder
> Anwaltskanzlei.*

The eight: § 551 Abs. 1 (deposit ceiling), § 551 Abs. 2 (right to three
instalments), § 573c Abs. 1 (tenant's notice period), § 555 (contractual penalty in
a residential tenancy), § 309 Nr. 7 (liability exclusion in standard terms), § 553
Abs. 1 (subletting), § 558 Abs. 3 (three-year cap on increases, incl. the 15 % rate
for strained markets such as Munich), and § 309 Nr. 9 (minimum term and notice in
subscriptions).

Why this is the right shape for criterion 4:

- **It is arithmetic, not opinion.** 5.800 / 1.450 = 4,0. Nothing here can
  hallucinate.
- **It stays inside the RDG.** Whether a clause holds is an assessment of an
  individual case — a Rechtsdienstleistung under § 2 Abs. 1 RDG. The tool never
  makes it. Where a statute is itself categorical (§ 555 BGB reads "ist unwirksam"),
  that is the law speaking in the *general rule* line, never SignWise speaking about
  the reader's clause. A test asserts that no benchmark ever writes "unwirksam",
  "nichtig", "void" or "unenforceable" into the *contract* line.
- **It answers the challenge's own wording** — "auf mögliche Konfliktpunkte
  hinweisen" — without doing the "vollständige rechtliche Prüfung" it excludes.
- **Statutes are amtliche Werke (§ 5 UrhG)** and free of copyright, so the rules
  paraphrase official text closely and link to the official source. This is also the
  one content source in the app with no copyright question attached — relevant given
  Radtke's § 44b UrhG / Nutzungsvorbehalt discussion.

Precision was chosen over recall throughout: a benchmark that fires on a clause it
does not fit is a *wrong legal statement*, which is worse than silence. Result on
the trap contract: **7 of 8 fire, all correct, no false positives.** On both shipped
example contracts: **zero hits** — and the screen says so explicitly, naming how many
benchmarks were checked, rather than hiding the feature when a contract is clean.

Tests: [test/lawcheck.test.ts](../test/lawcheck.test.ts) — nine cases, each with the
positive *and* the negative (a 4.000 € deposit is silent; a three-month notice period
is silent; a contract that already offers instalments is silent).

Bug found by the tests, not by reading: the money parser took the first number in the
string, so `"§ 5 Kaution. … 5.800,00 EUR"` yielded **5**, and the deposit ceiling was
being compared against the section number. It only worked on the live run because the
amount happened to be available from the structured `money` block as well. A money
amount now has to carry a currency marker.

### Finding 4 — The contract's personal data went to the model host in full
*Severity: high. Art. 5 Abs. 1 lit. c DSGVO.*

The app extracts PDF text in the browser — a real privacy property, and the reason
the 1.3 MB pdf.js worker earns its place. But the extracted text was then posted
verbatim. On the user's own test tenancy that meant **the landlord's IBAN and three
street addresses** went to Azure OpenAI to answer a question that needed none of
them. `/api/ask` and `/api/translate` sent the whole analysis, quotes included, so
they leaked the same data through two more doors.

**Fix — pseudonymise in the browser, restore in the browser.**
[src/redact.ts](../src/redact.ts) replaces IBAN, BIC, e-mail, phone, tax number and
street address with stable placeholders before the request, and puts the originals
back into the response on the way in. The model host never receives the values. This
is the reasoning the EuGH set out in C-413/23 P (EDSB/SRB): data the recipient cannot
re-identify is not personal data *for that recipient*.

Verified on the user's real contract, counts only, contents never printed:

```
redacted: {"ADRESSE":3,"IBAN":1}
round-trips exactly: true
IBAN still present after redaction: false
§ markers preserved:  32 -> 32
EUR amounts preserved: 7 -> 7
```

The restore runs on the raw JSON before parsing, because a placeholder can land in
any string the model wrote — including the verbatim quotes that then get checked
against the original document. Values are JSON-escaped on the way back so a quote
character in an address cannot corrupt the response.

Names are deliberately **not** redacted: recognising them needs a model, and getting
it wrong either leaves them in anyway or destroys a clause the analysis depends on.
Scanned uploads have no text layer and go as pixels, which cannot be filtered at all
— the notice says so rather than implying a protection that is not there.

Bug found by testing: the address pattern's house-number suffix `\d{1,4}\s*[a-z]?`
swallowed the first letter of the following word, so "Ismaninger Straße 61 **o**ben"
produced a different captured value than the same address elsewhere and got a second
placeholder. The suffix must be attached without a space.

### Finding 5 — No Art. 13 DSGVO notice, no RDG boundary, no KI-VO marking
*Severity: medium-high for criterion 4; the app had one sentence where three
statutory duties sit.*

The whole legal surface was: *"Ihr Dokument wird verwendet, um diese Analyse zu
erstellen"* plus *"ersetzt keine Rechtsberatung"*.

**Fix — a "Rechtliches & Datenschutz" notice reachable from every screen**
([src/components/LegalNotice.tsx](../src/components/LegalNotice.tsx)), in German and
English, covering the three questions a lawyer on the jury will ask:

1. **What SignWise is and is not** — that assessing an individual case is a
   Rechtsdienstleistung under § 2 Abs. 1 RDG which this tool does not provide, where
   the limit becomes visible in the product (the benchmark section), and that every
   claim is traceable to a verified quote and a verified citation.
2. **What happens to the document (Art. 13 DSGVO)** — purpose, that the file itself
   never leaves the browser, the minimisation from #4, recipient and location
   (Microsoft Azure OpenAI Service, **region Sweden Central, EU** — verified against
   the live resource, so no Art. 44 ff. third-country transfer is part of this
   design), retention (none — nothing is stored), and the data-subject rights.
3. **Machine-generated content (Art. 50 KI-VO)** — that the explanations come from a
   language model, can be wrong where they read confidently, and that the verbatim
   contract wording sits beside every one of them for exactly that reason.

### Finding 6 — Prompt hardening the trap contract earned
Two rules added to [api/_model.ts](../api/_model.ts), both traceable to something
observed rather than imagined:

- *"Cite the provision that is actually on point for THIS clause. A penalty clause in
  a residential tenancy is § 555 BGB, not § 546 BGB."* — from the miss in finding 3.
- *"Whenever you add a legalRef, `legal` must state in one sentence what that
  provision actually says as a general rule. A citation the reader cannot read
  anything into is decoration."* — with the boundary restated: the general rule, not
  whether this clause complies.

Both held on the re-run: the penalty clause now cites § 555 BGB alongside § 546 and
§ 546a, and states what each contains.

### Finding 7 — The same figure on two commitment cards
*Severity: medium. Found by using the deployed build as an end user, not by reading
code.*

On the "Vor der Unterschrift" screen the trap contract showed **1.780 €** twice:
once as *"Monatliche Zahlung — Sie zahlen 1.450 € Kaltmiete sowie 330 €
Vorauszahlungen"* (the model's card, with the real breakdown) and once as *"Jeden
Monat — Eine regelmäßige Zahlung laut Vertrag"* (the app's derived fallback, generic
filler). Two of the four headline commitments were the same fact, and one of them
said nothing.

The dedupe key was `clauseId + title`, and the title is precisely what differs
between a model-written card and a derived one. **Fix:** the figure decides —
across the two sources only, never inside the model's own list, where two cards may
legitimately share a value ("3 Monate" for a notice period and a probation).

Compared by the *figures* a value contains, not the string: the model writes
"1.780,00 EUR" and the derived card "1.780 €". Only the client-side currency styling
ever made those two look alike, which meant the first version of this fix worked in
the browser and silently did nothing anywhere else.

### Finding 8 — The model reported our own privacy measure as a document defect
*Severity: low-medium, found by probing the deployed API.*

First live run after the redaction shipped came back with the warning *"Adresse und
Bankverbindung sind durch Platzhalter ersetzt."* The model was reading `[ADRESSE-1]`
as something missing from the contract — a warning slot spent on the app's own data
minimisation, and a plausible route to a lowered confidence rating on every contract
that contains an address.

**Fix:** one prompt rule stating that placeholders are expected and correct, that
they stand for the value they replace, that they must be kept verbatim in quotes,
and that they are not a defect. Verified against the deployed host: the warning is
gone, and the remaining warnings are genuine observations about the probe text.

---

## 4. Looked at, deliberately not changed

- **No case law, anywhere.** The Kleinreparaturen and Schönheitsreparaturen clauses
  in the trap contract are the two most notorious traps in German tenancy law, and
  both are governed by BGH case law rather than a statutory number. A benchmark for
  them would mean citing decisions this app cannot verify — precisely the blind
  citation the reference repository's own discipline forbids. They are still
  surfaced as clauses and rated; they just get no statutory benchmark. Adding them
  properly needs a verifiable case-law source, not a better prompt.
- **No "unwirksam" labels, and no AGB-DE-style void-clause classifier.** It would
  score well on novelty and lose criterion 4 outright: it is the Wirksamkeitsprüfung
  the challenge excludes and the Einzelfallprüfung the RDG reserves.
- **No German legal BERT / LexNLP / Blackstone.** A second inference stack to do
  worse what the hosted model already does on contract prose.
- **No name redaction.** Needs NER; a wrong redaction of a party breaks the analysis
  more than it protects. Documented in the notice rather than half-done.
- **The demo contracts stay clean.** Neither shipped example triggers a benchmark,
  and the honest result — "keine Abweichung gefunden", with the number of benchmarks
  checked named — is shown rather than the section being hidden. Rewriting a demo
  contract to manufacture a warning would be demo-ware.

---

## 5. Still worth doing

- **Name a real controller.** The Art. 13 notice identifies the project team; a
  production deployment needs a named controller and a contact address.
- **Rotate the Azure OpenAI key** — outstanding from an earlier session.
- **Deposit instalments as a schema concept**, so the 12-month chart stops putting a
  whole deposit in month one. Carried over from the previous pass.
- **§ 309 Nr. 9 has no test contract.** The subscription benchmark is covered by unit
  tests but has never run against a real mobile or gym contract.
- **Two commitment cards can still overlap in prose** without sharing a figure
  ("Bindung und Kündigung" beside "Laufzeit"). Closing that needs a similarity
  measure on sentences, which risks dropping genuinely distinct cards; the figures
  are no longer duplicated, which was the visible bug.

---

## 6. Verified

- `npm test` — **75 pass, 0 fail** (`tsc -b` clean). 25 of those tests are new.
- The trap contract, end to end through the live model in the browser: 7 benchmark
  cards, 4 distinct commitment figures, the depth picker adding at every step, and
  both § 551 benchmarks inside the clause panel.
- The clean example contract: "✓ Keine Abweichung gefunden", naming all 7 benchmarks
  as checked.
- The deployed bundle (`index-zVr_S2Gt.js`) matches the local build.
- `/__qa_traps.pdf` and `/__qa_test.pdf` both return the 584-byte SPA fallback as
  `text/html` — no test document is published. (Checking the status code alone would
  have been meaningless: the SPA fallback answers 200 for everything.)
- A live `POST /api/analyze` through the deployed host with placeholders in the text:
  HTTP 200, placeholders returned intact, so the browser-side restore has something
  to substitute.
- No console errors on the deployed site.
