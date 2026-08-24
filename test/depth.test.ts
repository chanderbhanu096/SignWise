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
