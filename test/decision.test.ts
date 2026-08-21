import { test } from "node:test";
import assert from "node:assert/strict";
import type { Analysis } from "../src/types.ts";
import { sampleAnalysis, employmentAnalysis } from "../src/sample.ts";
import { getDecisionSummary } from "../src/decision.ts";

const clauseIds = (a: Analysis) => new Set(a.clauses.map((c) => c.id));

test("fixture briefs are present and every clauseId is real", () => {
  for (const a of [sampleAnalysis("de"), sampleAnalysis("en"), employmentAnalysis("de"), employmentAnalysis("en")]) {
    const b = getDecisionSummary(a);
    const ids = clauseIds(a);
    assert.ok(b.commitments.length >= 3);
    for (const c of b.commitments) assert.ok(ids.has(c.clauseId), `commitment -> ${c.clauseId}`);
    for (const r of b.reviewItems) assert.ok(ids.has(r.clauseId), `review -> ${r.clauseId}`);
    for (const q of b.clarificationQuestions) if (q.clauseId) assert.ok(ids.has(q.clauseId), `clarify -> ${q.clauseId}`);
  }
});

test("employment brief frames pay as income, never a cost", () => {
  const b = getDecisionSummary(employmentAnalysis("en"));
  const salary = b.commitments.find((c) => /3,?440|salary|gross/i.test(c.title + " " + (c.value ?? "") + " " + c.explanation));
  assert.ok(salary, "salary commitment present");
  assert.ok(!/cost/i.test(JSON.stringify(b.commitments)), "no 'cost' wording in employment commitments");
});

test("deriver runs when the model gives no brief, and caps review items at 3", () => {
  const { decisionSummary, ...withoutBrief } = employmentAnalysis("en");
  void decisionSummary;
  const b = getDecisionSummary(withoutBrief as Analysis);
  assert.ok(b.commitments.some((c) => c.value === "€3,440"));
  assert.ok(b.reviewItems.length <= 3);
  const ids = clauseIds(withoutBrief as Analysis);
  for (const r of b.reviewItems) assert.ok(ids.has(r.clauseId));
});

test("deriver only asks clarification questions the contract justifies", () => {
  // Rental: utilities (variable) + admin fee (null amount) are the only open items.
  const { decisionSummary, ...rental } = sampleAnalysis("de");
  void decisionSummary;
  const b = getDecisionSummary(rental as Analysis);
  assert.equal(b.clarificationQuestions.length, rental.money.variable.length + rental.money.oneTime.filter((o) => o.amount == null).length);
});
