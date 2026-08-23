import type { Analysis, Clause, DecisionSummary, Lang, Tag } from "./types";
import { euro } from "./format";
import { getContractCategory } from "./contract";

type UnderstandingQuestion = NonNullable<DecisionSummary["understandingQuestions"]>[number];
export type DecisionBrief = Omit<DecisionSummary, "understandingQuestions"> & {
  understandingQuestions: UnderstandingQuestion[];
};

// The "Before you sign" brief. Model-produced content stays contract-specific;
// this module normalises it for a compact, source-linked final screen and derives
// a useful fallback when an older analysis does not contain the brief.
export function getDecisionSummary(analysis: Analysis): DecisionBrief {
  const fallback = derive(analysis, analysis.lang);
  return normalise(analysis, analysis.decisionSummary ?? fallback, fallback, !!analysis.decisionSummary);
}

const de = (lang: Lang) => lang === "de";
const haystack = (clause: Clause) => `${clause.title} ${clause.ref} ${clause.quote} ${clause.means}`.toLowerCase();
const uniqueBy = <T>(items: T[], key: (item: T) => string) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const value = key(item).trim().toLowerCase();
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

function commitmentPriority(item: DecisionSummary["commitments"][number]): number {
  const text = `${item.title} ${item.value ?? ""} ${item.explanation}`.toLowerCase();
  if (/salary|gehalt|rent|miete|premium|prämie|repayment|rate\b|monthly|monat|per year|pro jahr|annual payment|jährliche zahlung|compensation|vergütung/.test(text)) return 100;
  if (/deposit|kaution|deductible|selbstbehalt|one.?time|einmal/.test(text)) return 95;
  if (/notice|kündig|cancel|exit|beenden/.test(text)) return 90;
  if (/probation|probezeit|duration|laufzeit|minimum term|mindestlaufzeit|renewal|verlänger/.test(text)) return 80;
  if (/vacation|holiday days|urlaub|coverage|deckung|working hours|arbeitszeit/.test(text)) return 70;
  return 50;
}

function reviewPriority(item: DecisionSummary["reviewItems"][number], clause: Clause): number {
  const text = `${item.title} ${item.explanation} ${item.reason} ${haystack(clause)}`;
  let score = clause.level === "important" ? 30 : clause.level === "check" ? 20 : 0;
  if (clause.tags.includes("money")) score += 70;
  if (clause.tags.includes("deadline")) score += 60;
  if (clause.tags.includes("risk")) score += 55;
  if (clause.tags.includes("responsibility")) score += 25;
  if (/penalt|vertragsstrafe|fee|gebühr|additional payment|zusätzliche zahlung|price increase|mieterhöhung|preiserhöhung|deductible|selbstbehalt/i.test(text)) score += 35;
  if (/notice|kündig|cancel|renew|verlänger|minimum term|mindestlaufzeit/i.test(text)) score += 30;
  if (/restrict|ausschluss|exclusion|overtime|überstunden|long.?term|langfrist/i.test(text)) score += 20;
  return score;
}

