import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { DEPTHS, type Analysis, type Depth } from "../src/types";
import { depthText, facts } from "../src/depth";
import { figureSources } from "../src/provenance";
import { lawCheckScope } from "../src/lawcheck";
import { verifyQuote } from "../src/verify";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  // Quotes around a value are part of dotenv syntax, not part of the endpoint. Left
  // in, they turned every run into ENOTFOUND on a hostname with a quote in it.
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
// _model.ts reads process.env at module scope, so it must load after the above.
const { analyzeContract } = await import("../api/_model");

const strip = (s: string) => s.replace(/§+\s?\d+[a-z]?|\bAbs\.?\s?\d+|\bNr\.?\s?\d+/gi, " ");

const TRAP = `Mietvertrag über Wohnraum

§ 1 Mietsache. Vermietet wird die Wohnung im 2. Obergeschoss, 68 m², bestehend aus 2 Zimmern, Küche, Bad.

§ 2 Mietzeit. Das Mietverhältnis beginnt am 01.03.2027 und läuft auf unbestimmte Zeit.

§ 3 Miete. Die monatliche Nettokaltmiete beträgt 1.450,00 EUR. Die Betriebskostenvorauszahlung beträgt 230,00 EUR monatlich. Die Gesamtmiete ist bis zum dritten Werktag im Voraus zu zahlen.

§ 4 Staffelmiete. Die Nettokaltmiete erhöht sich jährlich um 6 % gegenüber dem Vorjahr.

§ 5 Kaution. Der Mieter leistet eine Kaution in Höhe von 5.800,00 EUR. Die Kaution ist in einer Summe fünf Werktage vor Übergabe der Schlüssel zu zahlen.

§ 6 Kündigung. Der Mieter kann das Mietverhältnis mit einer Frist von neun Monaten zum Monatsende kündigen. Der Vermieter kann mit einer Frist von drei Monaten kündigen.

§ 7 Vertragsstrafe. Zieht der Mieter vor Ablauf von 24 Monaten aus, wird eine Vertragsstrafe in Höhe von drei Nettokaltmieten fällig.

§ 8 Schönheitsreparaturen. Der Mieter hat die Schönheitsreparaturen auf eigene Kosten fachgerecht ausführen zu lassen, und zwar in Küche und Bad alle drei Jahre, in den übrigen Räumen alle fünf Jahre, unabhängig vom Zustand.

§ 9 Untervermietung. Eine Untervermietung ist in jedem Fall ausgeschlossen.

§ 10 Haftung. Der Mieter haftet für alle Schäden an der Mietsache, auch wenn er sie nicht zu vertreten hat.`;

