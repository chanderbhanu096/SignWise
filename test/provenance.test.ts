import { test } from "node:test";
import assert from "node:assert/strict";
import { figureSources } from "../src/provenance";
import { depthText, facts } from "../src/depth";
import { sampleAnalysis, employmentAnalysis } from "../src/sample";
import type { Analysis } from "../src/types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FigureSources } from "../src/components/FigureSources";

const find = (a: Analysis, id: string) => a.clauses.find((c) => c.id === id)!;
const trace = (a: Analysis, id: string) => {
  const c = find(a, id);
  return figureSources(a, c, depthText(c.simple, "detailed"));
};

test("a figure the clause states is reported as its own", () => {
  const a = sampleAnalysis("de");
  const hit = trace(a, "repairs").find((f) => f.parts[0] === "150");
  assert.equal(hit?.kind, "clause");
  assert.match(hit!.ref!, /§ 13/);
});

test("a figure borrowed from another clause names that clause", () => {
  const a = sampleAnalysis("de");
  const hit = trace(a, "notice").find((f) => f.parts[0] === "1240");
  assert.equal(hit?.kind, "other", JSON.stringify(hit));
  assert.match(hit!.ref!, /§ 4/);
});

// The reason this module exists: "rund 1.190 €" reads like something the contract
// says. It is not in the contract at all — it is 8 % of the annual rent from § 4.
test("a figure that is not in the contract is shown with its arithmetic", () => {
  for (const lang of ["de", "en"]) {
    const hit = trace(sampleAnalysis(lang), "repairs").find((f) => f.parts[0] === "1190");
    assert.equal(hit?.kind, "derived", `${lang}: ${JSON.stringify(hit)}`);
    assert.match(hit!.expr!, /8\s*%/);
    assert.match(hit!.ref!, /§ 4/);
  }
});

test("an annual total is derived as the monthly figure plus the extra payment", () => {
  const hit = trace(employmentAnalysis("de"), "holiday").find((f) => f.parts[0] === "42480");
  assert.equal(hit?.kind, "derived", JSON.stringify(hit));
  assert.match(hit!.expr!, /12 × 3\.440 \+ 1\.200/);
});

// The first version of the search "explained" 20 days of statutory holiday as 1 %
// of 2,026 — the year out of the start date of a different clause.
test("statutory figures are reported as not in the contract, not invented into one", () => {
  const hit = trace(employmentAnalysis("de"), "vacation").find((f) => f.parts[0] === "20");
  assert.equal(hit?.kind, "context", JSON.stringify(hit));
});

test("section and paragraph numbers are addresses, never figures", () => {
  const a = employmentAnalysis("de");
  const c = find(a, "notice");
  const keys = figureSources(a, c, "Das ist die Grundfrist nach § 622 Abs. 1 BGB, Seite 2.").map((f) => f.key);
  assert.deepEqual(keys, [], `traced ${keys.join(", ")}`);
});

test("nothing is ever claimed to be in a clause that is not", () => {
  for (const a of [sampleAnalysis("de"), sampleAnalysis("en"), employmentAnalysis("de"), employmentAnalysis("en")]) {
    for (const c of a.clauses) {
      const own = facts(c.quote);
      for (const f of figureSources(a, c, depthText(c.simple, "detailed"))) {
        if (f.kind === "clause")
          for (const part of f.parts) assert.ok(own.has(part), `${c.id}: claims ${f.shown} is in the clause`);
        if (f.kind === "derived") assert.ok(f.expr && f.ref, `${c.id}: derived without its working`);
      }
    }
  }
});

// Every figure in every demo explanation is accounted for. This is the check that
// answers "the numbers do not match the contract": nothing is left untraced.
test("every figure in every demo explanation is traced", () => {
  for (const a of [sampleAnalysis("de"), sampleAnalysis("en"), employmentAnalysis("de"), employmentAnalysis("en")]) {
    for (const c of a.clauses) {
      for (const f of figureSources(a, c, depthText(c.simple, "detailed"))) {
        assert.ok(["clause", "other", "derived", "context"].includes(f.kind), `${c.id}: ${f.shown} untraced`);
      }
    }
  }
});

// Without units every 3 satisfied every other 3: a notice period of "drei Monaten"
// matched the "dritten Werktag" in the very clause it was explaining, and the app
// reported it as quoted from a contract that says nothing of the kind.
test("a figure has to match in its unit, not just its digits", () => {
  const a = sampleAnalysis("de");
  const hit = trace(a, "notice").find((f) => f.parts[0] === "3");
  assert.equal(hit?.kind, "context", `§ 9 says "dritten Werktag", not three months: ${JSON.stringify(hit)}`);
  // and the same clause's 15 months really is stated, so units must not break matching
  const real = trace(a, "increase").find((f) => f.parts[0] === "15");
  assert.equal(real?.kind, "clause", JSON.stringify(real));
});

// "1. November 2026" scanned as a plain number is the figure 1, and 1 turns up in
// any clause containing "die ersten sechs Monate".
test("a written date is read as a date in both languages", () => {
  for (const [lang, id] of [["de", "1. November 2026"], ["en", "1 November 2026"]] as const) {
    const hit = trace(employmentAnalysis(lang), "probation").find((f) => f.shown === id);
    assert.equal(hit?.kind, "other", `${lang}: ${JSON.stringify(hit)}`);
    assert.match(hit!.ref!, /§ 1/);
    assert.deepEqual(hit!.parts.slice().sort(), ["1", "11", "2026"]);
  }
});

