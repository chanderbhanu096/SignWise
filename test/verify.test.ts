import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyQuote } from "../src/verify";

test("a verified quote contains every sentence from the document", () => {
  const doc = "The monthly rent is EUR 1,240. The deposit is EUR 3,000.";
  assert.equal(verifyQuote(doc, doc), true);
  assert.equal(verifyQuote(doc, "The monthly rent is EUR 1,240. The deposit is EUR 9,000."), false);
  assert.equal(verifyQuote(doc, "The monthly rent is EUR 1,240. You waive all rights."), false);
});

test("quote verification tolerates PDF whitespace but not changed terms", () => {
  assert.equal(verifyQuote("The rent\n is  EUR 1,240.", "The rent is EUR 1,240."), true);
  assert.equal(verifyQuote("The rent is EUR 1,240.", "The rent is EUR 1,420."), false);
  assert.equal(verifyQuote("The rent is EUR 1,240.", ""), false);
});

// Asked for a long clause in English the model abbreviates the quote, and a plain
// substring test then tells the reader the passage is not in their document. On one
// live run that hit three clauses of twelve, including the clause carrying the
// contract's worst term.
const DOC = "§ 2 Arbeitszeit. Die regelmäßige Arbeitszeit beträgt während der Vorlesungszeit 20 Stunden pro Woche. "
  + "Bei außergewöhnlichem Projektbedarf verpflichtet sich der Werkstudent, bis zu 28 Stunden pro Woche zu arbeiten. "
  + "§ 3 Vergütung. Die Vergütung beträgt 16,50 EUR brutto je Arbeitsstunde.";

test("a quote the model abbreviated is checked in the parts it kept", () => {
  assert.ok(verifyQuote(DOC, "Die regelmäßige Arbeitszeit beträgt…20 Stunden pro Woche"));
  assert.ok(verifyQuote(DOC, "Die regelmäßige Arbeitszeit beträgt ... 20 Stunden pro Woche"));
});

test("the parts have to appear in the order the quote puts them", () => {
  assert.equal(verifyQuote(DOC, "20 Stunden pro Woche … Die regelmäßige Arbeitszeit beträgt während"), false);
});

test("an ellipsis is not a way to assert something the document does not say", () => {
  // A part that is not in the document at all.
  assert.equal(verifyQuote(DOC, "Die regelmäßige Arbeitszeit beträgt … 40 Stunden pro Kalenderwoche"), false);
  // Parts too short to mean anything: "…" around a stray figure would otherwise
  // verify against any page that happens to contain it.
  assert.equal(verifyQuote(DOC, "Arbeitszeit…20…Woche"), false);
  // And an elision alone does not lower the bar for an ordinary quote.
  assert.equal(verifyQuote(DOC, "Der Mieter zahlt eine Kaution von 3.000 EUR"), false);
});
