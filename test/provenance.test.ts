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
  const hit = trace(a, "repairs").find((f) => f.key === "150");
  assert.equal(hit?.kind, "clause");
  assert.match(hit!.ref!, /§ 13/);
});

test("a figure borrowed from another clause names that clause", () => {
  const a = sampleAnalysis("de");
  const hit = trace(a, "notice").find((f) => f.key === "1240");
  assert.equal(hit?.kind, "other", JSON.stringify(hit));
  assert.match(hit!.ref!, /§ 4/);
});

// The reason this module exists: "rund 1.190 €" reads like something the contract
// says. It is not in the contract at all — it is 8 % of the annual rent from § 4.
test("a figure that is not in the contract is shown with its arithmetic", () => {
  for (const lang of ["de", "en"]) {
    const hit = trace(sampleAnalysis(lang), "repairs").find((f) => f.key === "1190");
    assert.equal(hit?.kind, "derived", `${lang}: ${JSON.stringify(hit)}`);
    assert.match(hit!.expr!, /8\s*%/);
    assert.match(hit!.ref!, /§ 4/);
  }
});

test("an annual total is derived as the monthly figure plus the extra payment", () => {
  const hit = trace(employmentAnalysis("de"), "holiday").find((f) => f.key === "42480");
  assert.equal(hit?.kind, "derived", JSON.stringify(hit));
  assert.match(hit!.expr!, /12 × 3\.440 \+ 1\.200/);
});

// The first version of the search "explained" 20 days of statutory holiday as 1 %
// of 2,026 — the year out of the start date of a different clause.
test("statutory figures are reported as not in the contract, not invented into one", () => {
  const hit = trace(employmentAnalysis("de"), "vacation").find((f) => f.key === "20");
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
        if (f.kind === "clause") assert.ok(own.has(f.key), `${c.id}: claims ${f.shown} is in the clause`);
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
