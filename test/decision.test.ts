import { test } from "node:test";
import assert from "node:assert/strict";
import type { Analysis } from "../src/types.ts";
import { AnalysisSchema } from "../src/types.ts";
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
    assert.ok(b.understandingQuestions.length >= 3 && b.understandingQuestions.length <= 5);
    for (const q of b.understandingQuestions) assert.ok(ids.has(q.clauseId), `understanding -> ${q.clauseId}`);
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
  assert.ok(b.understandingQuestions.length >= 3 && b.understandingQuestions.length <= 5);
  const ids = clauseIds(withoutBrief as Analysis);
  for (const r of b.reviewItems) assert.ok(ids.has(r.clauseId));
});

test("deriver only asks clarification questions the contract justifies", () => {
  // Utilities are explicitly mentioned but unquantified, and the section that says
  // so is § 5 — the clause the question has to point at, not § 4 Miete, which only
  // mentions them in passing. The fixture's synthetic null admin-fee row has no
  // source clause at all, so it must not imply that a fee exists.
  const { decisionSummary, ...rental } = sampleAnalysis("de");
  void decisionSummary;
  const b = getDecisionSummary(rental as Analysis);
  assert.equal(b.clarificationQuestions.length, 1);
  assert.equal(b.clarificationQuestions[0].clauseId, "utilities");
  assert.doesNotMatch(JSON.stringify(b.clarificationQuestions), /Bearbeitungsgebühr/i);
});

test("derived commitments use exact source clauses", () => {
  const { decisionSummary: rentalBrief, ...rental } = sampleAnalysis("en");
  const { decisionSummary: employmentBrief, ...employment } = employmentAnalysis("en");
  void rentalBrief;
  void employmentBrief;

  const rentalDerived = getDecisionSummary(rental as Analysis);
  assert.equal(rentalDerived.commitments.find((c) => c.title === "Deposit")?.clauseId, "deposit");
  assert.equal(rentalDerived.commitments.find((c) => c.title === "Notice period")?.clauseId, "notice");

  const employmentDerived = getDecisionSummary(employment as Analysis);
  assert.equal(employmentDerived.commitments.find((c) => c.title === "Holiday pay")?.clauseId, "holiday");
  assert.equal(employmentDerived.commitments.find((c) => c.title === "Duration")?.clauseId, "duration");
  assert.equal(employmentDerived.clarificationQuestions[0]?.clauseId, "overtime");
});

test("model review order is preserved while output counts are capped and deduplicated", () => {
  const analysis = sampleAnalysis("en");
  const original = analysis.decisionSummary!;
  analysis.decisionSummary = {
    commitments: [...original.commitments, ...original.commitments],
    reviewItems: [...original.reviewItems].reverse(),
    understandingQuestions: [
      ...original.understandingQuestions!,
      original.understandingQuestions![0],
    ],
    clarificationQuestions: [
      ...original.clarificationQuestions,
      ...original.clarificationQuestions,
    ],
  };

  const brief = getDecisionSummary(analysis);
  // The model gave two review items; the third is the deriver filling the slot,
  // and it picks the highest-scoring clause the model left out — § 5, a recurring
  // cost the contract never puts a number on.
  assert.deepEqual(brief.reviewItems.map((item) => item.clauseId), ["increase", "repairs", "utilities"]);
  assert.equal(brief.commitments.length, 4);
  assert.equal(brief.understandingQuestions.length, 5);
  assert.equal(brief.clarificationQuestions.length, 2);
});

test("derived review list is not padded with routine standard clauses", () => {
  const analysis = sampleAnalysis("en");
  delete analysis.decisionSummary;
  analysis.clauses = analysis.clauses.map((clause) => ({ ...clause, level: "standard", tags: [] }));
  const brief = getDecisionSummary(analysis);
  assert.equal(brief.reviewItems.length, 0);
});

test("yearly-only insurance premiums remain visible without rental or salary wording", () => {
  const base = sampleAnalysis("en");
  const premium = {
    ...base.clauses[0],
    id: "premium",
    title: "Annual insurance premium",
    quote: "The annual premium is EUR 1,200.",
    means: "You pay the stated premium once per year.",
    tags: ["money"] as const,
    level: "important" as const,
  };
  const insurance = {
    ...base,
    contractType: "Insurance policy",
    clauses: [premium],
    findings: ["premium"],
    rights: [],
    duties: [],
    glance: [],
    money: {
      monthly: null,
      yearly: 1200,
      yearlyClauseId: "premium",
      oneTime: [],
      variable: [],
      currency: "EUR",
      direction: "outgoing" as const,
    },
    decisionSummary: undefined,
  } as Analysis;

  const brief = getDecisionSummary(insurance);
  assert.equal(brief.commitments[0].value, "€1,200");
  assert.equal(brief.commitments[0].clauseId, "premium");
  assert.doesNotMatch(JSON.stringify(brief.commitments), /rent|salary/i);
});

