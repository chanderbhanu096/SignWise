import { test } from "node:test";
import assert from "node:assert/strict";
import { AnalysisSchema } from "../src/types.ts";
import { sampleAnalysis, employmentAnalysis, SAMPLE_DOC_TEXT } from "../src/sample.ts";
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

test("sample reminders and calculated dates never masquerade as quoted deadlines", () => {
  for (const lang of ["de", "en"] as const) {
    const rental = sampleAnalysis(lang);
    const reminder = rental.dates.find((date) => date.iso === "2027-06-30")!;
    assert.match(reminder.title, /Erinnerung|reminder/i);
    assert.match(reminder.body, /kein vertraglicher oder gesetzlicher Stichtag|not a contractual or statutory deadline/i);
    assert.doesNotMatch(reminder.body, /Ein Tag zu spät|One day late/);
    assert.match(rental.clauses.find((clause) => clause.id === "notice")!.means, /nicht der letzte Kündigungstag|not the final notice deadline/);
    assert.match(rental.dates.find((date) => date.iso === "2027-09-30")!.title, /Beispiel|Example/);
    const probation = employmentAnalysis(lang).dates.find((date) => date.iso === "2027-04-30")!;
    assert.match(probation.title, /berechnet|calculated/);
    assert.match(probation.body, /nicht ausdrücklich im Vertrag|not printed in the contract/);
  }
});
