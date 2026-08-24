import type { Analysis, Clause, Lang } from "./types";
import { getContractSubtype, type Subtype } from "./contract";

// Statutory benchmarks.
//
// The model cites statutes but never says what they contain, so "§ 551 BGB" next to
// a 5.800 € deposit tells the reader nothing. This file closes that gap WITHOUT the
// model: each entry states a general rule from the statute itself, and a small
// deterministic test reads the contract's own figure. When the two diverge we put
// them side by side and stop there.
//
// The line we do not cross: SignWise never says a clause is void, unfair or
// unenforceable, and never applies the rule to this contract. Whether a provision
// holds is an assessment of an individual case — a Rechtsdienstleistung under § 2
// Abs. 1 RDG, which this tool is not licensed to give and does not attempt. Stating
// what a statute says in general is information; deciding what it means for your
// contract is a lawyer's job, and every hit says so.
//
// German statutes are amtliche Werke (§ 5 UrhG) and free of copyright, so the rules
// below paraphrase the official text closely and link to the official source.

export type LawHit = {
  id: string;
  clauseId: string;
  law: string; // "BGB"
  section: string; // "§ 551"
  cite: string; // "§ 551 Abs. 1 BGB"
  rule: string; // what the statute says, in general
  contract: string; // what this contract says — figures only, no verdict
};

type Ctx = { clause: Clause; analysis: Analysis; subtype: Subtype };

const de = (lang: Lang) => lang === "de";

// A sum of money, which means a figure carrying a currency marker. Requiring the
// marker is the point: without it the first match in "§ 5 Kaution. ... 5.800,00 EUR"
// is the section number, and the deposit ceiling would be compared against 5.
function amount(text: string): number | null {
  const m = text.match(/(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?\s*(?:EUR|€|Euro)\b/i);
  if (!m) return null;
  return parseFloat(m[1].replace(/\./g, "") + "." + (m[2] ?? "0"));
}

const MONTH_WORDS: Record<string, number> = {
  ein: 1, einem: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7,
  acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12,
};

/** Months in a phrase like "sechs Monate" / "6 Monaten". */
function months(text: string): number | null {
  const m = text.match(/(\d{1,2}|ein|einem|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf)\s+Monat/i);
  if (!m) return null;
  const raw = m[1].toLowerCase();
  return /^\d+$/.test(raw) ? parseInt(raw, 10) : (MONTH_WORDS[raw] ?? null);
}

/** The net cold rent, which is what § 551 BGB measures a deposit against. */
function netColdRent(analysis: Analysis): number | null {
  for (const c of analysis.clauses) {
    const m = c.quote.match(
      /(?:Nettokaltmiete|Grundmiete|Kaltmiete|Nettomiete|Grundentgelt)[^.]{0,40}?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?\s*(?:EUR|€|Euro))/i,
    );
    if (m) return amount(m[1]);
  }
  return null; // no identifiable basis — the rule does not run rather than guess one
}

function fmt(n: number, lang: Lang, minDigits = 0): string {
  return new Intl.NumberFormat(de(lang) ? "de-DE" : "en-GB", {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: 2,
  }).format(n);
}

type Rule = {
  id: string;
  law: string;
  section: string;
  cite: { de: string; en: string };
  rule: { de: string; en: string };
  subtypes?: Subtype[];
  test: (ctx: Ctx) => { de: string; en: string } | null;
};

