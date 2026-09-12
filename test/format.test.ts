import { test } from "node:test";
import assert from "node:assert/strict";
import { currencyStyle, styleCurrencyDeep, euro } from "../src/format";

test("headline amounts keep real cents while whole amounts stay compact", () => {
  assert.equal(euro(1240.5, "en"), "€1,240.50");
  assert.equal(euro(1240.5, "de"), "1.240,50\u00a0€");
  assert.equal(euro(0.01, "en"), "€0.01");
  assert.equal(euro(1240, "en"), "€1,240");
  assert.match(euro(1.234, "en", "KWD"), /1\.234/);
});

test("a model currency label cannot crash the financial summary or change the value", () => {
  assert.equal(euro(1240.5, "en", "€"), "1,240.5\u00a0€");
  assert.equal(euro(1240.5, "de", "Euro"), "1.240,5\u00a0Euro");
  assert.equal(euro(1240.5, "en", ""), "1,240.5");
});

test("model prose gets the app's currency notation", () => {
  assert.equal(currencyStyle("Sie zahlen 1.180,00 EUR Kaltmiete."), "Sie zahlen 1.180\u00a0€ Kaltmiete.");
  assert.equal(currencyStyle("bis 150,00 EUR je Reparatur"), "bis 150\u00a0€ je Reparatur");
  // An amount is re-emitted in the language it is being shown in; the case below
  // passed the English sentence with the German default, which is not a combination
  // the app ever produces. The locale test further down covers English properly.
  assert.equal(currencyStyle("You pay 1,180.00 EUR", "EUR", "en"), "You pay €1,180");
});

// The model writes an amount the way the contract does, and a contract writes a
// thousand without a separator often enough. Swapping only the currency word left
// "1240 EUR" beside "1.240 €" on one screen, for the same rent.
test("an amount without a thousands separator gets the same notation as one with", () => {
  assert.equal(currencyStyle("Die Miete beträgt 1240 EUR."), "Die Miete beträgt 1.240\u00a0€.");
  assert.equal(currencyStyle("Die Miete beträgt 1240,00 EUR."), "Die Miete beträgt 1.240\u00a0€.");
  assert.equal(currencyStyle("Kaution EUR 3000"), "Kaution 3.000\u00a0€");
  // and a section number is not an amount
  assert.equal(currencyStyle("§ 1240 BGB"), "§ 1240 BGB");
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

test("the symbol sits where the locale puts it", () => {
  // The app's own euro() writes "1.480 €" in German and "€1,480" in English; a
  // rewritten amount has to match, or we have reintroduced the mismatch in English.
  assert.equal(currencyStyle("Sie zahlen 1.180,00 EUR", "EUR", "de"), "Sie zahlen 1.180 €");
  assert.equal(currencyStyle("You pay 1,180.00 EUR", "EUR", "en"), "You pay €1,180");
  assert.equal(currencyStyle("a fee of 12.50 EUR", "EUR", "en"), "a fee of €12.50");
});
