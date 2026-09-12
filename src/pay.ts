import type { Analysis, Clause } from "./types";
import { canonical } from "./depth";

// Reading a wage out of the contract's own words.
//
// Both parsers live here because two very different callers need the same two
// figures: the statutory benchmarks in lawcheck.ts (is this below the minimum
// wage? above the working-student limit?) and the money panel, which has no
// headline amount at all when a contract is paid by the hour. A contract that
// says "16,50 EUR je Arbeitsstunde, 20 Stunden pro Woche" states a monthly
// income as plainly as one that writes the month's figure out — it just makes
// the reader do the multiplication, and doing arithmetic for the reader is the
// whole point of this app.

/** A per-hour rate, which is what § 1 MiLoG measures. "16,50 EUR je Arbeitsstunde". */
export function hourlyWage(text: string): number | null {
  const m = text.match(/((?:EUR\b|Euro\b|€)\s*)?(\d+(?:[.,]\d+)*)\s*(?:EUR|Euro|€)?\s*(?:brutto\s*|gross\s*)?(?:je|pro|per|\/)\s*(?:(?:Arbeits)?stunde|hour)|\b(?:stundenlohn|hourly rate)[^\d]{0,20}(\d+(?:[.,]\d+)*)/i);
  if (!m) return null;
  const value = canonical(m[2] ?? m[3] ?? "");
  return value == null ? null : Number(value);
}

const WEEKLY = /(\d{1,2})(?:[.,]\d+)?\s*(?:(?:Arbeits)?stunden?|hours?)\s*(?:pro\s+Woche|je\s+Woche|wöchentlich|\/\s*Woche|per week|a week|weekly)/gi;

/**
 * Every weekly-hours figure the clause states, lowest first.
 *
 * A working-time clause states the normal week and then what may be demanded on
 * top — "20 Stunden pro Woche ... verpflichtet sich, bis zu 28 Stunden pro Woche
 * zu arbeiten" — and the two figures answer two different questions. The upper
 * one decides whether the studies stay the main thing (§ 6 SGB V); the lower one
 * is what the reader will normally be paid for. Handing back one number would
 * have to pick a question, so it hands back both.
 */
export function weeklyHoursAll(text: string): number[] {
  const all = [...text.matchAll(WEEKLY)].map((m) => parseInt(m[1], 10));
  return [...new Set(all)].sort((a, b) => a - b);
}

/** The most hours a week the clause can require. */
export function weeklyHours(text: string): number | null {
  const all = weeklyHoursAll(text);
  return all.length ? all[all.length - 1] : null;
}

// 52 weeks over 12 months. Not 4: a "4 weeks a month" estimate is short by a
// month's pay over a year, which is exactly the size of error that makes a
// derived figure worse than no figure.
export const WEEKS_PER_MONTH = 52 / 12;

export type DerivedPay = {
  monthly: number; // at the regular week
  monthlyMax: number | null; // at the highest week the contract allows, when it names one
  hourly: number;
  hours: number;
  hoursMax: number | null;
  clauseId: string; // the clause stating the rate — the reader can check the arithmetic
  hoursClauseId: string;
};

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * A monthly figure for a contract that states none, from a rate and a week.
 *
 * Returns null unless the contract states both, in its own words: this reads
 * clause quotes, never the model's prose, so the arithmetic is over figures the
 * reader can find in their document. A single hourly rate with no stated week is
 * not enough — hours are the variable that decides the answer, and guessing a
 * full-time week for a working student would overstate their income by half.
 */
export function derivePay(clauses: Clause[]): DerivedPay | null {
  let rate: { value: number; clauseId: string } | null = null;
  let week: { all: number[]; clauseId: string } | null = null;
  for (const c of clauses) {
    if (!rate) {
      const h = hourlyWage(c.quote);
      if (h != null && h > 0) rate = { value: h, clauseId: c.id };
    }
    if (!week) {
      const all = weeklyHoursAll(c.quote);
      if (all.length) week = { all, clauseId: c.id };
    }
  }
  if (!rate || !week) return null;
  const hours = week.all[0];
  const hoursMax = week.all.length > 1 ? week.all[week.all.length - 1] : null;
  return {
    monthly: round(rate.value * hours * WEEKS_PER_MONTH),
    monthlyMax: hoursMax == null ? null : round(rate.value * hoursMax * WEEKS_PER_MONTH),
    hourly: rate.value,
    hours,
    hoursMax,
    clauseId: rate.clauseId,
    hoursClauseId: week.clauseId,
  };
}

/** Only worth deriving when the contract itself gives no monthly or yearly figure. */
export function derivedPayFor(analysis: Analysis): DerivedPay | null {
  const { money } = analysis;
  if (money.monthly != null || money.yearly != null) return null;
  return derivePay(analysis.clauses);
}
