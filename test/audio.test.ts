import { test } from "node:test";
import assert from "node:assert/strict";
import { audioBriefingTurns } from "../src/audio";
import { sampleAnalysis } from "../src/sample";
import type { Analysis } from "../src/types";

test("the briefing only ever speaks text the reader can already see", () => {
  const a = sampleAnalysis("de");
  const spoken = audioBriefingTurns(a, "de").map((t) => t.text).join("\n");
  // Every clause line must be one of the analysis's own titles + means, never a
  // fresh sentence about the contract. This is the whole RDG argument for the
  // feature: it reads the explanation aloud, it does not make a second one.
  for (const turn of audioBriefingTurns(a, "de")) {
    if (turn.speaker !== "guide") continue;
    const owned = a.clauses.some((c) => turn.text.startsWith(c.title) || turn.text === c.means);
    const closing = turn.text.startsWith("Prüfen Sie");
    assert.ok(owned || closing, `unowned line: ${turn.text.slice(0, 60)}`);
  }
  assert.ok(!spoken.includes(a.clauses[0].quote), "the original contract wording is never sent");
});

test("the script stays inside the dialogue budget", () => {
  for (const lang of ["de", "en"] as const) {
    const turns = audioBriefingTurns(sampleAnalysis(lang), lang);
    const chars = turns.reduce((n, t) => n + t.text.length, 0);
    assert.ok(chars <= 1_800, `${lang} script is ${chars} chars`);
    assert.ok(turns.length >= 2, `${lang} briefing collapsed to ${turns.length} turn(s)`);
    assert.equal(turns[0].speaker, "host");
  }
});

test("a finding pointing at a clause that is not there is skipped, not spoken as a hole", () => {
  const a = sampleAnalysis("en");
  const broken: Analysis = { ...a, findings: ["does-not-exist", ...a.findings.slice(0, 2)] };
  const turns = audioBriefingTurns(broken, "en");
  assert.ok(turns.every((t) => t.text.trim().length > 0));
  assert.ok(turns.length >= 2);
});
