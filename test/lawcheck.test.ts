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

test("deposit comparisons preserve all digits, cents and currency symbols", () => {
  for (const [rent, deposit] of [["1450 EUR", "5800 EUR"], ["1.450,50 €", "5.802 €"], ["€1,450.50", "€5,802"]]) {
    const hit = lawChecks(rental({ rent: `Die Nettokaltmiete beträgt ${rent}.`, dep: `Die Kaution beträgt ${deposit}.` })).find((h) => h.id === "kaution-hoehe");
    assert.ok(hit, `${rent} / ${deposit}`);
    assert.match(hit.contract, /4,0-Fache/);
  }
});

test("the contract's deposit takes precedence over a conflicting model money row", () => {
  const analysis = rental({ rent: RENT, dep: "Die Kaution beträgt 4.000 EUR." });
  analysis.money.oneTime = [{ label: "Deposit", kind: "deposit", amount: 9000, clauseId: "dep" }];
  assert.ok(!lawChecks(analysis).some((hit) => hit.id === "kaution-hoehe"));
});

test("qualified liability and subletting clauses are not reported as absolute exclusions", () => {
  const analysis = rental({
    liability: "Die Haftung ist ausgeschlossen, außer bei Vorsatz oder grober Fahrlässigkeit.",
    sublet: "Untervermietung ohne Zustimmung des Vermieters ist untersagt.",
  });
  assert.ok(!lawChecks(analysis).some((hit) => ["haftungsausschluss", "untervermietung"].includes(hit.id)));
});

test("the recurring-service benchmark uses the current one-month notice and excludes insurance", () => {
  const analysis = rental({ term: "Die Kündigungsfrist beträgt zwei Monate." });
  analysis.contractType = "Fitness subscription";
  const hit = lawChecks(analysis).find((item) => item.id === "laufzeit-abo");
  assert.ok(hit);
  assert.match(hit.rule, /auf einen Monat/);
  assert.match(hit.rule, /ältere Verträge/);
  analysis.contractType = "Insurance policy";
  assert.ok(!lawChecks(analysis).some((item) => item.id === "laufzeit-abo"));
});

// Employment benchmarks. Every quote below is from the fictional Werkstudent test
// contract that made the gap obvious: before these, an employment contract was
// measured against one benchmark, and the working-student hours rule — the one the
// person holding that contract most needs — was not among them.
function employment(quotes: Record<string, string>, contractType = "Werkstudentenvertrag"): Analysis {
  const base = employmentAnalysis("de");
  return {
    ...base,
    contractType,
    money: { ...base.money, oneTime: [] },
    clauses: Object.entries(quotes).map(([id, quote], i) => ({ ...base.clauses[0], id, ref: `§ ${i + 1}`, quote })),
    findings: [Object.keys(quotes)[0]],
  };
}
const fired = (a: Analysis, id: string) => lawChecks(a).find((h) => h.id === id);

test("a Werkstudentenvertrag is recognised as employment, not as a generic contract", () => {
  for (const type of ["Werkstudentenvertrag", "Minijob-Vertrag", "Praktikumsvertrag", "Ausbildungsvertrag", "Working student agreement"]) {
    const scope = lawCheckScope(employment({ a: "§ 1 Beginn. Das Arbeitsverhältnis beginnt am 01.10.2026." }, type));
    assert.ok(scope.checked > 1, `${type} was measured against ${scope.checked} benchmark(s)`);
  }
});

test("hours above the working-student line are put next to § 6 SGB V, taking the highest the clause allows", () => {
  const hit = fired(employment({
    hours: "§ 2 Arbeitszeit. Die regelmäßige Arbeitszeit beträgt während der Vorlesungszeit 20 Stunden pro Woche. Bei außergewöhnlichem Projektbedarf verpflichtet sich der Werkstudent, auf Anweisung bis zu 28 Stunden pro Woche zu arbeiten.",
  }), "werkstudent-20-stunden");
  assert.ok(hit, "expected the working-student hours benchmark to fire");
  assert.match(hit.contract, /28 Stunden/, "the first figure was taken instead of the highest");
  assert.doesNotMatch(hit.contract, /unwirksam|ungültig/);
});

test("a working week inside the line stays silent", () => {
  assert.equal(fired(employment({
    hours: "§ 2 Arbeitszeit. Die regelmäßige Arbeitszeit beträgt während der Vorlesungszeit 20 Stunden pro Woche.",
  }), "werkstudent-20-stunden"), undefined);
});

test("leave that lapses without notice is put next to § 7 Abs. 3 BUrlG", () => {
  const hit = fired(employment({
    leave: "§ 5 Urlaub. Urlaub, der bis zum 31. Dezember nicht genommen wurde, verfällt unabhängig davon, ob der Arbeitgeber zuvor auf den drohenden Verfall hingewiesen hat.",
  }), "urlaubsverfall");
  assert.ok(hit, "expected the holiday-lapse benchmark to fire");
  assert.match(hit.rule, /hingewiesen/);
});

test("an ordinary carry-over clause stays silent", () => {
  assert.equal(fired(employment({
    leave: "§ 5 Urlaub. Resturlaub kann bis zum 31. März des Folgejahres genommen werden.",
  }), "urlaubsverfall"), undefined);
});

test("leave below the statutory floor is put next to § 3 BUrlG, and the floor follows the week", () => {
  const hit = fired(employment({
    leave: "§ 5 Urlaub. Der Werkstudent erhält 15 Arbeitstage Jahresurlaub auf Basis einer Fünf-Tage-Woche.",
  }), "mindesturlaub");
  assert.ok(hit, "expected the minimum-leave benchmark to fire");
  assert.match(hit.contract, /15/);
  assert.match(hit.contract, /20/);
  assert.equal(fired(employment({
    leave: "§ 5 Urlaub. Der Werkstudent erhält 20 Arbeitstage Jahresurlaub auf Basis einer Fünf-Tage-Woche.",
  }), "mindesturlaub"), undefined);
});

test("an hourly wage is only put next to § 1 MiLoG when it falls short", () => {
  assert.equal(fired(employment({
    pay: "§ 3 Vergütung. Die Vergütung beträgt 16,50 EUR brutto je Arbeitsstunde.",
  }), "mindestlohn"), undefined, "a wage above the minimum is not a gap worth showing");
  const hit = fired(employment({
    pay: "§ 3 Vergütung. Die Vergütung beträgt 11,00 EUR brutto je Arbeitsstunde.",
  }), "mindestlohn");
  assert.ok(hit, "expected the minimum-wage benchmark to fire");
  assert.match(hit.contract, /11,00/);
});

test("no employment benchmark ever returns a verdict on the contract", () => {
  const all = lawChecks(employment({
    hours: "§ 2 Arbeitszeit. Bis zu 28 Stunden pro Woche während der Vorlesungszeit.",
    leave: "§ 5 Urlaub. 15 Arbeitstage auf Basis einer Fünf-Tage-Woche; nicht genommener Urlaub verfällt unabhängig davon, ob der Arbeitgeber hingewiesen hat.",
    pay: "§ 3 Vergütung. 11,00 EUR brutto je Arbeitsstunde.",
    cut: "§ 11 Ausschlussfrist. Ansprüche verfallen, wenn sie nicht innerhalb von zwei Monaten geltend gemacht werden.",
  }));
  assert.ok(all.length >= 4, `expected every trap to be measured, got ${all.map((h) => h.id).join(", ")}`);
  for (const hit of all) assert.doesNotMatch(hit.contract, /unwirksam|nichtig|ungültig|void|illegal/i, hit.id);
});