const RULES: Rule[] = [
  {
    id: "kaution-hoehe",
    law: "BGB",
    section: "§ 551",
    cite: { de: "§ 551 Abs. 1 BGB", en: "§ 551 (1) BGB" },
    rule: {
      de: "Eine Mietsicherheit für Wohnraum darf das Dreifache der Monatsmiete ohne Betriebskosten nicht übersteigen.",
      en: "A residential tenancy deposit may not exceed three times the monthly rent excluding utilities.",
    },
    subtypes: ["rental"],
    test: ({ clause, analysis, }) => {
      if (!/Kaution|Mietsicherheit|Sicherheitsleistung|deposit/i.test(clause.quote)) return null;
      const deposit =
        analysis.money.oneTime.find((i) => i.kind === "deposit" && i.amount != null)?.amount ?? amount(clause.quote);
      const rent = netColdRent(analysis);
      if (!deposit || !rent || deposit <= rent * 3) return null;
      const x = deposit / rent;
      return {
        de: `Ihr Vertrag: ${fmt(deposit, "de")} € bei ${fmt(rent, "de")} € Nettokaltmiete — das ${fmt(Math.round(x * 10) / 10, "de", 1)}-Fache.`,
        en: `Your contract: €${fmt(deposit, "en")} against €${fmt(rent, "en")} net cold rent — ${fmt(Math.round(x * 10) / 10, "en", 1)}×.`,
      };
    },
  },
  {
    id: "kaution-raten",
    law: "BGB",
    section: "§ 551",
    cite: { de: "§ 551 Abs. 2 BGB", en: "§ 551 (2) BGB" },
    rule: {
      de: "Der Mieter darf die Mietsicherheit in drei gleichen monatlichen Teilzahlungen leisten; die erste ist zu Beginn des Mietverhältnisses fällig.",
      en: "The tenant may pay a residential deposit in three equal monthly instalments, the first due when the tenancy begins.",
    },
    subtypes: ["rental"],
    test: ({ clause }) => {
      if (!/Kaution|Mietsicherheit|Sicherheitsleistung/i.test(clause.quote)) return null;
      if (/Rate|Teilzahlung|Teilbetr|instalment/i.test(clause.quote)) return null;
      if (!/in einer Summe|in voller Höhe|vollständig|gesamte (?:Kaution|Mietsicherheit)/i.test(clause.quote)) return null;
      return {
        de: "Ihr Vertrag verlangt die Sicherheit in einer Summe.",
        en: "Your contract asks for the deposit as a single payment.",
      };
    },
  },
  {
    id: "kuendigungsfrist-mieter",
    law: "BGB",
    section: "§ 573c",
    cite: { de: "§ 573c Abs. 1 BGB", en: "§ 573c (1) BGB" },
    rule: {
      de: "Für den Mieter beträgt die Kündigungsfrist bei Wohnraum drei Monate, unabhängig von der Mietdauer.",
      en: "A residential tenant's notice period is three months, however long the tenancy has run.",
    },
    subtypes: ["rental"],
    test: ({ clause }) => {
      const m = clause.quote.match(
        /Kündigungsfrist für den Mieter[^.]{0,60}|(?:der\s+)?Mieter[^.]{0,80}?kündigen[^.]{0,60}/i,
      );
      if (!m) return null;
      const n = months(m[0]);
      if (!n || n <= 3) return null;
      return {
        de: `Ihr Vertrag nennt für Sie ${n} Monate.`,
        en: `Your contract sets ${n} months for you.`,
      };
    },
  },
  {
    id: "vertragsstrafe",
    law: "BGB",
    section: "§ 555",
    cite: { de: "§ 555 BGB", en: "§ 555 BGB" },
    rule: {
      de: "Eine Vereinbarung, durch die sich der Vermieter von dem Mieter für Wohnraum eine Vertragsstrafe versprechen lässt, ist unwirksam.",
      en: "In a residential tenancy, an agreement under which the landlord has the tenant promise a contractual penalty is void.",
    },
    subtypes: ["rental"],
    test: ({ clause }) => {
      if (!/Vertragsstrafe/i.test(clause.quote)) return null;
      const a = amount(clause.quote.slice(clause.quote.search(/Vertragsstrafe/i)));
      return {
        de: a ? `Ihr Vertrag sieht eine Vertragsstrafe von ${fmt(a, "de")} € vor.` : "Ihr Vertrag sieht eine Vertragsstrafe vor.",
        en: a ? `Your contract provides for a penalty of €${fmt(a, "en")}.` : "Your contract provides for a contractual penalty.",
      };
    },
  },
  {
    id: "haftungsausschluss",
    law: "BGB",
    section: "§ 309",
    cite: { de: "§ 309 Nr. 7 BGB", en: "§ 309 no. 7 BGB" },
    rule: {
      de: "In vorformulierten Vertragsbedingungen ist ein Ausschluss der Haftung für Schäden an Leben, Körper und Gesundheit sowie für grobes Verschulden unwirksam.",
      en: "In standard terms, excluding liability for injury to life, body or health, or for gross fault, is void.",
    },
    test: ({ clause }) => {
      if (!/haftet nicht|Haftung[^.]{0,40}(?:ausgeschlossen|beschränkt)|keine Haftung|excludes? (?:all )?liability/i.test(clause.quote))
        return null;
      if (!/vorsätzlich|Vorsatz|intent/i.test(clause.quote)) return null;
      return {
        de: "Ihr Vertrag lässt eine Haftung nur bei Vorsatz zu.",
        en: "Your contract admits liability only for intentional harm.",
      };
    },
  },
  {
    id: "untervermietung",
    law: "BGB",
    section: "§ 553",
    cite: { de: "§ 553 Abs. 1 BGB", en: "§ 553 (1) BGB" },
    rule: {
      de: "Entsteht dem Mieter nach Vertragsschluss ein berechtigtes Interesse, einen Teil des Wohnraums Dritten zu überlassen, kann er vom Vermieter die Erlaubnis dazu verlangen.",
      en: "If a legitimate interest in subletting part of the home arises after signing, the tenant may require the landlord's permission.",
    },
    subtypes: ["rental"],
    test: ({ clause }) => {
      if (!/Untervermietung|untervermiet|Gebrauchsüberlassung|sublet/i.test(clause.quote)) return null;
      if (!/ausgeschlossen|untersagt|nicht gestattet|nicht zulässig|verboten|prohibited/i.test(clause.quote)) return null;
      return {
        de: "Ihr Vertrag schließt die Untervermietung vollständig aus.",
        en: "Your contract rules out subletting entirely.",
      };
    },
  },
  {
    id: "mieterhoehung-kappung",
    law: "BGB",
    section: "§ 558",
    cite: { de: "§ 558 Abs. 3 BGB", en: "§ 558 (3) BGB" },
    rule: {
      de: "Bei einer Erhöhung bis zur ortsüblichen Vergleichsmiete darf die Miete innerhalb von drei Jahren um höchstens 20 % steigen — in Gebieten mit angespanntem Wohnungsmarkt, zu denen München zählt, um höchstens 15 %.",
      en: "When raising rent to the local reference level, it may rise by at most 20 % over three years — at most 15 % in areas with a strained housing market, which includes Munich.",
    },
    subtypes: ["rental"],
    test: ({ clause }) => {
      const m = clause.quote.match(/um\s+(\d{1,2}(?:,\d)?)\s*(?:%|Prozent)/i);
      if (!m || !/jährlich|jedes Jahr|jeweils zum|pro Jahr|automatisch/i.test(clause.quote)) return null;
      const pct = parseFloat(m[1].replace(",", "."));
      const overThree = (Math.pow(1 + pct / 100, 3) - 1) * 100;
      if (overThree <= 15) return null;
      return {
        de: `Ihr Vertrag sieht ${fmt(pct, "de")} % jährlich vor — rund ${fmt(Math.round(overThree), "de")} % in drei Jahren.`,
        en: `Your contract provides for ${fmt(pct, "en")} % a year — about ${fmt(Math.round(overThree), "en")} % over three years.`,
      };
    },
  },
  {
    id: "laufzeit-abo",
    law: "BGB",
    section: "§ 309",
    cite: { de: "§ 309 Nr. 9 BGB", en: "§ 309 no. 9 BGB" },
    rule: {
      de: "In vorformulierten Bedingungen über wiederkehrende Leistungen ist eine Bindung von mehr als zwei Jahren, eine stillschweigende Verlängerung um mehr als ein Jahr oder eine Kündigungsfrist von mehr als drei Monaten unwirksam.",
      en: "In standard terms for recurring services, a commitment longer than two years, automatic renewal by more than one year, or notice of more than three months is void.",
    },
    subtypes: ["subscription", "insurance"],
    test: ({ clause }) => {
      const term = clause.quote.match(/(?:Mindest(?:vertrags)?laufzeit|Laufzeit|Vertragsdauer)[^.]{0,40}/i);
      const t = term ? months(term[0]) : null;
      if (t && t > 24) return { de: `Ihr Vertrag bindet Sie ${t} Monate.`, en: `Your contract commits you for ${t} months.` };
      const notice = clause.quote.match(/Kündigungsfrist[^.]{0,40}/i);
      const n = notice ? months(notice[0]) : null;
      if (n && n > 3) return { de: `Ihr Vertrag nennt ${n} Monate Kündigungsfrist.`, en: `Your contract sets ${n} months' notice.` };
      return null;
    },
  },
];

