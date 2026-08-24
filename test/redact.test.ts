import { test } from "node:test";
import assert from "node:assert/strict";
import { redact, jsonEscape } from "../src/redact";

const DOC = [
  "Vermieterin Klara Neumann, Ismaninger Straße 61, 81675 München",
  "Mietobjekt 2-Zimmer-Wohnung, Schwanthalerstraße 91, 80336 München",
  "Zahlung auf IBAN DE89 3704 0044 0532 0130 00, Tel. +49 89 123456",
  "Rückfragen an k.neumann@example.de, Steuernummer: 143/815/08151",
  "§ 3 Miete. Die monatliche Nettokaltmiete beträgt 1.450,00 EUR.",
].join("\n");

test("direct identifiers never leave the browser", () => {
  const { text } = redact(DOC);
  for (const secret of [
    "DE89 3704 0044 0532 0130 00",
    "k.neumann@example.de",
    "+49 89 123456",
    "143/815/08151",
    "Ismaninger Straße 61",
    "Schwanthalerstraße 91",
  ]) {
    assert.ok(!text.includes(secret), `"${secret}" still present in the redacted text`);
  }
});

test("the contract's substance is untouched", () => {
  const { text } = redact(DOC);
  assert.match(text, /§ 3 Miete/);
  assert.match(text, /1\.450,00 EUR/);
  assert.match(text, /Nettokaltmiete/);
});

test("the reader gets the originals back, exactly", () => {
  const { text, restore } = redact(DOC);
  assert.equal(restore(text), DOC);
});

test("restoring into raw JSON escapes the value", () => {
  const doc = 'Konto "Hauptkasse" bei Ismaninger Straße 61, 81675 München';
  const { text, restore } = redact(doc);
  const raw = JSON.stringify({ quote: text });
  assert.equal(JSON.parse(restore(raw, jsonEscape)).quote, doc);
});

test("the same value gets one placeholder, however often it appears", () => {
  const { text } = redact("Ismaninger Straße 61 ... siehe Ismaninger Straße 61 oben");
  assert.equal((text.match(/\[ADRESSE-1\]/g) ?? []).length, 2);
  assert.ok(!text.includes("[ADRESSE-2]"));
});

test("a document with nothing to hide comes back unchanged", () => {
  const plain = "§ 9 Kündigung. Die Kündigung ist schriftlich zum Monatsende zulässig.";
  const { text, restore } = redact(plain);
  assert.equal(text, plain);
  assert.equal(restore(text), plain);
});
