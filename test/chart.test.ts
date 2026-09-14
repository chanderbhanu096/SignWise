import { test } from "node:test";
import assert from "node:assert/strict";
import { chartPlan, CHART_MONTHS } from "../src/chart";

const item = (over: Record<string, unknown> = {}) =>
  ({ label: "x", amount: 3000, clauseId: "§ 1", ...over }) as never;

test("a payment the contract times is drawn on that month, not the first", () => {
  const plan = chartPlan([item({ kind: "deposit", timingMonth: 5 })], false);
  assert.equal(plan.bump[5], 3000);
  assert.equal(plan.bump[0], 0);
  assert.deepEqual(plan.note, { kind: "deposit", month: 5 });
});

test("the deposit caption names the month the deposit actually falls in", () => {
  // The bug this replaces said "the first month is higher" for a deposit in
  // month six: the right bar was drawn and the sentence under it disagreed.
  for (const month of [0, 3, 11]) {
    const plan = chartPlan([item({ kind: "deposit", timingMonth: month })], false);
    assert.deepEqual(plan.note, { kind: "deposit", month });
  }
});

test("a payment with no stated month is not drawn on any month", () => {
  const plan = chartPlan([item({ kind: "fee", timingMonth: null })], false);
  assert.deepEqual(plan.bump, Array(CHART_MONTHS).fill(0));
  assert.equal(plan.unplaced.length, 1);
});

test("an omitted timingMonth is treated the same as an explicit null", () => {
  const plan = chartPlan([item({ kind: "fee" })], false);
  assert.deepEqual(plan.bump, Array(CHART_MONTHS).fill(0));
  assert.equal(plan.unplaced.length, 1);
});

test("a fee is never captioned as a deposit", () => {
  // The old fallback put the first one-off on month 0 whatever its kind, and
  // the caption then called it a deposit.
  for (const kind of ["fee", "other", "variable"]) {
    assert.equal(chartPlan([item({ kind, timingMonth: 0 })], false).note, null);
  }
});

test("a payment with no amount is neither drawn nor reported as undrawn", () => {
  const plan = chartPlan([item({ kind: "fee", amount: null, timingMonth: null })], false);
  assert.deepEqual(plan.bump, Array(CHART_MONTHS).fill(0));
  assert.equal(plan.unplaced.length, 0);
});

test("a month outside the twelve drawn is not plotted and not silently moved", () => {
  const plan = chartPlan([item({ kind: "deposit", timingMonth: 11 })], false);
  assert.equal(plan.bump[11], 3000);
  assert.equal(plan.note?.kind, "deposit");
});

test("two payments in the same month add up on that bar", () => {
  const plan = chartPlan(
    [item({ kind: "deposit", timingMonth: 0 }), item({ kind: "fee", amount: 250, timingMonth: 0 })],
    false,
  );
  assert.equal(plan.bump[0], 3250);
});

test("on income, a placed extra is a bonus and keeps its own month", () => {
  const plan = chartPlan([item({ kind: "bonus", timingMonth: 6 })], true);
  assert.equal(plan.bump[6], 3000);
  assert.deepEqual(plan.note, { kind: "bonus" });
});
