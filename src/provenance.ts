import type { Analysis, Clause } from "./types";
import { canonical, facts, withoutDates } from "./depth";

// Where the figures in an explanation actually come from.
//
// An explanation mixes three different kinds of number and the reader cannot tell
// them apart. "Kleine Reparaturen bis 150 € je Fall, im Jahr höchstens 8 % der
// Jahresmiete — rund 1.190 €" reads as three things the contract says. Two of them
// are: 150 € and 8 % are in § 13. The third is not in the contract at all — it is
// 8 % of the annual rent from § 4, worked out. Same for a probation period that ends
// on a date the contract never prints, and for a notice period taken from the law
// rather than from the page.
//
// That is what "the data does not match the contract" turns out to be. So every
// figure is traced: in this clause, in another clause, derived from figures that are
// in the contract, or not in the contract text at all. Nothing is hidden and nothing
// is claimed to be quoted when it is not.

export type FigureKind = "clause" | "other" | "derived" | "context";
export type FigureSource = {
  shown: string; // as it appears in the explanation, e.g. "1.190 €"
  key: string; // canonical, e.g. "1190"
  kind: FigureKind;
  ref?: string; // the clause it came from, or the base of the derivation
  expr?: string; // the derivation, e.g. "8 % × 14.880"
};

// Section numbers, paragraph numbers and page numbers are addresses, not figures.
// Leaving them in made "§ 13" report the figure 13 as missing from the contract.
const CITATION = /§+\s?\d+[a-z]?|\bAbs\.?\s?\d+|\bNr\.?\s?\d+|\bSatz\s?\d+|\b(?:Seite|page|S\.)\s?\d+/gi;

// What makes a figure a claim about the contract rather than sentence furniture: a
// currency, a percentage, a quantity, or a month. A bare number is usually prose —
// a multiplier in a calculation the sentence is already showing, an ordinal, the day
// a notice period falls on — and tracing those produced far more noise than signal.
const MONEY = "%|€|EUR|Euro";
const QUANTITY = "Monate?n?|Wochen?|Tage?n?|Jahre?n?|Stunden?|months?|weeks?|days?|years?|hours?";
const MONTH =
  "Januar|Februar|März|M[aä]rz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|" +
  "January|February|March|May|June|July|October|December";
const UNIT = `${MONEY}|${QUANTITY}|${MONTH}`;
const SHOWN = new RegExp(String.raw`(?:€\s?)?\d+(?:[.,]\d+)*(?:\s?(?:${UNIT}))?`, "gi");
const IS_MONEY = new RegExp(`(?:${MONEY})`, "i");
const IS_QUANTITY = new RegExp(`(?:${QUANTITY})`, "i");
const IS_DATE = /^\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4}$/;
const UNIT_RE = new RegExp(`(?:${UNIT})`, "i");

const shortRef = (ref: string) => ref.split("·")[0].trim();

type Candidate = { value: number; label: string };

/** Every figure the contract itself states, with the clause that states it. */
function candidates(analysis: Analysis): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const add = (value: number, label: string) => {
    const k = `${value}|${label}`;
    if (!Number.isFinite(value) || value <= 0 || seen.has(k)) return;
    seen.add(k);
    out.push({ value, label });
  };
  // Dates are dropped here even though they are facts: the day and month of a start
  // date are calendar positions, not quantities, and letting them in produced
  // arithmetic like "20 days = 1 % × 2.026" off the year of the start date.
  for (const c of analysis.clauses) {
    for (const f of facts(withoutDates(c.quote.replace(CITATION, " ")))) add(Number(f), shortRef(c.ref));
  }
  // The monthly and yearly totals are what percentage clauses are measured against,
  // and the yearly one is usually nowhere on the page.
  const money = analysis.money;
  const refOf = (id?: string) => {
    const c = id ? analysis.clauses.find((x) => x.id === id) : undefined;
    return c ? shortRef(c.ref) : "";
  };
  if (money.monthly != null) add(money.monthly, refOf(money.monthlyClauseId));
  if (money.yearly != null) add(money.yearly, refOf(money.yearlyClauseId ?? money.monthlyClauseId));
  return out;
}

const near = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.5, b * 0.005);

const group = (n: number, lang: string) =>
  new Intl.NumberFormat(lang === "de" ? "de-DE" : "en-US", { maximumFractionDigits: 2 }).format(n);

/** Numbers written as a percentage somewhere in the contract, e.g. the 8 in "8 %". */
function percents(analysis: Analysis): number[] {
  const out = new Set<number>();
  for (const c of analysis.clauses) {
    for (const m of c.quote.matchAll(/(\d+(?:[.,]\d+)*)\s*%/g)) {
      const n = Number(canonical(m[1]));
      if (n >= 1) out.add(n);
    }
  }
  return [...out];
}

