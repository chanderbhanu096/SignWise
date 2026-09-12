import test from "node:test";
import assert from "node:assert/strict";
import { derivePay, hourlyWage, weeklyHoursAll } from "../src/pay.ts";
import type { Clause } from "../src/types.ts";

const clause = (id: string, quote: string): Clause =>
  ({ id, ref: id, page: 1, quote, level: "standard", title: id, means: "", simple: "" }) as Clause;

// The contract this app was tested against. It never writes a monthly figure, so
// before this the whole money panel and the 12-month chart were blank for it.
const WERK = [
  clause("§ 2", "Die regelmäßige Arbeitszeit beträgt während der Vorlesungszeit 20 Stunden pro Woche. Bei außergewöhnlichem Projektbedarf verpflichtet sich der Werkstudent, auf Anweisung bis zu 28 Stunden pro Woche zu arbeiten."),
  clause("§ 3", "Die Vergütung beträgt 16,50 EUR brutto je Arbeitsstunde und wird monatlich nach den erfassten Arbeitsstunden abgerechnet."),
];

test("an hourly contract states a monthly income; it just leaves the multiplication to the reader", () => {
  const pay = derivePay(WERK);
  assert.ok(pay);
  assert.equal(pay.hourly, 16.5);
  assert.equal(pay.hours, 20);
  assert.equal(pay.hoursMax, 28);
  assert.equal(pay.monthly, 1430); // 16.50 × 20 × 52/12
  assert.equal(pay.monthlyMax, 2002); // 16.50 × 28 × 52/12
  assert.equal(pay.clauseId, "§ 3"); // the reader can check the arithmetic against the rate
  assert.equal(pay.hoursClauseId, "§ 2");
});

test("the regular week is the headline and the demandable week is the ceiling, not the other way round", () => {
  // Taking the highest figure — which is what the § 6 SGB V benchmark needs —
  // would advertise a working student 2.002 € a month for a 20-hour contract.
  const pay = derivePay(WERK);
  assert.ok(pay!.monthly < pay!.monthlyMax!);
});

test("a rate with no stated week is not enough to derive anything", () => {
  // Assuming a 40-hour week here would overstate a working student's income by half.
  assert.equal(derivePay([clause("§ 3", "Die Vergütung beträgt 16,50 EUR brutto je Arbeitsstunde.")]), null);
});

test("a week with no stated rate is not enough either", () => {
  assert.equal(derivePay([clause("§ 2", "Die regelmäßige Arbeitszeit beträgt 20 Stunden pro Woche.")]), null);
});

test("an English contract is read the same way", () => {
  const pay = derivePay([
    clause("3", "The rate of pay is 14.50 per hour, paid monthly in arrears."),
    clause("2", "Normal working time is 15 hours a week during term."),
  ]);
  assert.ok(pay);
  assert.equal(pay.hourly, 14.5);
  assert.equal(pay.hours, 15);
  assert.equal(pay.monthlyMax, null); // one figure, so no range to show
});

test("a section number is not an amount and not an hours figure", () => {
  assert.equal(hourlyWage("§ 3 Vergütung"), null);
  assert.deepEqual(weeklyHoursAll("§ 2 Arbeitszeit"), []);
});

test("weekly figures come back lowest first, deduplicated", () => {
  assert.deepEqual(weeklyHoursAll("28 Stunden pro Woche, sonst 20 Stunden pro Woche, höchstens 28 Stunden pro Woche"), [20, 28]);
});