/** Every statutory benchmark this contract diverges from, in clause order. */
export function lawChecks(analysis: Analysis): LawHit[] {
  const subtype = getContractSubtype(analysis.contractType);
  const lang = analysis.lang;
  const hits: LawHit[] = [];
  const seen = new Set<string>();
  for (const clause of analysis.clauses) {
    for (const rule of RULES) {
      if (rule.subtypes && !rule.subtypes.includes(subtype)) continue;
      if (seen.has(rule.id)) continue; // one hit per rule — the clearest clause wins
      const found = rule.test({ clause, analysis, subtype });
      if (!found) continue;
      seen.add(rule.id);
      hits.push({
        id: rule.id,
        clauseId: clause.id,
        law: rule.law,
        section: rule.section,
        cite: de(lang) ? rule.cite.de : rule.cite.en,
        rule: de(lang) ? rule.rule.de : rule.rule.en,
        contract: de(lang) ? found.de : found.en,
      });
    }
  }
  return hits;
}

/** How many benchmarks apply to this contract type, and which of them diverge. */
export function lawCheckScope(analysis: Analysis): { checked: number; hits: LawHit[] } {
  const subtype = getContractSubtype(analysis.contractType);
  const checked = RULES.filter((r) => !r.subtypes || r.subtypes.includes(subtype)).length;
  return { checked, hits: lawChecks(analysis) };
}

/** The benchmarks that touch one clause. */
export function lawChecksFor(analysis: Analysis, clauseId: string): LawHit[] {
  return lawChecks(analysis).filter((h) => h.clauseId === clauseId);
}