async function run(label: string, text: string, lang: string) {
  const t0 = Date.now();
  const a = (await analyzeContract({ lang, text, filename: `${label}.pdf`, mime: "application/pdf" })) as Analysis;
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`\n${"=".repeat(70)}\n### ${label} / ${lang}   (${secs}s, ${a.clauses.length} clauses, warnings: ${JSON.stringify(a.warnings)})`);
  if (a.warnings.includes("stub")) { console.log("  !! stub — model not reached"); return null; }

  let problems = 0;
  const bad = (w: string, m: string) => { problems++; console.log(`  ✗ ${w}: ${m}`); };

  for (const c of a.clauses) {
    let prev = new Set<string>(), prevLen = 0;
    for (const d of DEPTHS as readonly Depth[]) {
      const text2 = depthText(c.simple, d);
      const f = facts(strip(text2));
      const lost = [...prev].filter((x) => !f.has(x));
      if (lost.length) bad(`${c.id}/${d}`, `LOSES ${lost.join(", ")}`);
      // Reported, not failed. A shorter rendering is not less information: when a
      // level drops a figure the app repairs it by keeping the level below, and the
      // level above then supersedes both in one tighter sentence. Measured over 130
      // clauses: 3 rendered shorter, 0 lost a figure, and all 3 were complete
      // rewrites — "Einmal jährlich im Juni zahlen wir Ihnen 1.200,00 EUR" against
      // "Neben Ihrem Gehalt bekommen Sie jährlich 1.200,00 EUR ... Dieses wird
      // einmal im Juni ausgezahlt." Failing on length would push the app to
      // concatenate those two, which is worse writing and the same facts.
      if (text2.length <= prevLen) console.log(`  · ${c.id}/${d}: shorter than the level below (${text2.length} <= ${prevLen}) — check it reads as a complete explanation`);
      const sents = text2.split(/(?<=[.!?])\s+/).map((x) => x.trim().toLowerCase()).filter((x) => x.length > 12);
      if (sents.some((x, i) => sents.indexOf(x) !== i)) bad(`${c.id}/${d}`, "repeats a sentence");
      prev = f; prevLen = text2.length;
    }
    // raw levels as the model wrote them: was a repair needed at all?
    const rawDetailed = c.simple.detailed ?? "";
    const missingFromRaw = [...facts(strip(c.simple.simple ?? ""))].filter((x) => !facts(strip(rawDetailed)).has(x));
    if (missingFromRaw.length) console.log(`  · ${c.id}: model's own "detailed" dropped ${missingFromRaw.join(", ")} — repaired by the app`);

    const src = figureSources(a, c, depthText(c.simple, "detailed"));
    const untraceable = src.filter((f) => f.kind === "context");
    if (untraceable.length) console.log(`  · ${c.id}: not in the contract → ${untraceable.map((f) => f.shown).join(", ")}`);
    const derived = src.filter((f) => f.kind === "derived");
    if (derived.length) console.log(`  · ${c.id}: derived → ${derived.map((f) => `${f.shown} = ${f.expr}`).join(" | ")}`);
    // The app's headline promise: a quote is shown only because it was found in the
    // document. A paraphrased quote renders as "Passage im Dokument nicht gefunden"
    // next to an explanation the reader is being asked to trust.
    if (!verifyQuote(text, c.quote)) bad(`${c.id}/quote`, `not found in the document: "${c.quote.slice(0, 60)}..."`);

    // Reported, not failed. General legal information does not always have one
    // provision to point at — "ob Überstunden vergütet werden, hängt von der
    // Vereinbarung ab" is a true statement about German law with no single § behind
    // it, and 8 of the 24 hand-written fixture clauses are that shape on purpose.
    // The defect worth watching for is "legal" describing THIS contract instead of
    // the law, and that is not decidable from figures: the fixtures repeat "drei
    // Monate" and "sechs Monate" precisely because § 573c and § 622 BGB say so.
    if (c.legal && !c.legalRefs?.length) console.log(`  · ${c.id}: legal context with no citation — "${c.legal.slice(0, 70)}..."`);

    // The line this tool does not cross (§ 2 Abs. 1 RDG): never a verdict on THIS
    // contract, in any field the reader sees.
    //
    // Twelve hits across three audit rounds, every one of them the salvatorische
    // Klausel: "Ungültige Teile berühren den Rest nicht", "Ist eine Klausel ungültig,
    // gilt der Rest weiter". That clause's subject IS invalidity, and no honest
    // explanation of it avoids the word. Sentence shape does not separate those from
    // a real verdict — the third round still flagged "Änderungen dieses Vertrages
    // machen Sie schriftlich, ungültige Teile ändern nichts am Ganzen", where
    // "dieses Vertrages" belongs to the written-form half and "ungültige" is generic.
    //
    // So the question is whose word it is. If the contract itself talks about
    // invalidity, the model is quoting the clause; if it does not, the model brought
    // the verdict, and that is the line § 2 Abs. 1 RDG draws.
    const VERDICT = /\bunwirksam|\bnichtig|\bvoid\b|\bunenforceable|\billegal|\brechtswidrig|\bungültig/i;
    const CLAUSE_IS_ABOUT_VALIDITY = /unwirksam|nichtig|ungültig|wirksamkeit|salvatorisch|invalid|unenforceable|severab/i;
    if (!CLAUSE_IS_ABOUT_VALIDITY.test(c.quote)) {
      const prose = [c.title, c.means, c.legal ?? "", ...Object.values(c.simple)].join(". ");
      for (const sentence of prose.split(/(?<=[.!?])\s+/)) {
        if (VERDICT.test(sentence)) bad(`${c.id}/rdg`, `verdict the contract never mentions: "${sentence.trim().slice(0, 90)}"`);
      }
    }
  }

  // Coverage: the reader can click any section of the document, so a section the
  // model never surfaced is a paragraph that stays unexplained on screen. The
  // prompt asks for every numbered section; this is where that gets checked.
  const sections = [...text.matchAll(/^§\s?(\d+[a-z]?)\s/gm)].map((m) => m[1]);
  const covered = new Set(
    a.clauses.flatMap((c) => [...`${c.quote} ${c.ref}`.matchAll(/§+\s?(\d+[a-z]?)/g)].map((m) => m[1])),
  );
  const missed = sections.filter((n) => !covered.has(n));
  if (missed.length) bad("coverage", `${missed.length} of ${sections.length} sections never surfaced: § ${missed.join(", § ")}`);
  else console.log(`  · coverage: all ${sections.length} sections surfaced`);

  const law = lawCheckScope(a);
  console.log(`  · law: ${law.checked} benchmarks, ${law.hits.length} hits: ${law.hits.map((h) => h.cite).join(", ")}`);
  console.log(`  ${problems === 0 ? "→ clean" : `→ ${problems} problem(s)`}`);
  // Every run costs a minute of model time. Keep the answer so the next question
  // about it is asked of a file instead of the provider.
  if (saveTo) writeFileSync(`${saveTo}/${label.replace(/\W+/g, "-")}-${lang}.json`, JSON.stringify(a, null, 2));
  return { problems, clauses: a.clauses.length, secs: Number(secs) };
}