test("repairable model brief issues do not reject the analysis and never reach the UI", () => {
  const broken = structuredClone(sampleAnalysis("en"));
  broken.decisionSummary!.commitments[0].clauseId = "missing-clause";
  assert.equal(AnalysisSchema.safeParse(broken).success, true);
  const repaired = getDecisionSummary(broken);
  assert.ok(repaired.commitments.length > 0);
  assert.ok(repaired.commitments.every((item) => clauseIds(broken).has(item.clauseId)));

  const oversized = structuredClone(sampleAnalysis("en"));
  oversized.decisionSummary!.reviewItems = [
    ...oversized.decisionSummary!.reviewItems,
    oversized.decisionSummary!.reviewItems[0],
    oversized.decisionSummary!.reviewItems[1],
  ];
  assert.equal(AnalysisSchema.safeParse(oversized).success, true);
  assert.equal(getDecisionSummary(oversized).reviewItems.length, 3);
});

test("schema rejects duplicate clause ids because source links would be ambiguous", () => {
  const analysis = structuredClone(sampleAnalysis("en"));
  analysis.clauses[1].id = analysis.clauses[0].id;
  assert.equal(AnalysisSchema.safeParse(analysis).success, false);
});

test("the same commitment is not shown twice under two wordings", () => {
  // The shape that produced two "Kaution" cards on screen: the model's card and the
  // derived one differ only in explanation, so any score-based key keeps both.
  const base = sampleAnalysis("de");
  const deposit = base.clauses.find((c) => /kaution/i.test(c.title))!;
  // The model's own deposit card. The derived brief always produces one too, on the
  // same clause, worded differently — which is how two "Kaution" cards reached the
  // screen. Only the model's wording should survive.
  const withDup: Analysis = {
    ...base,
    decisionSummary: {
      commitments: [
        { title: "Kaution", value: "3.000 €", explanation: "Sie dürfen sie in drei gleichen Monatsraten leisten.", clauseId: deposit.id },
      ],
      reviewItems: [],
      understandingQuestions: [],
      clarificationQuestions: [],
    },
  };
  const kautionen = getDecisionSummary(withDup).commitments.filter((c) => c.title === "Kaution");
  assert.equal(kautionen.length, 1);
  assert.match(kautionen[0].explanation, /Monatsraten/);
});

test("a derived commitment repeating a figure the model already showed is dropped", () => {
  // Observed live: "1.780 € / Monatliche Zahlung / Sie zahlen 1.450 € Kaltmiete
  // sowie 330 € Vorauszahlungen" sat next to "1.780 € / Jeden Monat / Eine
  // regelmäßige Zahlung laut Vertrag." Same figure, different title, so the
  // title-based key kept both.
  const base = sampleAnalysis("de");
  const rent = base.clauses[0];
  const analysis: Analysis = {
    ...base,
    money: { ...base.money, monthly: 1780, monthlyClauseId: rent.id },
    decisionSummary: {
      commitments: [
        {
          title: "Monatliche Zahlung",
          value: "1.780 €",
          explanation: "Sie zahlen 1.450 € Kaltmiete sowie 330 € Vorauszahlungen.",
          clauseId: rent.id,
        },
      ],
      reviewItems: [],
      clarificationQuestions: [],
    },
  };
  const shown = getDecisionSummary(analysis).commitments.filter((c) => (c.value ?? "").includes("1.780"));
  assert.equal(shown.length, 1, "the same figure must not appear on two cards");
  assert.equal(shown[0].title, "Monatliche Zahlung");
});

// The same contract must present the same commitments in the same order whichever
// language the reader is using. It did not: commitmentPriority scores the localized
// text, and the German plural noun "Monate" matched the pattern meant to catch
// "monatlich", so a three-month notice period was ranked as a monthly payment.
test("commitment cards are in the same order in German and in English", () => {
  for (const build of [sampleAnalysis, employmentAnalysis]) {
    const de = getDecisionSummary(build("de"));
    const en = getDecisionSummary(build("en"));
    assert.equal(de.commitments.length, en.commitments.length, "different number of cards");
    assert.deepEqual(
      de.commitments.map((c) => c.clauseId),
      en.commitments.map((c) => c.clauseId),
      "card order differs between languages",
    );
  }
});
