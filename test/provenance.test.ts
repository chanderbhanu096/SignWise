import { test } from "node:test";
import assert from "node:assert/strict";
import { figureSources } from "../src/provenance";
import { depthText, facts } from "../src/depth";
import { sampleAnalysis, employmentAnalysis } from "../src/sample";
import type { Analysis } from "../src/types";

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
