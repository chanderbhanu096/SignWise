import { test } from "node:test";
import assert from "node:assert/strict";
import { lawChecks, lawCheckScope } from "../src/lawcheck";
import { sampleAnalysis, employmentAnalysis } from "../src/sample";
import type { Analysis } from "../src/types";

// Built from the Munich test tenancy used for the QA pass: every figure below is
// from that document.
function rental(quotes: Record<string, string>): Analysis {
  const base = sampleAnalysis("de");
  return {
    ...base,
    contractType: "Wohnraummietvertrag",
    money: { ...base.money, oneTime: [] },
    clauses: Object.entries(quotes).map(([id, quote], i) => ({
      ...base.clauses[0],
      id,
      ref: `§ ${i + 1}`,
      quote,
    })),
    findings: [Object.keys(quotes)[0]],
  };
}

const RENT = "§ 3 Miete. Die monatliche Nettokaltmiete beträgt 1.450,00 EUR.";

test("a deposit above three months' net cold rent is put next to § 551 Abs. 1 BGB", () => {
  const hits = lawChecks(
    rental({ rent: RENT, dep: "§ 5 Kaution. Der Mieter leistet eine Mietsicherheit in Höhe von 5.800,00 EUR." }),
  );
  const hit = hits.find((h) => h.id === "kaution-hoehe");
  assert.ok(hit, "expected the deposit benchmark to fire");
  assert.equal(hit.cite, "§ 551 Abs. 1 BGB");
  assert.match(hit.contract, /5\.800/);
  assert.match(hit.contract, /4,0-Fache/);
});

test("a deposit within the statutory ceiling stays silent", () => {
  const hits = lawChecks(
    rental({ rent: RENT, dep: "§ 5 Kaution. Der Mieter leistet eine Mietsicherheit in Höhe von 4.000,00 EUR." }),
  );
  assert.equal(hits.filter((h) => h.id === "kaution-hoehe").length, 0);
});

test("the instalment right only fires when the contract rules instalments out", () => {
  const lump = rental({ rent: RENT, dep: "§ 5 Kaution. Die gesamte Kaution ist in einer Summe zu überweisen." });
  assert.ok(lawChecks(lump).some((h) => h.id === "kaution-raten"));
  const split = rental({ rent: RENT, dep: "§ 5 Kaution. Die Kaution kann in drei gleichen Teilbeträgen erbracht werden." });
  assert.equal(lawChecks(split).filter((h) => h.id === "kaution-raten").length, 0);
});

test("a contractual penalty in a residential tenancy is put next to § 555 BGB", () => {
  const hits = lawChecks(
    rental({ rent: RENT, ret: "§ 13 Rückgabe. Für jeden Tag verspäteter Rückgabe schuldet der Mieter eine Vertragsstrafe von 150,00 EUR." }),
  );
  const hit = hits.find((h) => h.id === "vertragsstrafe");
  assert.ok(hit);
  assert.match(hit.contract, /150/);
});

test("a tenant notice period longer than three months is flagged, three months is not", () => {
  const six = rental({ rent: RENT, k: "§ 2 Kündigung. Die Kündigungsfrist für den Mieter beträgt sechs Monate zum Monatsende." });
  assert.ok(lawChecks(six).some((h) => h.id === "kuendigungsfrist-mieter"));
  const three = rental({ rent: RENT, k: "§ 2 Kündigung. Die Kündigungsfrist für den Mieter beträgt drei Monate zum Monatsende." });
  assert.equal(lawChecks(three).filter((h) => h.id === "kuendigungsfrist-mieter").length, 0);
});

test("a yearly increase compounding past the three-year cap is flagged", () => {
  const hits = lawChecks(
    rental({ rent: RENT, inc: "§ 3 Die Vermieterin ist berechtigt, die Nettokaltmiete jeweils zum 1. Januar automatisch um 8 Prozent zu erhöhen." }),
  );
  const hit = hits.find((h) => h.id === "mieterhoehung-kappung");
  assert.ok(hit);
  assert.match(hit.contract, /26 %/);
});

// Precision matters more than recall here: a benchmark that fires on a clause it
// does not fit is a wrong legal statement, which is worse than saying nothing.
test("neither shipped example contract produces a hit", () => {
  assert.deepEqual(lawChecks(sampleAnalysis("de")), []);
  assert.deepEqual(lawChecks(employmentAnalysis("de")), []);
});

test("the scope count reports only the benchmarks that apply to the contract type", () => {
  const rentalScope = lawCheckScope(sampleAnalysis("de"));
  const empScope = lawCheckScope(employmentAnalysis("de"));
  assert.ok(rentalScope.checked > empScope.checked, "rental benchmarks must not be counted for an employment contract");
  assert.ok(empScope.checked > 0);
});

test("no benchmark ever calls a clause void, unfair or unenforceable about this contract", () => {
  // The rule text may quote a statute that itself says "unwirksam" — that is the
  // law speaking. What is forbidden is SignWise saying it about the user's clause.
  const hits = lawChecks(
    rental({
      rent: RENT,
      dep: "§ 5 Kaution. Der Mieter leistet eine Mietsicherheit in Höhe von 5.800,00 EUR in einer Summe.",
      h: "§ 11 Haftung. Die Vermieterin haftet nicht für Schäden, es sei denn, der Schaden wurde vorsätzlich verursacht.",
      s: "§ 8 Untervermietung. Untervermietung ist ausgeschlossen.",
    }),
  );
  assert.ok(hits.length >= 3);
  for (const hit of hits) {
    assert.doesNotMatch(hit.contract, /unwirksam|nichtig|unzulässig|rechtswidrig|void|illegal|unenforceable/i);
  }
});
