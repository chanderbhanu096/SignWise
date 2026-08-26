import { readFileSync } from "node:fs";
import { DEPTHS, type Analysis, type Depth } from "../src/types";
import { depthText, facts } from "../src/depth";
import { figureSources } from "../src/provenance";
import { lawCheckScope } from "../src/lawcheck";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
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
      if (text2.length <= prevLen) bad(`${c.id}/${d}`, `not longer than the level below (${text2.length} <= ${prevLen})`);
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
  return a;
}

const which = process.argv[2] ?? "all";
if (which === "all" || which === "de") await run("trap", TRAP, "de");
if (which === "all" || which === "en") await run("trap", TRAP, "en");
