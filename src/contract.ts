import type { Analysis, ContractCategory, Lang } from "./types";
import { t, type FinancialCopy } from "./i18n";

// Contract-type awareness, kept out of the components. Detection is keyword-based
// on the (model-provided, localized) contractType string, with graceful fallbacks
// so an unfamiliar type never breaks the UI.

export type Subtype = "rental" | "employment" | "subscription" | "insurance" | "loan" | "generic";

const EMPLOYMENT = /arbeitsvertrag|arbeitsverh|anstellung|dienstvertrag|freier mitarbeiter|honorar|employ|freelance|service agreement/i;
const RENTAL = /miet|wohnraum|pacht|rental|tenan|lease/i;
const SUBSCRIPTION = /mobilfunk|handy|mobile|abo\b|abonnement|tarif|streaming|fitness|gym|internet|dsl|subscription/i;
const INSURANCE = /versicherung|insurance|policy|police\b/i;
const LOAN = /darlehen|kredit|finanzierung|loan|credit/i;

export function getContractSubtype(contractType: string): Subtype {
  const c = (contractType || "").toLowerCase();
  if (EMPLOYMENT.test(c)) return "employment";
  if (RENTAL.test(c)) return "rental";
  if (INSURANCE.test(c)) return "insurance";
  if (SUBSCRIPTION.test(c)) return "subscription";
  if (LOAN.test(c)) return "loan";
  return "generic";
}

// Prefer the model's explicit framing; else derive from the subtype; else stay
// neutral rather than wrongly calling money a "cost".
export function getContractCategory(analysis: Pick<Analysis, "contractType" | "money">): ContractCategory {
  const m = analysis.money;
  if (m?.category) return m.category;
  switch (m?.direction) {
    case "incoming":
      return "income";
    case "outgoing":
      return "expense";
    case "mixed":
      return "mixed";
    case "neutral":
      return "neutral";
  }
  switch (getContractSubtype(analysis.contractType)) {
    case "employment":
      return "income";
    case "rental":
    case "subscription":
    case "insurance":
    case "loan":
      return "expense";
    default:
      return "neutral";
  }
}

export function getFinancialCopy(category: ContractCategory, lang: Lang): FinancialCopy {
  return t(lang).financial[category];
}

export function getContractSuggestions(contractType: string, lang: Lang): string[] {
  const sets = t(lang).suggestions;
  return sets[getContractSubtype(contractType)] ?? sets.generic;
}

// Deterministic, allow-listed mapping from a German legal citation to its official
// text on gesetze-im-internet.de. Returns null when we cannot safely map it, so the
// UI shows the citation as plain text rather than a guessed (possibly wrong) link.
const LAW_SLUGS: Record<string, string> = {
  bgb: "bgb", // Bürgerliches Gesetzbuch
  hgb: "hgb",
  gewo: "gewo",
  tzbfg: "tzbfg", // Teilzeit- und Befristungsgesetz
  burlg: "burlg", // Bundesurlaubsgesetz
  kschg: "kschg", // Kündigungsschutzgesetz
  arbzg: "arbzg", // Arbeitszeitgesetz
  entgfg: "entgfg", // Entgeltfortzahlungsgesetz
  nachwg: "nachwg", // Nachweisgesetz
  tvg: "tvg",
  milog: "milog", // Mindestlohngesetz
  agg: "agg",
  betrvg: "betrvg",
  tkg: "tkg", // Telekommunikationsgesetz
  vvg: "vvg", // Versicherungsvertragsgesetz
  estg: "estg",
};

export function getOfficialLawUrl(law: string, section?: string): string | null {
  const slug = LAW_SLUGS[(law || "").trim().toLowerCase()];
  if (!slug || !section) return null;
  // First §-number (with optional letter suffix), e.g. "§§ 305 ff." -> 305, "§ 312g" -> 312g
  const m = section.match(/(\d+[a-z]?)/i);
  if (!m) return null;
  return `https://www.gesetze-im-internet.de/${slug}/__${m[1].toLowerCase()}.html`;
}

// What the financial section actually has to show. Without this the section
// rendered a full-height card reading "Not mentioned" over a dash whenever the
// contract stated no amounts — a large empty block where a number should be.
export function getMoneyState(money: Analysis["money"]): {
  headline: { amount: number; period: "monthly" | "yearly" } | null;
  hasDetail: boolean;
  hasAnything: boolean;
} {
  const headline =
    money.monthly != null
      ? ({ amount: money.monthly, period: "monthly" } as const)
      : money.yearly != null
        ? ({ amount: money.yearly, period: "yearly" } as const)
        : null;
  const hasDetail = money.oneTime.length > 0 || money.variable.length > 0;
  return { headline, hasDetail, hasAnything: !!headline || hasDetail };
}
