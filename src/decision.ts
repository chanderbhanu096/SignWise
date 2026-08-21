import type { Analysis, DecisionSummary, Lang } from "./types";
import { euro } from "./format";
import { getContractCategory } from "./contract";

// The "Before you sign" brief. Prefer what the model produced; otherwise synthesize
// one from the rest of the analysis so any contract gets a useful final screen.
export function getDecisionSummary(analysis: Analysis): DecisionSummary {
  return analysis.decisionSummary ?? derive(analysis, analysis.lang);
}

const de = (l: Lang) => l === "de";

function derive(a: Analysis, lang: Lang): DecisionSummary {
  const income = getContractCategory(a) === "income";
  const cur = a.money.currency;
  const fmt = (n: number) => euro(n, lang, cur);
  const findingClause = (pred: (tags: string[]) => boolean) =>
    a.findings.map((id) => a.clauses.find((c) => c.id === id)).find((c) => c && pred(c.tags))?.id ?? a.findings[0];
  const moneyClause = findingClause((t) => t.includes("money"));
  const deadlineClause = findingClause((t) => t.includes("deadline"));
  const glanceVal = (re: RegExp) => a.glance.find((g) => re.test(g.key))?.value;

  // 1. Commitments — the essential things the contract binds you to.
  const commitments: DecisionSummary["commitments"] = [];
  if (a.money.monthly != null) {
    commitments.push({
      title: income ? (de(lang) ? "Brutto pro Monat" : "Gross per month") : de(lang) ? "Jeden Monat" : "Every month",
      value: fmt(a.money.monthly),
      explanation: income
        ? de(lang) ? "Ihr vertragliches Grundgehalt." : "Your contractual base salary."
        : de(lang) ? "Eine regelmäßige Zahlung laut Vertrag." : "A recurring payment under the contract.",
      clauseId: moneyClause,
    });
  }
  for (const it of a.money.oneTime) {
    if (it.amount == null) continue;
    commitments.push({
      title: it.label,
      value: fmt(it.amount),
      explanation: income
        ? de(lang) ? "Eine zusätzliche Zahlung." : "An additional payment."
        : de(lang) ? "Einmalig fällig." : "Due once.",
      clauseId: moneyClause,
    });
  }
  const duration = glanceVal(/Laufzeit|Duration|Dauer/i);
  if (duration) {
    commitments.push({
      title: de(lang) ? "Laufzeit" : "Duration",
      value: duration,
      explanation: de(lang) ? "So lange sind Sie gebunden." : "How long you are bound.",
      clauseId: deadlineClause,
    });
  }
  const notice = glanceVal(/Kündigung|Notice|Frist/i);
  if (notice) {
    commitments.push({
      title: de(lang) ? "Kündigungsfrist" : "Notice period",
      value: notice,
      explanation: de(lang) ? "So beenden Sie den Vertrag." : "How you end the contract.",
      clauseId: deadlineClause,
    });
  }

  // 2. Review items — rank the non-standard findings that most deserve a second look.
  const score = (tags: string[], check: boolean) =>
    (check ? 3 : 0) + (tags.includes("money") ? 2 : 0) + (tags.includes("risk") ? 2 : 0) + (tags.includes("deadline") ? 2 : 0) + (tags.includes("responsibility") ? 1 : 0);
  const reason = (tags: string[]) =>
    tags.includes("money") || tags.includes("risk")
      ? de(lang) ? "Kann zusätzliche Kosten oder ein Risiko bedeuten." : "Could mean extra costs or a risk."
      : tags.includes("deadline")
        ? de(lang) ? "Betrifft Fristen oder Kündigung." : "Affects deadlines or cancellation."
        : de(lang) ? "Eine wichtige Pflicht." : "An important obligation.";
  const reviewItems: DecisionSummary["reviewItems"] = a.findings
    .map((id) => a.clauses.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => !!c && c.level !== "standard")
    .sort((x, y) => score(y.tags, y.level === "check") - score(x.tags, x.level === "check"))
    .slice(0, 3)
    .map((c) => ({ title: c.title, explanation: c.means, reason: reason(c.tags), clauseId: c.id }));

  // 3. Clarification questions — only where the contract genuinely leaves something open.
  const clarificationQuestions: DecisionSummary["clarificationQuestions"] = [];
  for (const v of a.money.variable) {
    clarificationQuestions.push({
      question: de(lang) ? `Wie hoch sind die ${v.label}?` : `How much are the ${v.label}?`,
      reason: v.note,
    });
  }
  for (const it of a.money.oneTime) {
    if (it.amount == null) {
      clarificationQuestions.push({
        question: de(lang) ? `Wie hoch ist ${it.label}?` : `How much is the ${it.label}?`,
        reason: de(lang) ? "Im Vertrag nicht beziffert." : "Not quantified in the contract.",
        clauseId: moneyClause,
      });
    }
  }

  return { commitments, reviewItems, clarificationQuestions };
}