function normalise(
  analysis: Analysis,
  brief: DecisionSummary,
  fallback: DecisionBrief,
  modelProvided: boolean,
): DecisionBrief {
  const clauses = new Map(analysis.clauses.map((clause) => [clause.id, clause]));
  const commitments = uniqueBy(
    [...brief.commitments, ...fallback.commitments].filter((item) => clauses.has(item.clauseId)),
    // Keep distinct concepts that legitimately share a clause (an indefinite
    // duration and its notice period), and drop the same concept twice.
    //
    // The discriminator has to be something the reader can see. It used to be
    // `commitmentPriority`, a keyword score — and the model's deposit card scored
    // 100 because its explanation contained "Monatsraten" (which matches /monat/)
    // while the derived one scored 95, so two cards both titled "Kaution", both
    // showing 3.540 €, both pointing at § 5, sat side by side. Two cards with the
    // same title on the same clause are a duplicate however they were scored.
    (item) => `${item.clauseId}:${item.title}`,
  )
    .map((item, index) => ({ item, index }))
    .sort((a, b) => commitmentPriority(b.item) - commitmentPriority(a.item) || a.index - b.index)
    .slice(0, 4)
    .map(({ item }) => item);

  const reviewCandidates = uniqueBy(
    [...brief.reviewItems, ...fallback.reviewItems].filter((item) => {
      const clause = clauses.get(item.clauseId);
      return clause?.level === "important" || clause?.level === "check";
    }),
    (item) => item.clauseId,
  );
  const reviewItems = (modelProvided
    ? reviewCandidates
    : reviewCandidates
        .map((item, index) => ({ item, index, clause: clauses.get(item.clauseId)! }))
        .sort((a, b) => reviewPriority(b.item, b.clause) - reviewPriority(a.item, a.clause) || a.index - b.index)
        .map(({ item }) => item)
  ).slice(0, 3);

  const understandingQuestions = uniqueBy(
    [...(brief.understandingQuestions ?? []), ...fallback.understandingQuestions].filter((item) => clauses.has(item.clauseId)),
    (item) => item.question,
  ).slice(0, 5);

  const clarificationQuestions = uniqueBy(
    [...brief.clarificationQuestions, ...fallback.clarificationQuestions].map((item) =>
      item.clauseId && !clauses.has(item.clauseId) ? { ...item, clauseId: undefined } : item,
    ),
    (item) => (item.clauseId ? `source:${item.clauseId}` : `question:${item.question}`),
  ).slice(0, 3);

  return { commitments, reviewItems, understandingQuestions, clarificationQuestions };
}