// Counts are small and plentiful, so arithmetic finds an explanation for any of
// them — eight extra holiday days came out as "6 + 2" off an unrelated probation
// clause. Only amounts are worth deriving.
test("only amounts are derived, never counts", () => {
  for (const a of [sampleAnalysis("de"), sampleAnalysis("en"), employmentAnalysis("de"), employmentAnalysis("en")]) {
    for (const c of a.clauses) {
      for (const f of figureSources(a, c, depthText(c.simple, "detailed"))) {
        if (f.kind !== "derived") continue;
        assert.match(f.shown, /€|EUR|Euro/, `${c.id}: derived a non-amount "${f.shown}"`);
      }
    }
  }
});

// "zwölf Monatsgehältern" was matching as the figure "zwölf Monat".
test("a unit only counts as a whole word", () => {
  const a = employmentAnalysis("de");
  const c = a.clauses.find((x) => x.id === "holiday")!;
  const shown = figureSources(a, c, "Zusammen mit zwölf Monatsgehältern von 3.440 €.").map((f) => f.shown);
  assert.ok(!shown.some((x) => /zwölf/i.test(x)), `matched inside a longer word: ${shown.join(", ")}`);
});

// A live run listed "20.160 € — errechnet als 12 × 1.680" and then, underneath,
// "zwölf Monate — nicht wörtlich im Vertragstext": a warning about the twelve
// months the line above had just explained.
test("a figure that is only a term of a listed derivation is not also flagged", () => {
  const a = employmentAnalysis("de");
  const c = a.clauses.find((x) => x.id === "holiday")!;
  const out = figureSources(a, c, "Zusammen mit zwölf Monaten von 3.440 € ergibt das 42.480 € brutto.");
  const derived = out.find((f) => f.kind === "derived");
  assert.ok(derived, "expected the total to be derived");
  assert.match(derived!.expr!, /12 ×/);
  assert.ok(!out.some((f) => f.kind === "context" && f.parts[0] === "12"), JSON.stringify(out.map((f) => f.shown)));
});

// "Ruhezeit ist von 22:00 bis 6:00 Uhr" scanned as plain numbers gave three rows,
// one of them reading "00 — steht in dieser Klausel".
test("a clock time is one figure, not two", () => {
  const a = sampleAnalysis("de");
  const out = trace(a, "houserules");
  assert.deepEqual(out.map((f) => f.shown), ["22:00", "6:00"]);
  assert.ok(out.every((f) => f.kind === "clause"), JSON.stringify(out));
});

// The house number is a number in the text and nothing to do with the rent.
test("a street number is not traced as a figure", () => {
  for (const lang of ["de", "en"] as const) {
    const a = sampleAnalysis(lang);
    const out = trace(a, "premises");
    assert.ok(!out.some((f) => f.parts.includes("14")), `${lang}: ${JSON.stringify(out.map((f) => f.shown))}`);
    assert.ok(out.some((f) => f.parts.includes("3")), `${lang}: the room count should still be traced`);
  }
});

test("date provenance keeps the day, month and year together and in order", () => {
  const a = sampleAnalysis("en");
  const c = { ...a.clauses[0], quote: "Start: 11.01.2026. End: 30.11.2027." };
  a.clauses = [c];
  const out = figureSources(a, c, "1 November 2026, 11 January 2026, and 30 January 2027.");
  assert.deepEqual(out.map((f) => [f.shown, f.kind]), [
    ["1 November 2026", "context"],
    ["11 January 2026", "clause"],
    ["30 January 2027", "context"],
  ]);
});

test("ISO and month-first dates match only the same complete date", () => {
  const a = sampleAnalysis("en");
  const c = { ...a.clauses[0], quote: "Start: 2026-11-01." };
  a.clauses = [c];
  assert.equal(figureSources(a, c, "November 1, 2026")[0]?.kind, "clause");
  assert.equal(figureSources(a, c, "2026-01-11")[0]?.kind, "context");
});

test("a clock time cannot be verified from unrelated quantities", () => {
  const a = sampleAnalysis("en");
  const c = { ...a.clauses[0], quote: "There are 22 days and 0 fees. Access starts at 06:00." };
  a.clauses = [c];
  const out = figureSources(a, c, "From 22:00 to 6:00.");
  assert.deepEqual(out.map((f) => f.kind), ["context", "clause"]);
});

test("matching an unverified excerpt never claims independent document verification", () => {
  const a = sampleAnalysis("en");
  const c = { ...a.clauses[0], quote: "The monthly rent is 99,999 EUR.", verified: false };
  a.clauses = [c];
  const result = figureSources(a, c, "The monthly rent is 99,999 EUR.");
  assert.equal(result[0]?.sourceVerified, false);
  const shown = renderToStaticMarkup(createElement(FigureSources, { analysis: a, clause: c, text: c.quote, depth: "detailed" }));
  assert.match(shown, /not independently checked against your file/);
  assert.doesNotMatch(shown, /stated in this clause|Traced against the wording/);
});

test("cross-clause figure matches retain the supporting excerpt's verification status", () => {
  const a = sampleAnalysis("en");
  const source = a.clauses.find((clause) => clause.id === "rent")!;
  source.verified = false;
  const c = a.clauses.find((clause) => clause.id === "notice")!;
  assert.equal(figureSources(a, c, "A further €1,240 rent.")[0]?.sourceVerified, false);
});
