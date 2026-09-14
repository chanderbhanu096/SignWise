import type { MoneyItemSchema } from "./types";
import type { z } from "zod";

type MoneyItem = z.infer<typeof MoneyItemSchema>;

export const CHART_MONTHS = 12;

/** Which bar a one-off payment is drawn on, and what the caption may claim. */
export type ChartPlan = {
  /** Per-month extra on top of the recurring amount; CHART_MONTHS entries. */
  bump: number[];
  /**
   * The caption the chart has earned. "deposit" names the month it actually
   * falls in, because a deposit is not always due at the start.
   */
  note: { kind: "bonus" } | { kind: "deposit"; month: number } | null;
  /**
   * Payments with an amount but no stated month. These are NOT drawn: putting
   * them on a bar would be a claim about timing the contract never made. They
   * are disclosed under the chart instead, and stay in the list above it.
   */
  unplaced: MoneyItem[];
};

export function chartPlan(items: MoneyItem[], income: boolean): ChartPlan {
  const withAmount = items.filter((it) => it.amount != null);
  const placed = withAmount
    .filter((it) => it.timingMonth != null)
    .map((it) => ({ it, month: it.timingMonth as number }))
    .filter((o) => o.month >= 0 && o.month < CHART_MONTHS);

  const bump = Array(CHART_MONTHS).fill(0);
  for (const o of placed) bump[o.month] += o.it.amount as number;

  const deposit = placed.find((o) => o.it.kind === "deposit");
  const note: ChartPlan["note"] = income && placed.length
    ? { kind: "bonus" }
    : deposit
      ? { kind: "deposit", month: deposit.month }
      : null;

  return { bump, note, unplaced: withAmount.filter((it) => it.timingMonth == null) };
}