function derive(analysis: Analysis, lang: Lang): DecisionBrief {
  const category = getContractCategory(analysis);
  const income = category === "income";
  const currency = analysis.money.currency;
  const fmt = (amount: number) => euro(amount, lang, currency);
  const findingClauses = analysis.findings
    .map((id) => analysis.clauses.find((clause) => clause.id === id))
    .filter((clause): clause is Clause => !!clause);
  const firstClause = findingClauses[0] ?? analysis.clauses[0];
  const taggedClause = (tag: Tag) => findingClauses.find((clause) => clause.tags.includes(tag)) ?? firstClause;
  const moneyClause = analysis.money.monthlyClauseId
    ? analysis.clauses.find((clause) => clause.id === analysis.money.monthlyClauseId)
    : taggedClause("money");
  const deadlineClause = taggedClause("deadline");
  const glanceValue = (pattern: RegExp) => analysis.glance.find((item) => pattern.test(item.key));

  const clauseForText = (text: string): Clause | undefined => {
    const stopWords = new Set(["page", "seite", "section", "absatz", "month", "monat", "year", "jahr"]);
    const tokens = text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .split(" ")
      .filter((token) => token.length >= 4 && !stopWords.has(token));
    const matches = analysis.clauses.filter((clause) => tokens.some((token) => haystack(clause).includes(token)));
    return matches.length === 1 ? matches[0] : undefined;
  };

  // 1. The essential terms this contract commits the user to.
  const commitments: DecisionSummary["commitments"] = [];
  const addCommitment = (item: DecisionSummary["commitments"][number] | null) => {
    if (item?.clauseId) commitments.push(item);
  };

  if (analysis.money.monthly != null && moneyClause) {
    addCommitment({
      title: income ? (de(lang) ? "Brutto pro Monat" : "Gross per month") : de(lang) ? "Jeden Monat" : "Every month",
      value: fmt(analysis.money.monthly),
      explanation: income
        ? de(lang)
          ? "Ihr vertragliches Grundgehalt."
          : "Your contractual base salary."
        : de(lang)
          ? "Eine regelmäßige Zahlung laut Vertrag."
          : "A recurring payment under the contract.",
      clauseId: moneyClause.id,
    });
  }

  if (analysis.money.monthly == null && analysis.money.yearly != null) {
    const yearlySource = analysis.money.yearlyClauseId
      ? analysis.clauses.find((clause) => clause.id === analysis.money.yearlyClauseId)
      : moneyClause;
    if (yearlySource) {
      addCommitment({
        title: income ? (de(lang) ? "Brutto pro Jahr" : "Gross per year") : de(lang) ? "Pro Jahr" : "Per year",
        value: fmt(analysis.money.yearly),
        explanation: income
          ? de(lang)
            ? "Ihre regelmäßige jährliche Vergütung laut Vertrag."
            : "Your recurring annual compensation under the contract."
          : de(lang)
            ? "Eine jährliche Zahlung laut Vertrag."
            : "An annual payment under the contract.",
        clauseId: yearlySource.id,
      });
    }
  }

  for (const item of analysis.money.oneTime) {
    if (item.amount == null) continue;
    const source = item.clauseId
      ? analysis.clauses.find((clause) => clause.id === item.clauseId)
      : clauseForText(item.label);
    if (!source) continue;
    addCommitment({
      title: item.label,
      value: fmt(item.amount) + (item.freq === "annual" ? (de(lang) ? " / Jahr" : " / year") : ""),
      explanation: income
        ? de(lang)
          ? "Eine zusätzliche vertragliche Zahlung."
          : "An additional contractual payment."
        : de(lang)
          ? "Ein zusätzlicher Betrag laut Vertrag."
          : "An additional amount under the contract.",
      clauseId: source.id,
    });
  }

  const duration = glanceValue(/Laufzeit|Duration|Dauer|Minimum term|Mindestlaufzeit/i);
  const durationSource = duration?.clauseId
    ? analysis.clauses.find((clause) => clause.id === duration.clauseId)
    : duration
      ? clauseForText(duration.key)
      : undefined;
  if (duration && durationSource) {
    addCommitment({
      title: de(lang) ? "Laufzeit" : "Duration",
      value: duration.value,
      explanation: de(lang) ? "So lange gilt die Vereinbarung." : "How long the agreement applies.",
      clauseId: durationSource.id,
    });
  }

  const notice = glanceValue(/Kündigung|Notice|Cancellation|Frist/i);
  const noticeSource = notice?.clauseId
    ? analysis.clauses.find((clause) => clause.id === notice.clauseId)
    : notice
      ? clauseForText(notice.key) ?? deadlineClause
      : undefined;
  if (notice && noticeSource) {
    addCommitment({
      title: de(lang) ? "Kündigungsfrist" : "Notice period",
      value: notice.value,
      explanation: de(lang) ? "So beenden Sie den Vertrag." : "How you end the agreement.",
      clauseId: noticeSource.id,
    });
  }

  // Add contract-type-specific facts when they are explicitly present at a glance.
  const extraPatterns = /Probezeit|Probation|Urlaub|Vacation|Holiday days|Arbeitszeit|Working hours|Verlängerung|Renewal|Selbstbehalt|Deductible|Deckung|Coverage/i;
  for (const fact of analysis.glance.filter((item) => extraPatterns.test(item.key))) {
    const source = fact.clauseId
      ? analysis.clauses.find((clause) => clause.id === fact.clauseId)
      : clauseForText(fact.key);
    if (!source) continue;
    addCommitment({
      title: fact.key,
      value: fact.value,
      explanation: de(lang) ? "So steht es in diesem Vertrag." : "As stated in this contract.",
      clauseId: source.id,
    });
  }

  // 2. Rank significant clauses by practical consequence; never pad with standard clauses.
  const reason = (clause: Clause) =>
    clause.tags.includes("money") || clause.tags.includes("risk")
      ? de(lang)
        ? "Kann zusätzliche finanzielle Folgen oder ein Risiko bedeuten."
        : "Could have additional financial consequences or create a risk."
      : clause.tags.includes("deadline")
        ? de(lang)
          ? "Betrifft Fristen, Laufzeit oder Kündigung."
          : "Affects deadlines, duration, or cancellation."
        : de(lang)
          ? "Betrifft eine wichtige vertragliche Pflicht."
          : "Affects an important contractual responsibility.";

  const reviewCandidate = (clause: Clause) => {
    const text = haystack(clause);
    const consequentialDeadline =
      clause.level === "important" &&
      clause.tags.includes("deadline") &&
      /notice|kündig|cancel|termination|renew|verlänger|minimum term|mindestlaufzeit|probation|probezeit|expiry|ablauf/.test(text);
    return (
      clause.level === "check" ||
      clause.tags.includes("risk") ||
      consequentialDeadline ||
      /penalt|vertragsstrafe|fee|gebühr|price increase|mieterhöhung|preiserhöhung|renew|verlänger|minimum term|mindestlaufzeit|restrict|ausschluss|exclusion|overtime|überstunden/.test(text)
    );
  };
  const reviewItems: DecisionSummary["reviewItems"] = analysis.clauses
    .filter(reviewCandidate)
    .map((clause) => ({ title: clause.title, explanation: clause.means, reason: reason(clause), clauseId: clause.id }));

  // 3. Questions answerable from the contract itself, with exact source links.
  const orderedCommitments = [...commitments].sort((a, b) => commitmentPriority(b) - commitmentPriority(a));
  const understandingQuestions: UnderstandingQuestion[] = [];
  for (const item of orderedCommitments) {
    const text = `${item.title} ${item.explanation}`;
    let question: string;
    if (/notice|kündig|cancel|exit|beenden/i.test(text)) {
      question = de(lang) ? "Wie und mit welcher Frist kann ich den Vertrag beenden?" : "How and with what notice can I end the agreement?";
    } else if (/duration|laufzeit|minimum term|mindestlaufzeit/i.test(text)) {
      question = de(lang) ? "Wie lange gilt oder bindet mich der Vertrag?" : "How long does the agreement apply or bind me?";
    } else if (/probation|probezeit/i.test(text)) {
      question = de(lang) ? "Was gilt während der Probezeit?" : "What applies during the probation period?";
    } else if (/vacation|holiday days|urlaub/i.test(text)) {
      question = de(lang) ? "Wie viel Urlaub steht mir laut Vertrag zu?" : "How much vacation does the contract provide?";
    } else if (/salary|gehalt|rent|miete|premium|prämie|monthly|monat/i.test(text)) {
      question = income
        ? de(lang)
          ? "Welche regelmäßige Vergütung nennt der Vertrag?"
          : "What recurring compensation does the contract state?"
        : de(lang)
          ? "Welche regelmäßige Zahlung nennt der Vertrag?"
          : "What recurring payment does the contract state?";
    } else {
      question = de(lang) ? `Was sagt der Vertrag zu „${item.title}“?` : `What does the contract say about “${item.title}”?`;
    }
    understandingQuestions.push({
      question,
      answer: [item.value, item.explanation].filter(Boolean).join(" — "),
      clauseId: item.clauseId,
    });
  }
  for (const clause of findingClauses) {
    if (understandingQuestions.length >= 5) break;
    if (understandingQuestions.some((item) => item.clauseId === clause.id)) continue;
    understandingQuestions.push({
      question: de(lang) ? `Was bedeutet „${clause.title}“ für mich?` : `What does “${clause.title}” mean for me?`,
      answer: clause.simple.standard,
      clauseId: clause.id,
    });
  }

  // 4. Questions for the other party only where the document leaves something open.
  const clarificationQuestions: DecisionSummary["clarificationQuestions"] = [];
  for (const variable of analysis.money.variable) {
    const source = variable.clauseId
      ? analysis.clauses.find((clause) => clause.id === variable.clauseId)
      : clauseForText(variable.label);
    clarificationQuestions.push({
      question: de(lang) ? `Wie hoch ist „${variable.label}“ genau?` : `What exactly is the amount for “${variable.label}”?`,
      reason: variable.note,
      clauseId: source?.id,
    });
  }
  for (const item of analysis.money.oneTime) {
    if (item.amount != null || !item.clauseId) continue;
    const source = analysis.clauses.find((clause) => clause.id === item.clauseId);
    if (!source) continue;
    clarificationQuestions.push({
      question: de(lang) ? `Wie hoch ist „${item.label}“?` : `How much is “${item.label}”?`,
      reason: de(lang) ? "Im Vertrag nicht beziffert." : "Not quantified in the contract.",
      clauseId: source?.id,
    });
  }

  return { commitments, reviewItems, understandingQuestions, clarificationQuestions };
}
