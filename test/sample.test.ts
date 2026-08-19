import { test } from "node:test";
import assert from "node:assert/strict";
import { AnalysisSchema } from "../src/types.ts";
import { sampleAnalysis, SAMPLE_DOC_TEXT } from "../src/sample.ts";
import { verifyQuote } from "../src/verify.ts";

// The one check that fails if the data contract or the verification logic breaks.
for (const lang of ["de", "en"] as const) {
  test(`sample analysis (${lang}) satisfies the schema`, () => {
    assert.doesNotThrow(() => AnalysisSchema.parse(sampleAnalysis(lang)));
  });
}

test("every clause quote appears verbatim in the sample document", () => {
  const a = sampleAnalysis("de");
  for (const c of a.clauses) {
    assert.ok(verifyQuote(SAMPLE_DOC_TEXT, c.quote), `quote not found in document: ${c.id}`);
  }
});

test("every finding, right and duty points at a real clause", () => {
  const a = sampleAnalysis("de");
  const ids = new Set(a.clauses.map((c) => c.id));
  for (const id of a.findings) assert.ok(ids.has(id), `finding ${id} has no clause`);
  for (const r of a.rights) assert.ok(ids.has(r.clauseId), `right ${r.clauseId} has no clause`);
  for (const d of a.duties) assert.ok(ids.has(d.clauseId), `duty ${d.clauseId} has no clause`);
});
