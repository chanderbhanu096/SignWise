import { DEPTHS, type Depth } from "./types";

export type DepthSet = { simple: string; standard: string; detailed: string };

// The explanation-level control. Each level is a COMPLETE explanation written for
// that level — not a sentence bolted onto the one below it. Asking for more detail
// gives you the same clause explained again, at more length and more precisely.
//
// What must never happen is that asking for more detail takes information away: on
// a real contract 6 of 15 clauses lost a fact or a qualifier going from "standard"
// to "detailed". Levels written as increments made that impossible but read like
// three sentences glued together, so the guarantee moved here instead. Whatever the
// model returns, the level being shown is checked against the ones below it, and a
// figure that only a lower level carries is put back by keeping that level's text.
// The check is on figures because a figure is the thing a reader notices missing —
// and it means a model that still returns increments renders exactly as before.

// "ein/eine/einen" are left out on purpose: in German they are the indefinite
// article far more often than the number, and reading "eine Seite" as the figure 1
// made a level look like a restatement of one that mentioned a 1. English "one" is
// left out for the same reason ("one side"). Missing a figure only costs precision
// in the harmless direction: at worst a sentence repeats, never a fact disappears.
export const NUMERALS: Record<string, string> = {
  zwei: "2", drei: "3", vier: "4", fünf: "5", sechs: "6",
  sieben: "7", acht: "8", neun: "9", zehn: "10", elf: "11", zwölf: "12",
  two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7",
  eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12",
};

// Ordinals carry figures too, and contracts are full of them — "bis zum dritten
// Werktag", "zum Ablauf des zweiten Monats". Without these the explanation of a
// notice-period clause shared no figure at all with the clause it explains.
const ORDINALS: Record<string, string> = {
  erst: "1", zweit: "2", dritt: "3", viert: "4", fünft: "5", sechst: "6",
  siebt: "7", siebent: "7", acht: "8", neunt: "9", zehnt: "10", elft: "11", zwölft: "12",
  first: "1", second: "2", third: "3", fourth: "4", fifth: "5", sixth: "6",
  seventh: "7", eighth: "8", ninth: "9", tenth: "10", eleventh: "11", twelfth: "12",
};

// German writes numbers into compound words — "sechsmonatige Probezeit",
// "Dreimonatsfrist", "zweiwöchige Kündigungsfrist". That is one token, so the numeral
// inside it was invisible: an explanation saying "sechs Monate" about a clause that
// says "sechsmonatig" shared no figure with it, and the provenance panel reported the
// figure as not stated in the contract. Only a numeral followed by a time or quantity
// stem counts — which is what keeps "zweifellos" from reading as a 2, "Achtung" as an
// 8 and "vierteljährlich" as a 4.
const COMPOUND = new RegExp(`^(${Object.keys(NUMERALS).join("|")})(?:monat|woch|wöch|jahr|jähr|tag|täg|stund|stünd|zimmer|fach)`);

// A date is not a number. "01.11.2026" was read as the figure 1112026, because the
// dots were stripped as grouping separators — so a contract's start date could not
// be matched against anything and counted as a fact of its own on every comparison.
// Splitting it into day, month and year is also what lets a German "01.11.2026" and
// an English "1 November 2026" agree on the facts they state.
const DATE = /\b(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})\b|\b(\d{4})-(\d{2})-(\d{2})\b/g;

/** The text with dates taken out, for callers that want quantities and not calendar parts. */
export const withoutDates = (text: string) => text.replace(DATE, " ");
const NUMBER = /\d+(?:[.,]\d+)*/g;

/**
 * One figure, normalised. German writes 1.240,00 and English writes 1,240.00, so
 * what a separator means depends on what follows it and not on which character it
 * is: exactly three digits and nothing after them is a grouping separator, anything
 * else is a decimal point. Reading every comma as a decimal point — the previous
 * behaviour — turned the English "€3,000" into the figure 3 and "€1,240" into 1.24,
 * which is why every figure comparison in English was being made on nonsense.
 */
export function canonical(raw: string): string | null {
  const s = raw.replace(/\s/g, "");
  if (!/\d/.test(s)) return null;
  const last = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
  let whole = s;
  let frac = "";
  if (last >= 0 && !/^\d{3}$/.test(s.slice(last + 1))) {
    whole = s.slice(0, last);
    frac = s.slice(last + 1);
  }
  const digits = whole.replace(/[.,]/g, "");
  if (!digits) return null;
  const int = digits.replace(/^0+(?=\d)/, "");
  const f = frac.replace(/\D/g, "").replace(/0+$/, "");
  return f ? `${int}.${f}` : int;
}

/** Every figure a reader would notice going missing: amounts, percentages, counts, dates. */
export function facts(text: string): Set<string> {
  const out = new Set<string>();
  const rest = text.replace(DATE, (_m, d, mo, y, iy, im, id) => {
    for (const part of d ? [d, mo, y] : [id, im, iy]) if (part) out.add(String(Number(part)));
    return " ";
  });
  for (const m of rest.matchAll(NUMBER)) {
    const n = canonical(m[0]);
    if (n) out.add(n);
  }
  for (const m of text.toLowerCase().matchAll(/[a-zä-ÿ]+/g)) {
    const w = m[0];
    const n = NUMERALS[w] ?? ORDINALS[w.replace(/(en|em|er|es|e)$/, "")] ?? NUMERALS[w.match(COMPOUND)?.[1] ?? ""];
    if (n) out.add(n);
  }
  return out;
}

const order = (d: Depth) => DEPTHS.indexOf(d);

/**
 * The text to show for `depth`: that level's own explanation, plus any lower level
 * that carries a figure this one does not — which is both the repair for a model
 * that dropped something and the reason levels written as increments still read
 * correctly.
 */
export function depthText(set: DepthSet, depth: Depth): string {
  const ladder = DEPTHS.slice(0, order(depth) + 1)
    .map((k) => (set[k] ?? "").trim())
    .filter(Boolean);
  if (ladder.length === 0) return "";

  const chosen = ladder[ladder.length - 1];
  const have = facts(chosen);
  const kept: string[] = [];
  for (const lower of ladder.slice(0, -1)) {
    const f = facts(lower);
    if (![...f].some((x) => !have.has(x))) continue; // adds nothing this level lacks
    kept.push(lower);
    for (const x of f) have.add(x);
  }
  const parts = [...kept, chosen];
  // Only the parts that are being run together need a full stop added; the last one
  // keeps whatever punctuation it was written with, question marks included.
  return parts.map((s, i) => (i === parts.length - 1 ? s : `${s.replace(/[.;:,\s]+$/, "")}.`)).join(" ");
}
