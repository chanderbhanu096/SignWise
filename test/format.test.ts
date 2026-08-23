import { test } from "node:test";
import assert from "node:assert/strict";
import { currencyStyle, styleCurrencyDeep } from "../src/format";

test("model prose gets the app's currency notation", () => {
  assert.equal(currencyStyle("Sie zahlen 1.180,00 EUR Kaltmiete."), "Sie zahlen 1.180\u00a0€ Kaltmiete.");
  assert.equal(currencyStyle("bis 150,00 EUR je Reparatur"), "bis 150\u00a0€ je Reparatur");
  assert.equal(currencyStyle("You pay 1,180.00 EUR"), "You pay 1,180\u00a0€");
});

test("real cents survive", () => {
  assert.equal(currencyStyle("Gebühr 12,50 EUR"), "Gebühr 12,50\u00a0€");
});

test("a currency with no symbol is left alone", () => {
  assert.equal(currencyStyle("1.480,00 CHF", "CHF"), "1.480,00 CHF");
});

test("quotes and refs stay verbatim", () => {
  const out = styleCurrencyDeep(
    { quote: "eine Kaution in Höhe von 3.540,00 EUR", ref: "§ 5", means: "Die Kaution beträgt 3.540,00 EUR.", currency: "EUR" },
    "EUR",
  );
  assert.equal(out.quote, "eine Kaution in Höhe von 3.540,00 EUR");
  assert.equal(out.ref, "§ 5");
  assert.equal(out.means, "Die Kaution beträgt 3.540\u00a0€.");
  assert.equal(out.currency, "EUR");
});
