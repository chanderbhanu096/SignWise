import test from "node:test";
import assert from "node:assert/strict";
import { splitDocument, narrowRef } from "../src/document.ts";

// Shaped like real extracted PDF text: one long run of words, sections ending in a
// full stop before the next heading, and numbered paragraphs inline.
const DOC = [
  "Mietvertrag über Wohnraum. Zwischen Herrn Reinhard Obermeier, Tegernseer Landstraße 88, München und Frau Yasmin Aydin, geb. am 14.03.1999, wird folgender Vertrag geschlossen:",
  "§ 11 Obhutspflichten (1) Der Mieter hat die Mietsache schonend und pfleglich zu behandeln. (2) Zeigt sich ein Mangel der Mietsache, so hat der Mieter dies dem Vermieter unverzüglich anzuzeigen.",
  "§ 12 Betreten der Mieträume Dem Vermieter ist das Betreten der Mieträume nach vorheriger Ankündigung zu angemessener Tageszeit gestattet.",
  "§ 13 Gefahr im Verzug Zur Abwendung drohender Gefahren darf der Vermieter die Mieträume auch ohne vorherige Ankündigung betreten.",
  "§ 14 Mieterhöhung Der Vermieter ist berechtigt, die Miete nach Maßgabe der §§ 558 ff. BGB zu erhöhen. Die Betriebskosten im Sinne des § 2 Betriebskostenverordnung bleiben unberührt.",
  "München, den 12.09.2026  ____________________  ____________________  Vermieter   Mieter",
].join("  ");

const SECTIONS = DOC.slice(DOC.indexOf("§ 11"), DOC.indexOf("München, den"));

const words = (s: string) => s.replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length;

test("every section becomes its own block", () => {
  const blocks = splitDocument(DOC, []);
  assert.deepEqual(blocks.map((b) => b.text.slice(0, 5)), ["§ 11 ", "§ 12 ", "§ 13 ", "§ 14 "]);
});

// The point of the screen: it is called "original contract", so no word of any
// section may go missing between the extraction and the render.
test("no section text is dropped", () => {
  const blocks = splitDocument(DOC, []);
  assert.equal(words(blocks.map((b) => b.text).join(" ")), words(SECTIONS));
});

// The two parts of a contract that are not contract terms, and that carry the most
// sensitive data in the file.
test("the party block is not shown", () => {
  const rendered = splitDocument(DOC, []).map((b) => b.text).join(" ");
  for (const personal of ["Reinhard Obermeier", "Yasmin Aydin", "14.03.1999", "Tegernseer Landstraße"]) {
    assert.ok(!rendered.includes(personal), `personal data rendered: ${personal}`);
  }
});

test("the signature block is not shown, but the section above it survives", () => {
  const blocks = splitDocument(DOC, []);
  const rendered = blocks.map((b) => b.text).join(" ");
  assert.ok(!rendered.includes("____"));
  assert.ok(!rendered.includes("12.09.2026"));
  assert.ok(!/\bVermieter\s+Mieter\b/.test(rendered));
  assert.ok(blocks.at(-1)!.text.includes("Betriebskostenverordnung bleiben unberührt."));
});

test("a document with no sections at all is shown as it came", () => {
  const loose = "Eine Vereinbarung ohne Paragraphen. Der Mieter zahlt monatlich 500 EUR.";
  assert.deepEqual(splitDocument(loose, []).map((b) => b.text), [loose]);
});

test("a citation is not mistaken for a heading", () => {
  const blocks = splitDocument(DOC, []);
  const increase = blocks.find((b) => b.text.startsWith("§ 14"))!;
  // both a bare citation and one naming the law in full stay inside the sentence
  assert.ok(increase.text.includes("§§ 558 ff. BGB"));
  assert.ok(increase.text.includes("§ 2 Betriebskostenverordnung"));
});

test("a quote spanning two sections marks both of them", () => {
  const quote =
    "Dem Vermieter ist das Betreten der Mieträume nach vorheriger Ankündigung zu angemessener Tageszeit gestattet. Zur Abwendung drohender Gefahren darf der Vermieter die Mieträume auch ohne vorherige Ankündigung betreten.";
  const marked = splitDocument(DOC, [{ id: "access", quote }]).filter((b) => b.clauseId === "access");
  assert.equal(marked.length, 2);
  assert.ok(marked[0].text.startsWith("§ 12"));
  assert.ok(marked[1].text.startsWith("§ 13"));
});

test("a quote inside one section marks only that section", () => {
  const blocks = splitDocument(DOC, [
    { id: "duty", quote: "Der Mieter hat die Mietsache schonend und pfleglich zu behandeln." },
  ]);
  assert.deepEqual(blocks.filter((b) => b.clauseId).map((b) => b.clauseId), ["duty"]);
});

test("a quote that starts after the heading still marks its section", () => {
  const blocks = splitDocument(DOC, [
    { id: "raise", quote: "Der Vermieter ist berechtigt, die Miete nach Maßgabe der §§ 558 ff. BGB zu erhöhen." },
  ]);
  const marked = blocks.filter((b) => b.clauseId === "raise");
  assert.equal(marked.length, 1);
  assert.ok(marked[0].text.startsWith("§ 14"));
});

test("numbered paragraphs are broken onto their own lines", () => {
  const duties = splitDocument(DOC, []).find((b) => b.text.startsWith("§ 11"))!;
  assert.ok(duties.text.includes("\n(2)"), "the second paragraph did not get its own line");
});

// The reported case: a finding labelled "§§ 12-13" whose quote is entirely § 12, so
// § 13 rendered unhighlighted while the label claimed to cover it.
test("a section range is narrowed to what the quote contains", () => {
  const quote =
    "Dem Vermieter ist das Betreten der Mieträume nach vorheriger Ankündigung gestattet. Zur Abwendung drohender Gefahren darf der Vermieter die Mieträume auch ohne vorherige Ankündigung betreten.";
  assert.equal(narrowRef("§§ 12-13 Betreten · Seite 4", quote), "§ 12 Betreten · Seite 4");
  assert.equal(narrowRef("§§ 18-19 · Seite 6", "Die beigefügte Hausordnung ist Bestandteil."), "§ 18 · Seite 6");
});

test("a range the quote really spans is left alone", () => {
  const quote = "§ 12 Betreten Dem Vermieter ist das Betreten gestattet. § 13 Gefahr Zur Abwendung darf er auch ohne Ankündigung betreten.";
  assert.equal(narrowRef("§§ 12-13 · Seite 4", quote), "§§ 12-13 · Seite 4");
});

test("a plain single-section ref is untouched", () => {
  assert.equal(narrowRef("§ 14 Mieterhöhung · Seite 5", "Der Vermieter ist berechtigt zu erhöhen."), "§ 14 Mieterhöhung · Seite 5");
  assert.equal(narrowRef("Clause 4 · page 2", "Anything at all."), "Clause 4 · page 2");
});

test("justification padding is collapsed, line structure is not", () => {
  const doc = "§ 1 Mietsache\n(1) Die erste Rate ist zu  Beginn  fällig.\n(2) Ablauf des  zwölften Monats.";
  const [block] = splitDocument(doc, []);
  assert.ok(!/ {2}/.test(block.text), block.text);
  assert.ok(block.text.includes("zu Beginn fällig"));
  assert.ok(block.text.includes("\n(2)"));
});
