import { test } from "node:test";
import assert from "node:assert/strict";
import { depthText, facts } from "../src/depth";
import { DEPTHS } from "../src/types";
import { sampleAnalysis, employmentAnalysis } from "../src/sample";

// The property that matters to the reader: asking for more detail never takes
// information away. Measured on a real contract before this existed, 6 of 15
// clauses lost a fact or a qualifier going from "standard" to "detailed".
test("more detail never drops a figure — every fixture clause, both languages", () => {
  for (const analysis of [sampleAnalysis("de"), sampleAnalysis("en"), employmentAnalysis("de"), employmentAnalysis("en")]) {
    for (const clause of analysis.clauses) {
      const rendered = DEPTHS.map((d) => facts(depthText(clause.simple, d)));
      for (let i = 1; i < rendered.length; i++) {
        for (const fact of rendered[i - 1]) {
          assert.ok(
            rendered[i].has(fact),
            `${analysis.lang}/${clause.id}: "${fact}" is in ${DEPTHS[i - 1]} but gone from ${DEPTHS[i]}`,
          );
        }
      }
    }
  }
});

test("increments compose upward", () => {
  const set = {
    simple: "Sie zahlen 5.800 € Kaution.",
    standard: "Das Geld muss fünf Werktage vor der Schlüsselübergabe eingehen.",
    detailed: "Ohne vollständigen Eingang sieht der Vertrag keinen Anspruch auf die Schlüssel vor.",
  };
  assert.equal(depthText(set, "simple"), set.simple);
  assert.equal(depthText(set, "standard"), `${set.simple} ${set.standard}`);
  assert.equal(depthText(set, "detailed"), `${set.simple} ${set.standard} ${set.detailed}`);
});

// A model that ignores the instruction and returns three self-contained rewrites
// still has to render — that is the whole reason the composition checks each part
// instead of blindly concatenating.
test("self-contained rewrites supersede instead of duplicating", () => {
  const legacy = {
    simple: "Sie zahlen 3.000 € Kaution.",
    standard: "Die Kaution beträgt 3.000 € und ist in drei Raten zahlbar.",
    detailed: "Die Kaution beträgt 3.000 €, zahlbar in drei Raten; der Vermieter legt sie verzinst an.",
  };
  assert.equal(depthText(legacy, "standard"), legacy.standard);
  assert.equal(depthText(legacy, "detailed"), legacy.detailed);
});

test("an empty level is skipped, not rendered as a gap", () => {
  const set = { simple: "Sie zahlen 1.240 € Miete.", standard: "", detailed: "Nebenkosten kommen dazu." };
  assert.equal(depthText(set, "standard"), "Sie zahlen 1.240 € Miete.");
  assert.equal(depthText(set, "detailed"), "Sie zahlen 1.240 € Miete. Nebenkosten kommen dazu.");
});

test("German articles are not read as the number one", () => {
  // "eine Seite" must not count as the figure 1, or a level that mentions a 1
  // looks like a restatement and replaces the level holding the real figures.
  assert.ok(!facts("bis eine Seite kündigt").has("1"));
  assert.ok(facts("in 1 Monat").has("1"));
  assert.ok(facts("in drei Raten").has("3"));
  assert.deepEqual([...facts("3.000,00 EUR")], ["3000"]);
});

// The bug that made every figure comparison in English wrong: "," was read as a
// decimal point everywhere, so "€3,000" was the figure 3 and "€1,240" was 1.24.
test("a figure means the same thing in German and in English notation", () => {
  const same: [string, string][] = [
    ["1.240,00 EUR", "€1,240"],
    ["3.000 €", "€3,000"],
    ["42.480 €", "€42,480"],
    ["1.190,40 €", "€1,190.40"],
  ];
  for (const [de, en] of same) {
    assert.deepEqual([...facts(de)], [...facts(en)], `${de} vs ${en}`);
  }
  assert.deepEqual([...facts("8,5 %")], ["8.5"], "a real decimal is still a decimal");
});

// A date was being stripped of its dots and read as one seven-digit figure, so a
// contract's start date matched nothing and counted as a fact of its own.
test("a date is read as its parts, not as one huge number", () => {
  assert.deepEqual([...facts("01.11.2026")].sort(), ["1", "11", "2026"]);
  assert.deepEqual([...facts("30.04.2027")].sort(), ["2027", "30", "4"]);
  // and the German and English spellings of one date agree on the parts they share
  const de = facts("Der Vertrag beginnt am 01.11.2026.");
  for (const f of facts("The contract starts on 1 November 2026.")) assert.ok(de.has(f), `EN fact ${f} missing from DE`);
});

test("ordinals carry their figure — a notice clause is nothing but ordinals", () => {
  assert.ok(facts("bis zum dritten Werktag").has("3"));
  assert.ok(facts("zum Ablauf des zweiten Monats").has("2"));
  assert.ok(facts("by the third working day").has("3"));
});

// The levels are complete explanations now, so the composition step exists only to
// repair a level that dropped something — including every analysis cached from when
// the levels were written as increments.
test("a level that already says everything is shown on its own", () => {
  const set = {
    simple: "Sie zahlen 1.240 € Miete.",
    standard: "Sie zahlen 1.240 € Miete, spätestens am 3. Werktag.",
    detailed: "Sie zahlen 1.240 € Miete, spätestens am 3. Werktag, und tragen die Gebühren.",
  };
  assert.equal(depthText(set, "detailed"), set.detailed, "no repair should be applied");
  assert.equal(depthText(set, "standard"), set.standard);
});

test("a level written as an increment is repaired, not shown alone", () => {
  const set = {
    simple: "Sie zahlen 1.240 € Miete.",
    standard: "Das Geld muss spätestens am 3. Werktag da sein.",
    detailed: "Die Nebenkosten kommen mit 210 € obendrauf.",
  };
  const out = depthText(set, "detailed");
  for (const f of ["1240", "3", "210"]) assert.ok(facts(out).has(f), `lost ${f}: ${out}`);
  assert.ok(out.startsWith("Sie zahlen 1.240 € Miete."), out);
});

test("a level that drops a figure gets it back from the level below", () => {
  const set = {
    simple: "Die Kaution beträgt 3.000 €.",
    standard: "Die Kaution beträgt 3.000 €, zahlbar in drei Raten.",
    detailed: "Sie ist getrennt anzulegen und nach dem Auszug zurückzuzahlen.",
  };
  const out = depthText(set, "detailed");
  assert.ok(facts(out).has("3000"), out);
  assert.ok(out.includes("getrennt anzulegen"), out);
});

test("the last part keeps its own punctuation", () => {
  const out = depthText({ simple: "Sie zahlen 1.240 €.", standard: "Und wann genau?", detailed: "" }, "standard");
  assert.ok(out.endsWith("?"), out);
});
