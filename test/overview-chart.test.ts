import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Overview } from "../src/screens/Overview";
import { sampleAnalysis } from "../src/sample";
import { t } from "../src/i18n";
import type { Analysis, Lang } from "../src/types";

// The unit tests in chart.test.ts prove chartPlan decides correctly. These prove
// the screen actually says what it decided: the first version of this bug was a
// correct bar under a caption that contradicted it, which no unit test would see.
function render(analysis: Analysis) {
  return renderToStaticMarkup(
    createElement(Overview, {
      analysis,
      filename: "probe.pdf",
      pages: null,
      onOpenClause() {},
      onOriginal() {},
      onDecision() {},
      onAsk() {},
      answer: null,
      asking: false,
      onAddCalendar() {},
      calMsg: "",
    }),
  );
}

const barAmounts = (html: string) => [...html.matchAll(/class="bar-amt">([^<]+)/g)].map((m) => m[1]);
const chartNotes = (html: string) => [...html.matchAll(/class="chart-note">([^<]+)/g)].map((m) => m[1]);
const ariaLabel = (html: string) => html.match(/class="chart"[^>]*aria-label="([^"]+)"/)?.[1] ?? "";
/** Just the pay hero, so a link somewhere else on the page cannot stand in for its own. */
const payHero = (html: string) => html.match(/<div class="pay-hero">[\s\S]*?<div class="pay-aside">/)?.[0] ?? "";

/**
 * An hourly contract: it never writes a monthly figure, so the headline is
 * derived. Synthetic test input built from the clause shapes in pay.test.ts --
 * no user-facing contract data is invented by this.
 */
function hourlyAnalysis(lang: Lang): Analysis {
  const a = sampleAnalysis(lang);
  a.money.monthly = null;
  a.money.yearly = null;
  a.money.monthlyClauseId = undefined;
  a.clauses = [
    { ...a.clauses[0], id: "§ 2", ref: "§ 2", quote: "Die regelmäßige Arbeitszeit beträgt 20 Stunden pro Woche." },
    { ...a.clauses[0], id: "§ 3", ref: "§ 3", quote: "Die Vergütung beträgt 16,50 EUR brutto je Arbeitsstunde." },
  ];
  return a;
}

for (const lang of ["de", "en"] as Lang[]) {
  const s = t(lang);
  const month = (n: number) => `${lang === "de" ? "Monat" : "Month"} ${n}`;

  test(`[${lang}] the shipped example is unchanged: the deposit lands in its stated month`, () => {
    const html = render(sampleAnalysis(lang));
    const bars = barAmounts(html);
    assert.equal(bars.length, 12);
    assert.notEqual(bars[0], bars[1]); // month 1 carries the deposit, month 2 does not
    assert.ok(chartNotes(html).includes(s.depositBumpIn(month(1))));
    assert.ok(ariaLabel(html).includes(s.depositBumpIn(month(1))));
  });

  test(`[${lang}] a deposit the contract puts in month six is captioned month six`, () => {
    const a = sampleAnalysis(lang);
    a.money.oneTime[0].timingMonth = 5; // synthetic probe input, not a contract fact
    const html = render(a);
    const bars = barAmounts(html);
    assert.equal(bars[0], bars[1], "month 1 must be a plain recurring month");
    assert.notEqual(bars[5], bars[0], "month 6 must carry the deposit");
    assert.ok(chartNotes(html).includes(s.depositBumpIn(month(6))));
    assert.ok(!chartNotes(html).some((n) => n.includes(month(1))), "must not still claim month 1");
  });

  for (const [name, mutate] of [
    ["null", (a: Analysis) => { a.money.oneTime[0].timingMonth = null; }],
    ["omitted", (a: Analysis) => { delete a.money.oneTime[0].timingMonth; }],
  ] as const) {
    test(`[${lang}] a payment whose month is ${name} is drawn nowhere and said so by name`, () => {
      const a = sampleAnalysis(lang);
      a.money.oneTime[0].kind = "fee";
      mutate(a);
      const label = a.money.oneTime[0].label;
      const html = render(a);
      const bars = barAmounts(html);
      assert.equal(new Set(bars).size, 1, "every month must be the plain recurring amount");
      const expected = s.chartUnplaced(label);
      assert.ok(chartNotes(html).includes(expected), "the undrawn payment must be named under the chart");
      assert.ok(ariaLabel(html).includes(expected), "and named to a screen reader too");
      assert.ok(!chartNotes(html).some((n) => n.includes(s.depositBumpIn(month(1)))), "a fee is not a deposit");
    });
  }

  test(`[${lang}] the compression disclosure survives, and so does the clause source link`, () => {
    const html = render(sampleAnalysis(lang));
    assert.ok(html.includes(s.chartScaleNote), "a compressed chart must disclose it");
    assert.ok(payHero(html).includes(s.showClause), "the headline figure must keep a way back to its clause");
    assert.ok(html.includes(month(1)) && html.includes(month(12)), "labels stay contract months");
  });
}

for (const lang of ["de", "en"] as Lang[]) {
  const s = t(lang);

  test(`[${lang}] a pay figure the contract never wrote is shown as derived, inside the hero`, () => {
    const hero = payHero(render(hourlyAnalysis(lang)));
    assert.ok(hero, "the pay hero must render for an hourly contract");
    // 16,50 x 20 x 52/12 = 1430. The digits must be on screen in either locale's formatting.
    assert.ok(/1[.,]430/.test(hero), `the derived monthly figure must be shown: ${hero.slice(0, 200)}`);
    assert.ok(hero.includes(s.payDerivedTag), "and it must say the figure was worked out, not quoted");
    assert.ok(hero.includes(s.showClause), "and link to the clause the arithmetic came from");
  });
}
