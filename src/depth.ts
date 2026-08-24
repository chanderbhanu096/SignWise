import type { Depth } from "./types";

export type DepthSet = { simple: string; standard: string; detailed: string };

// The explanation-level control writes three versions of the same clause. Asking for
// MORE detail must never take information away — but on a real contract 6 of 15
// clauses lost a fact or a qualifier going from "standard" to "detailed", because
// the model was rewriting the sentence each time rather than adding to it.
//
// The fix is structural, not a prompt request: the levels are INCREMENTS. "simple"
// is a complete sentence, "standard" is what you add for the standard level, and
// "detailed" is what you add on top of that. Composing them upward makes the
// cumulative property impossible to violate.
//
// A model that ignores that and returns three self-contained rewrites anyway (and
// every already-cached analysis) still has to render correctly, so each part is
// checked before it is appended: one that restates what we already have replaces it
// instead. That check is what makes this safe to ship against a model's output.

// "ein/eine/einen" are left out on purpose: in German they are the indefinite
// article far more often than the number, and reading "eine Seite" as the figure 1
// made a level look like a restatement of one that mentioned a 1. English "one" is
// left out for the same reason ("one side"). Missing a figure only makes the check
// append instead of replace, which is the harmless direction: at worst a sentence
// repeats, never a fact disappears.
const NUMERALS: Record<string, string> = {
  zwei: "2", drei: "3", vier: "4", fünf: "5", sechs: "6",
  sieben: "7", acht: "8", neun: "9", zehn: "10", elf: "11", zwölf: "12",
  two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7",
  eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12",
};

// A "fact" is a figure the reader would notice going missing: an amount, a
// percentage, a date, a count. Grouping separators are stripped so "3.000" and
// "3000" and "3.000,00" all compare equal.
export function facts(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(/\d[\d.,\s]*\d|\d/g)) {
    const n = m[0].replace(/[\s.]/g, "").replace(/,0+$/, "").replace(/,/g, ".");
    if (n) out.add(n.replace(/^0+(?=\d)/, ""));
  }
  for (const m of text.toLowerCase().matchAll(/[a-zä-ÿ]+/g)) {
    const n = NUMERALS[m[0]];
    if (n) out.add(n);
  }
  return out;
}

const STOP = new Set(
  ("der die das den dem des ein eine einen einem einer eines und oder aber wenn dass sie ihr ihre ihren ihrem " +
    "ihres es ist sind war wird werden wurde soll sollen kann können darf dürfen muss müssen nicht auch nur " +
    "noch schon sich für von zu mit im in am an auf bei aus nach vor über unter bis als wie so dann laut " +
    "the a an and or but if that you your it is are was were will would can may must not also only still " +
    "for from to with in at on by out after before over under until than as").split(" "),
);

function words(text: string): Set<string> {
  return new Set(
    [...text.toLowerCase().matchAll(/[a-zä-ÿ]{3,}/g)].map((m) => m[0]).filter((w) => !STOP.has(w)),
  );
}

function overlap(part: Set<string>, whole: Set<string>): number {
  if (part.size === 0) return 0;
  let hit = 0;
  for (const x of part) if (whole.has(x)) hit++;
  return hit / part.size;
}

// True when `part` retells what `acc` already said rather than adding to it.
function restates(part: string, acc: string): boolean {
  const pf = facts(part);
  // Figures decide it when there are any: a part that brings back the numbers
  // already on screen is a rewrite, and one that brings new numbers is an addition.
  // The wording check must not get a second vote here — an increment naturally
  // reuses some of the earlier vocabulary ("Betrag", "zahlen") without repeating
  // anything, and letting words override the figures dropped the amount itself.
  if (pf.size > 0) return overlap(pf, facts(acc)) >= 0.5;
  // Nothing to count: fall back to how much of the earlier wording it repeats.
  return overlap(words(acc), words(part)) >= 0.5;
}

/** The text to show for `depth`, composed from the levels at or below it. */
export function depthText(set: DepthSet, depth: Depth): string {
  const wanted: string[] = [set.simple];
  if (depth !== "simple") wanted.push(set.standard);
  if (depth === "detailed") wanted.push(set.detailed);

  let acc = "";
  for (const raw of wanted) {
    const part = (raw ?? "").trim();
    if (!part) continue;
    if (!acc) {
      acc = part;
    } else if (restates(part, acc)) {
      acc = part; // a self-contained rewrite supersedes what it restates
    } else {
      acc = `${acc.replace(/[.;:,\s]+$/, "")}. ${part}`;
    }
  }
  return acc;
}
