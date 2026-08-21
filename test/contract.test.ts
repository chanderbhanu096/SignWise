import { test } from "node:test";
import assert from "node:assert/strict";
import { AnalysisSchema } from "../src/types.ts";
import { sampleAnalysis, employmentAnalysis } from "../src/sample.ts";
import { getContractCategory, getContractSubtype, getOfficialLawUrl, getContractSuggestions } from "../src/contract.ts";

test("rental contract is framed as expense", () => {
  assert.equal(getContractCategory(sampleAnalysis("de")), "expense");
  assert.equal(getContractSubtype("Mietvertrag"), "rental");
});

test("employment contract is framed as income (salary is never a cost)", () => {
  assert.equal(getContractCategory(employmentAnalysis("de")), "income");
  assert.equal(getContractCategory(employmentAnalysis("en")), "income");
  assert.equal(getContractSubtype("Employment agreement"), "employment");
});

test("explicit money.direction wins over keyword detection", () => {
  assert.equal(getContractCategory({ contractType: "Mysterievertrag", money: { direction: "incoming" } as any }), "income");
  assert.equal(getContractCategory({ contractType: "Mysterievertrag", money: { direction: "outgoing" } as any }), "expense");
});

test("unknown contract type falls back to neutral", () => {
  assert.equal(getContractCategory({ contractType: "Geheimhaltungsvereinbarung", money: {} as any }), "neutral");
  assert.equal(getContractSubtype("Some unknown thing"), "generic");
});

test("suggested questions adapt to contract type", () => {
  assert.ok(getContractSuggestions("Arbeitsvertrag", "de").some((q) => /Gehalt/i.test(q)));
  assert.ok(getContractSuggestions("Mietvertrag", "de").some((q) => /Miete/i.test(q)));
  assert.ok(getContractSuggestions("Something odd", "en").length > 0); // generic fallback
});

test("law citations map to official gesetze-im-internet URLs; unknowns do not", () => {
  assert.equal(getOfficialLawUrl("BGB", "§ 622"), "https://www.gesetze-im-internet.de/bgb/__622.html");
  assert.equal(getOfficialLawUrl("BGB", "§ 535"), "https://www.gesetze-im-internet.de/bgb/__535.html");
  assert.equal(getOfficialLawUrl("BUrlG", "§ 3"), "https://www.gesetze-im-internet.de/burlg/__3.html");
  assert.equal(getOfficialLawUrl("§§ 305 ff.".includes("BGB") ? "BGB" : "BGB", "§§ 305 ff."), "https://www.gesetze-im-internet.de/bgb/__305.html");
  assert.equal(getOfficialLawUrl("MadeUpCode", "§ 1"), null); // not allow-listed → no link
  assert.equal(getOfficialLawUrl("BGB", undefined), null);
});

test("employment fixture (both languages) satisfies the schema and cites § 622 BGB", () => {
  for (const lang of ["de", "en"] as const) {
    const a = employmentAnalysis(lang);
    assert.doesNotThrow(() => AnalysisSchema.parse(a));
    const probation = a.clauses.find((c) => c.id === "probation")!;
    assert.ok(probation.legalRefs?.some((r) => getOfficialLawUrl(r.law, r.section) === "https://www.gesetze-im-internet.de/bgb/__622.html"));
    // Salary is income, not a one-time cost.
    assert.equal(a.money.direction, "incoming");
    assert.equal(a.money.monthly, 3440);
  }
});

test("rental fixture clauses carry mappable legal references", () => {
  const a = sampleAnalysis("de");
  const rent = a.clauses.find((c) => c.id === "rent")!;
  assert.ok(rent.legalRefs && rent.legalRefs.length > 0);
  assert.equal(getOfficialLawUrl(rent.legalRefs[0].law, rent.legalRefs[0].section), "https://www.gesetze-im-internet.de/bgb/__556b.html");
});