// Usage: npx tsx scripts/model-audit.ts [--runs N] [--lang de,en] [file.pdf|file.txt ...]
//
// One run says whether the model can do this; ten runs say how often it does. The
// model is sampled, so a single clean pass is not evidence — every conclusion drawn
// from this script should quote a rate.
async function loadDocument(file: string): Promise<string> {
  if (!file.toLowerCase().endsWith(".pdf")) return readFileSync(file, "utf8");
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(file)), isEvalSupported: false }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    // Joined exactly the way src/pdf.ts joins it, so the quote check here is the
    // same check the browser makes.
    pages.push(content.items.map((it: any) => ("str" in it ? it.str + (it.hasEOL ? "\n" : " ") : "")).join(""));
  }
  return pages.join("\n\n");
}

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args.splice(i, 2)[1] ?? fallback) : fallback;
};
const runs = Number(flag("runs", "1"));
const saveTo = flag("save", "");
if (saveTo) mkdirSync(saveTo, { recursive: true });
const langs = flag("lang", "de,en").split(",").filter(Boolean);
const files = args.filter((a) => !a.startsWith("--"));
const documents: Array<[string, string]> = files.length
  ? await Promise.all(files.map(async (f) => [f.split("/").pop()!, await loadDocument(f)] as [string, string]))
  : [["trap", TRAP]];

const tally: Array<{ doc: string; lang: string; problems: number; secs: number }> = [];
for (const [label, text] of documents) {
  for (const lang of langs) {
    for (let i = 0; i < runs; i++) {
      const result = await run(runs > 1 ? `${label} #${i + 1}` : label, text, lang);
      if (result) tally.push({ doc: label, lang, problems: result.problems, secs: result.secs });
    }
  }
}

console.log(`\n${"=".repeat(70)}\nSUMMARY`);
for (const [label] of documents) {
  for (const lang of langs) {
    const rows = tally.filter((r) => r.doc === label && r.lang === lang);
    if (!rows.length) continue;
    const clean = rows.filter((r) => r.problems === 0).length;
    const secs = Math.round(rows.reduce((n, r) => n + r.secs, 0) / rows.length);
    console.log(`  ${label} / ${lang}: ${clean}/${rows.length} clean, ${rows.reduce((n, r) => n + r.problems, 0)} problems total, ~${secs}s per run`);
  }
}
const cleanAll = tally.filter((r) => r.problems === 0).length;
console.log(`  overall: ${cleanAll}/${tally.length} clean runs`);