/**
 * Name the arithmetic behind a figure that is not written in the contract, using
 * only figures that are. Kept deliberately shallow — the point is a derivation the
 * reader can check in their head, not reverse-engineering an arbitrary number into
 * whatever sum happens to land on it.
 *
 * Which is what the first version did: with every figure in the document eligible to
 * be a percentage it "explained" 20 days of statutory holiday as 1 % of 2,026, the
 * year out of the start date. A percentage now has to be written as one somewhere in
 * the contract, and the base it applies to has to be larger than the result.
 */
function derive(
  target: number,
  cands: Candidate[],
  pcts: number[],
  lang: string,
): { expr: string; ref: string } | null {
  for (const p of pcts) {
    for (const base of cands) {
      if (base.value <= target) continue;
      if (near((p / 100) * base.value, target)) {
        return { expr: `${group(p, lang)} % × ${group(base.value, lang)}`, ref: base.label };
      }
    }
  }
  for (const base of cands) {
    if (base.value <= 1) continue; // "12 × 1" explains nothing
    for (const k of [12, 52, 365]) {
      if (near(base.value * k, target)) return { expr: `${k} × ${group(base.value, lang)}`, ref: base.label };
      // An annual total is usually a multiple plus one extra payment — a yearly
      // bonus, a thirteenth month — and that is the headline figure of an
      // employment contract, so it is worth the one extra term.
      for (const extra of cands) {
        if (extra === base || extra.value <= 1) continue;
        if (near(base.value * k + extra.value, target)) {
          return {
            expr: `${k} × ${group(base.value, lang)} + ${group(extra.value, lang)}`,
            ref: base.label,
          };
        }
      }
    }
  }
  // Last, because it explains least: a plain sum names two figures without saying
  // where either of them came from, and "12 × 3.440 + 1.200" is worth more to the
  // reader than "41.280 + 1.200".
  // A total the contract never prints but states both halves of — cold rent plus the
  // operating-cost advance is the classic one, and the model quite reasonably adds
  // them up. Exact only: with a tolerance, pairs of unrelated figures start landing
  // on the target by luck.
  for (const a of cands) {
    if (a.value <= 1) continue;
    for (const b of cands) {
      if (b === a || b.value <= 1 || a.value + b.value !== target) continue;
      if (a.value >= target || b.value >= target) continue;
      return { expr: `${group(a.value, lang)} + ${group(b.value, lang)}`, ref: a.label };
    }
  }
  return null;
}

/** Trace every figure in `text` back to the contract, in the order they are written. */
export function figureSources(analysis: Analysis, clause: Clause, text: string): FigureSource[] {
  const own = facts(clause.quote.replace(CITATION, " "));
  const others = analysis.clauses
    .filter((c) => c.id !== clause.id)
    .map((c) => ({ ref: shortRef(c.ref), f: facts(c.quote.replace(CITATION, " ")) }));
  const cands = candidates(analysis);
  const pcts = percents(analysis);

  const out: FigureSource[] = [];
  const seen = new Set<string>();
  const scan = text.replace(CITATION, " ");
  for (const m of scan.matchAll(SHOWN)) {
    const shown = m[0].trim();
    const key = canonical(shown.replace(/[^\d.,]/g, ""));
    if (!key) continue;
    const dated = IS_DATE.test(shown);
    // A date is compared by its parts. facts() splits "01.03.2027" into 1, 3 and 2027
    // while canonical() would read it as the figure 103.2027, so a start date printed
    // in the contract was being reported as not in the contract at all.
    const keys = dated ? facts(shown) : new Set([key]);
    const id = dated ? [...keys].sort().join("-") : key;
    const holds = (set: Set<string>) => keys.size > 0 && [...keys].every((k) => set.has(k));
    if (seen.has(id)) continue;
    // Traced only if it carries a unit, is a date, or is a figure this clause really
    // does state. A bare number that is none of those is part of the sentence, not a
    // claim about the document.
    if (!dated && !UNIT_RE.test(shown) && !holds(own)) continue;
    seen.add(id);

    if (holds(own)) {
      out.push({ shown, key: id, kind: "clause", ref: shortRef(clause.ref) });
      continue;
    }
    const other = others.find((o) => holds(o.f));
    if (other) {
      out.push({ shown, key: id, kind: "other", ref: other.ref });
      continue;
    }
    // Arithmetic is only meaningful for amounts and quantities. Working out a date
    // or a bare count as a product of other figures is how "20 days of statutory
    // holiday" became "1 % of 2,026".
    const d =
      !dated && (IS_MONEY.test(shown) || IS_QUANTITY.test(shown))
        ? derive(Number(key), cands, pcts, analysis.lang)
        : null;
    out.push(d ? { shown, key: id, kind: "derived", ...d } : { shown, key: id, kind: "context" });
  }
  return out;
}
