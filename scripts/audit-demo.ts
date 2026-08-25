import { sampleAnalysis, employmentAnalysis, SAMPLE_DOC_TEXT, EMPLOYMENT_DOC_TEXT } from "../src/sample";
import { AnalysisSchema, DEPTHS, type Analysis, type Depth } from "../src/types";
import { depthText, facts, withoutDates } from "../src/depth";
import { figureSources } from "../src/provenance";
import { lawCheckScope } from "../src/lawcheck";
import { verifyQuote } from "../src/verify";
import { splitDocument } from "../src/document";

let fails = 0;
const bad = (where: string, msg: string) => { fails++; console.log(`  ✗ ${where}: ${msg}`); };
const strip = (s: string) => s.replace(/§+\s?\d+[a-z]?|\bAbs\.?\s?\d+|\bNr\.?\s?\d+|\b(?:Seite|page)\s?\d+/gi, " ");

function auditOne(name: string, a: Analysis, doc: string) {
  console.log(`\n### ${name}`);

  // 0. the fixture must satisfy the same schema an uploaded analysis does
  const parsed = AnalysisSchema.safeParse(a);
  if (!parsed.success) bad("schema", JSON.stringify(parsed.error.issues.slice(0, 3)));

  for (const c of a.clauses) {
    // 1. the quote must actually be in the document
    if (!verifyQuote(doc, c.quote)) bad(`${c.id}/quote`, "not found verbatim in the document text");

    // 2. depth is cumulative: no figure may disappear as you ask for more
    let prev = new Set<string>();
    let prevLen = 0;
    for (const d of DEPTHS as readonly Depth[]) {
      const text = depthText(c.simple, d);
      if (!text.trim()) { bad(`${c.id}/${d}`, "renders empty"); continue; }
      const f = facts(strip(text));
      const lost = [...prev].filter((x) => !f.has(x));
      if (lost.length) bad(`${c.id}/${d}`, `loses figure(s) ${lost.join(", ")}`);
      // 3. more detail must actually be more
      if (text.length <= prevLen) bad(`${c.id}/${d}`, `no longer than the level below (${text.length} <= ${prevLen})`);
      // 4. the glued-sentence symptom: the same sentence twice in one rendering
      const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim().toLowerCase()).filter((s) => s.length > 12);
      const dupe = sentences.find((s, i) => sentences.indexOf(s) !== i);
      if (dupe) bad(`${c.id}/${d}`, `repeats a sentence: "${dupe.slice(0, 50)}"`);
      prev = f;
      prevLen = text.length;
    }

    // 5. provenance must not claim a figure is in this clause when it is not
    const detailed = depthText(c.simple, "detailed");
    const own = facts(withoutDates(strip(c.quote)));
    for (const f of figureSources(a, c, detailed)) {
      if (f.kind === "clause" && !facts(strip(c.quote)).has(f.key)) bad(`${c.id}/prov`, `claims ${f.shown} is in the clause, it is not`);
      if (f.kind === "derived" && !f.expr) bad(`${c.id}/prov`, `derived without an expression`);
    }
    void own;
  }

  // 6. every clause the document shows must be reachable, and vice versa
  const blocks = splitDocument(doc, a.clauses);
  const marked = new Set(blocks.map((b) => b.clauseId).filter(Boolean));
  for (const c of a.clauses) if (!marked.has(c.id)) bad(`${c.id}/doc`, "clause is never marked in the rendered document");

  // 7. glance values that name a figure should be traceable to the document
  for (const g of a.glance) {
    const gv = facts(strip(g.value));
    const inDoc = facts(doc);
    const orphan = [...gv].filter((x) => !inDoc.has(x));
    if (orphan.length && !g.derived) bad(`glance/${g.key}`, `value "${g.value}" states ${orphan.join(", ")} — not in the document`);
  }

  // 8. dates
  const docFacts = facts(doc);
  for (const d of a.dates) {
    if (!d.iso) continue;
    const y = d.iso.slice(0, 4);
    const [yy, mm, dd] = d.iso.split("-").map(Number);
    const anchored = docFacts.has(String(yy)) && docFacts.has(String(mm)) && docFacts.has(String(dd));
    if (!anchored) console.log(`  · timeline "${d.title}" (${d.iso}) is computed, not printed in the document`);
  }

  // 9. the clean demo must show no statutory deviation
  const law = lawCheckScope(a);
  if (law.hits.length) bad("lawcheck", `clean demo now trips ${law.hits.length} benchmark(s): ${law.hits.map((h) => h.cite).join(", ")}`);
  console.log(`  · ${a.clauses.length} clauses, ${blocks.length} document blocks, ${law.checked} benchmarks checked, ${law.hits.length} hits`);
}

// language parity: the same clause must state the same figures in both languages
function auditParity(name: string, de: Analysis, en: Analysis) {
  console.log(`\n### ${name} — language parity`);
  for (const cde of de.clauses) {
    const cen = en.clauses.find((c) => c.id === cde.id);
    if (!cen) { bad(`${cde.id}`, "missing in EN"); continue; }
    for (const d of DEPTHS as readonly Depth[]) {
      const fd = facts(strip(depthText(cde.simple, d)));
      const fe = facts(strip(depthText(cen.simple, d)));
      const onlyDe = [...fd].filter((x) => !fe.has(x));
      const onlyEn = [...fe].filter((x) => !fd.has(x));
      if (onlyDe.length || onlyEn.length)
        bad(`${cde.id}/${d}`, `DE and EN state different figures — only DE: [${onlyDe}] only EN: [${onlyEn}]`);
    }
    if (cde.title === cen.title && /[äöüß]/.test(cde.title)) bad(`${cde.id}/title`, "EN title left in German");
  }
}

auditOne("rental / de", sampleAnalysis("de"), SAMPLE_DOC_TEXT);
auditOne("rental / en", sampleAnalysis("en"), SAMPLE_DOC_TEXT);
auditOne("employment / de", employmentAnalysis("de"), EMPLOYMENT_DOC_TEXT);
auditOne("employment / en", employmentAnalysis("en"), EMPLOYMENT_DOC_TEXT);
auditParity("rental", sampleAnalysis("de"), sampleAnalysis("en"));
auditParity("employment", employmentAnalysis("de"), employmentAnalysis("en"));

console.log(`\n${fails === 0 ? "ALL CLEAN" : `${fails} PROBLEM(S)`}`);
