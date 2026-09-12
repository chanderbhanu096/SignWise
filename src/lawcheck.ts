import type { Analysis, Clause, Lang } from "./types";
import { getContractSubtype, type Subtype } from "./contract";
import { canonical } from "./depth";
import { hourlyWage, weeklyHours } from "./pay";

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
  const m = text.match(/(?<![\d.,])(?:(?:EUR\b|Euro\b|€)\s*(\d+(?:[.,]\d+)*)|(\d+(?:[.,]\d+)*)\s*(?:EUR\b|Euro\b|€))/i);
  if (!m) return null;
  const value = canonical(m[1] ?? m[2]);
  return value == null ? null : Number(value);
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

/** Annual leave in working days: "20 Arbeitstage Jahresurlaub". */
function leaveDays(text: string): number | null {
  const m = text.match(/(\d{1,2})\s*(?:Arbeits|Werk|Urlaubs)?tage?\s*(?:bezahlten\s+)?(?:Jahres)?urlaub|urlaubsanspruch[^\d]{0,30}(\d{1,2})\s*(?:Arbeits|Werk)?tage?|(\d{1,2})\s*(?:working |business )?days.{0,12}(?:annual |paid )?(?:leave|holiday)/i);
  if (!m) return null;
  return parseInt(m[1] ?? m[2] ?? m[3], 10);
}

/** A five-day week is the basis the statutory minimum is converted to. */
const fiveDayWeek = (text: string) => /Fünf-?Tage-?Woche|5-?Tage-?Woche|fünf\s+Arbeitstage|five-?day week/i.test(text);

/** The net cold rent, which is what § 551 BGB measures a deposit against. */
function netColdRent(analysis: Analysis): number | null {
  for (const c of analysis.clauses) {
    const m = c.quote.match(
      /(?:Nettokaltmiete|Grundmiete|Kaltmiete|Nettomiete|Grundentgelt)[^\d.]{0,40}?((?:(?:EUR\b|Euro\b|€)\s*)?\d+(?:[.,]\d+)*(?:\s*(?:EUR\b|Euro\b|€))?)/i,
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
      // This is a deterministic comparison with the document, so a model's money
      // row must never override the deposit actually printed in the cited clause.
      const deposit = amount(clause.quote.slice(clause.quote.search(/Kaution|Mietsicherheit|Sicherheitsleistung|deposit/i)));
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
      if (!/haftet\s+(?:ausschließlich\s+|nur\s+)(?:bei|für)[^.]{0,30}(?:Vorsatz|vorsätzlich)|haftet nicht[^.]{0,100}es sei denn[^.]{0,70}(?:vorsätzlich|Vorsatz)|liable only for intentional/i.test(clause.quote)) return null;
      if (/grob(?:e[rsnm]?)?\s+Fahrlässigkeit|gross negligence/i.test(clause.quote)) return null;
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
      if (!/(?:Untervermietung|Gebrauchsüberlassung|subletting)\s+(?:(?:ist|is)\s+)?(?:(?:grundsätzlich|generell|vollständig|entirely)\s+)?(?:ausgeschlossen|untersagt|nicht gestattet|nicht zulässig|verboten|prohibited)/i.test(clause.quote)) return null;
      if (/ohne\s+(?:vorherige\s+|schriftliche\s+)?(?:Zustimmung|Erlaubnis)|without\s+(?:prior\s+|written\s+)?(?:consent|permission)|es sei denn|unless/i.test(clause.quote)) return null;
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
    id: "mindestlohn",
    law: "MiLoG",
    section: "§ 1",
    cite: { de: "§ 1 MiLoG", en: "§ 1 MiLoG" },
    rule: {
      de: "Jede Arbeitnehmerin und jeder Arbeitnehmer hat Anspruch auf den gesetzlichen Mindestlohn; er beträgt seit dem 1. Januar 2026 13,90 EUR brutto je Zeitstunde.",
      en: "Every employee is entitled to the statutory minimum wage; since 1 January 2026 it is €13.90 gross per hour.",
    },
    subtypes: ["employment"],
    test: ({ clause }) => {
      const wage = hourlyWage(clause.quote);
      // Side by side only when they diverge — a wage above the minimum is not a
      // benchmark the reader needs, and this panel exists for the gap.
      if (wage == null || wage >= 13.9) return null;
      return {
        de: `Ihr Vertrag: ${fmt(wage, "de", 2)} € brutto je Stunde — gesetzlicher Mindestlohn 13,90 €.`,
        en: `Your contract: €${fmt(wage, "en", 2)} gross per hour — statutory minimum €13.90.`,
      };
    },
  },
  {
    id: "werkstudent-20-stunden",
    law: "SGB V",
    section: "§ 6",
    cite: { de: "§ 6 Abs. 1 Nr. 3 SGB V", en: "§ 6 (1) no. 3 SGB V" },
    rule: {
      de: "Wer neben dem Studium arbeitet, bleibt in der Kranken-, Pflege- und Arbeitslosenversicherung nur dann versicherungsfrei, wenn das Studium die Hauptsache bleibt; die Praxis der Sozialversicherungsträger zieht diese Grenze während der Vorlesungszeit bei 20 Wochenstunden.",
      en: "Working alongside a degree is exempt from health, care and unemployment insurance only while the studies remain the main activity; social-insurance practice draws that line at 20 hours a week during lecture periods.",
    },
    subtypes: ["employment"],
    test: ({ clause }) => {
      if (!/Werkstudent|working student|Studium|Immatrikulation/i.test(clause.quote + clause.title)) {
        if (!/Vorlesungszeit|lecture period/i.test(clause.quote)) return null;
      }
      const hours = weeklyHours(clause.quote);
      if (hours == null || hours <= 20) return null;
      return {
        de: `Ihr Vertrag nennt ${hours} Stunden pro Woche — die Grenze für den Werkstudentenstatus liegt während der Vorlesungszeit bei 20.`,
        en: `Your contract names ${hours} hours a week — the working-student line during lecture periods is 20.`,
      };
    },
  },
  {
    id: "mindesturlaub",
    law: "BUrlG",
    section: "§ 3",
    cite: { de: "§ 3 Abs. 1 BUrlG", en: "§ 3 (1) BUrlG" },
    rule: {
      de: "Der gesetzliche Mindesturlaub beträgt jährlich 24 Werktage bei einer Sechs-Tage-Woche; bei einer Fünf-Tage-Woche entspricht das 20 Arbeitstagen.",
      en: "Statutory minimum leave is 24 working days a year on a six-day week, which corresponds to 20 days on a five-day week.",
    },
    subtypes: ["employment"],
    test: ({ clause }) => {
      const days = leaveDays(clause.quote);
      if (days == null) return null;
      const floor = fiveDayWeek(clause.quote) ? 20 : 24;
      if (days >= floor) return null;
      return {
        de: `Ihr Vertrag nennt ${days} Urlaubstage — der gesetzliche Mindestwert auf dieser Basis ist ${floor}.`,
        en: `Your contract names ${days} days of leave — the statutory minimum on this basis is ${floor}.`,
      };
    },
  },
  {
    id: "urlaubsverfall",
    law: "BUrlG",
    section: "§ 7",
    cite: { de: "§ 7 Abs. 3 BUrlG", en: "§ 7 (3) BUrlG" },
    rule: {
      de: "Urlaub verfällt am Jahresende grundsätzlich nur, wenn der Arbeitgeber zuvor konkret auf den Urlaubsanspruch und den drohenden Verfall hingewiesen und zur Urlaubsnahme aufgefordert hat (BAG, 19.02.2019 – 9 AZR 541/15, nach EuGH C-684/16).",
      en: "Leave normally lapses at year end only where the employer has specifically told the employee about the entitlement and the coming lapse and asked them to take it (BAG 19.02.2019 – 9 AZR 541/15, following CJEU C-684/16).",
    },
    subtypes: ["employment"],
    test: ({ clause }) => {
      if (!/verfäll|verfall|lapse|expire/i.test(clause.quote)) return null;
      if (!/unabhängig davon|ohne dass es|in jedem Fall|ersatzlos|regardless of whether/i.test(clause.quote)) return null;
      return {
        de: "Ihr Vertrag lässt den Urlaub unabhängig von einem Hinweis des Arbeitgebers verfallen.",
        en: "Your contract lets leave lapse regardless of any notice from the employer.",
      };
    },
  },
  {
    id: "ausschlussfrist",
    law: "BGB",
    section: "§ 202",
    cite: { de: "§ 202 Abs. 1 BGB", en: "§ 202 (1) BGB" },
    rule: {
      de: "Die Verjährung kann bei Haftung wegen Vorsatzes nicht im Voraus erleichtert werden; das Bundesarbeitsgericht hält arbeitsvertragliche Ausschlussfristen von weniger als drei Monaten je Stufe für zu kurz (BAG, 28.09.2005 – 5 AZR 52/05).",
      en: "Limitation may not be eased in advance for liability in intent; the Federal Labour Court treats contractual cut-off periods shorter than three months per stage as too short (BAG 28.09.2005 – 5 AZR 52/05).",
    },
    subtypes: ["employment"],
    test: ({ clause }) => {
      if (!/Ausschlussfrist|Verfallfrist|Verfallklausel|cut-?off period/i.test(clause.quote + clause.title)) return null;
      const m = months(clause.quote);
      if (m == null || m >= 3) return null;
      return {
        de: `Ihr Vertrag setzt eine Ausschlussfrist von ${m} Monat${m === 1 ? "" : "en"} — das BAG zieht die Grenze bei drei.`,
        en: `Your contract sets a cut-off period of ${m} month${m === 1 ? "" : "s"} — the Federal Labour Court draws the line at three.`,
      };
    },
  },
  {
    id: "schoenheitsreparaturen-starre-fristen",
    law: "BGB",
    section: "§ 307",
    cite: { de: "§ 307 Abs. 1 BGB", en: "§ 307 (1) BGB" },
    rule: {
      de: "Vorformulierte Bedingungen dürfen den Vertragspartner nicht unangemessen benachteiligen. Der BGH sieht einen starren Fristenplan für Schönheitsreparaturen — feste Jahresabstände ohne Rücksicht auf den tatsächlichen Zustand der Wohnung — als solche Benachteiligung an (BGH, 23.06.2004 – VIII ZR 361/03).",
      en: "Pre-formulated terms may not unreasonably disadvantage the other party. The Federal Court of Justice treats a rigid decorating schedule — fixed yearly intervals regardless of the flat's actual condition — as such a disadvantage (BGH 23.06.2004 – VIII ZR 361/03).",
    },
    subtypes: ["rental"],
    test: ({ clause }) => {
      if (!/Schönheitsreparaturen|decorating|cosmetic repairs/i.test(clause.quote + clause.title)) return null;
      const years = [...clause.quote.matchAll(/alle\s+(\d{1,2}|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn)\s+Jahren?/gi)]
        .map((m) => (/^\d+$/.test(m[1]) ? parseInt(m[1], 10) : MONTH_WORDS[m[1].toLowerCase()] ?? 0))
        .filter(Boolean);
      if (!years.length) return null;
      // A schedule that still defers to the flat's condition is not the rigid kind.
      if (/nach Bedarf|bei Bedarf|soweit erforderlich|Zustand der (?:Wohnung|Räume)|if required|as needed/i.test(clause.quote)) return null;
      const list = [...new Set(years)].sort((a, b) => a - b);
      return {
        de: `Ihr Vertrag nennt feste Abstände von ${list.join(" und ")} Jahren, ohne den Zustand der Räume zu erwähnen.`,
        en: `Your contract names fixed intervals of ${list.join(" and ")} years, without mentioning the condition of the rooms.`,
      };
    },
  },
  {
    id: "kleinreparaturen-ohne-grenze",
    law: "BGB",
    section: "§ 307",
    cite: { de: "§ 307 Abs. 1 BGB", en: "§ 307 (1) BGB" },
    rule: {
      de: "Eine Kleinreparaturklausel wälzt Kosten ab, die nach § 535 Abs. 1 BGB den Vermieter treffen. Die Rechtsprechung lässt das nur zu, wenn der Vertrag beides begrenzt: einen Höchstbetrag je Einzelfall und eine Obergrenze pro Jahr. Welche Beträge angemessen sind, entscheidet der Einzelfall.",
      en: "A small-repairs clause shifts costs that § 535 (1) BGB places on the landlord. The courts allow it only where the contract caps both: a maximum per individual repair and a ceiling per year. What amounts are appropriate depends on the individual case.",
    },
    subtypes: ["rental"],
    test: ({ clause }) => {
      if (!/Kleinreparatur|Bagatellschad|small repairs|minor repairs/i.test(clause.quote + clause.title)) return null;
      const perCase = /je (?:Einzelfall|Reparatur|Fall)|pro (?:Einzelfall|Reparatur|Fall)|per (?:case|repair)/i.test(clause.quote) && amount(clause.quote) != null;
      const perYear = /(?:im |pro |je )?(?:Kalender)?jahr|jährlich|annually|per year|Jahresmiete/i.test(clause.quote);
      if (perCase && perYear) return null; // both limits present — nothing to put side by side
      const missing = !perCase && !perYear ? "beides" : !perCase ? "einzelfall" : "jahr";
      return {
        de: missing === "beides"
          ? "Ihr Vertrag nennt weder einen Höchstbetrag je Einzelfall noch eine Jahresgrenze."
          : missing === "einzelfall"
            ? "Ihr Vertrag nennt eine Jahresgrenze, aber keinen Höchstbetrag je Einzelfall."
            : "Ihr Vertrag nennt einen Höchstbetrag je Einzelfall, aber keine Jahresgrenze.",
        en: missing === "beides"
          ? "Your contract names neither a cap per repair nor a yearly ceiling."
          : missing === "einzelfall"
            ? "Your contract names a yearly ceiling but no cap per individual repair."
            : "Your contract names a cap per individual repair but no yearly ceiling.",
      };
    },
  },
  {
    id: "betriebskosten-abrechnungsfrist",
    law: "BGB",
    section: "§ 556",
    cite: { de: "§ 556 Abs. 3 BGB", en: "§ 556 (3) BGB" },
    rule: {
      de: "Die Betriebskostenabrechnung ist dem Mieter spätestens bis zum Ablauf des zwölften Monats nach Ende des Abrechnungszeitraums mitzuteilen; danach ist eine Nachforderung grundsätzlich ausgeschlossen, wenn der Vermieter die Verspätung zu vertreten hat.",
      en: "The service-charge statement must reach the tenant within twelve months of the end of the accounting period; after that a claim for arrears is generally excluded where the landlord is responsible for the delay.",
    },
    subtypes: ["rental"],
    test: ({ clause }) => {
      if (!/Betriebskosten|Nebenkosten|Abrechnung|service charges|utilities/i.test(clause.quote + clause.title)) return null;
      const m = months(clause.quote);
      if (m == null || m <= 12) return null;
      return {
        de: `Ihr Vertrag nennt eine Abrechnungsfrist von ${m} Monaten — das Gesetz nennt zwölf.`,
        en: `Your contract names a statement period of ${m} months — the statute names twelve.`,
      };
    },
  },
  {
    id: "laufzeit-abo",
    law: "BGB",
    section: "§ 309",
    cite: { de: "§ 309 Nr. 9 BGB", en: "§ 309 no. 9 BGB" },
    rule: {
      de: "Die aktuelle Regel für AGB über wiederkehrende Leistungen begrenzt die Erstlaufzeit auf zwei Jahre und die Kündigungsfrist vor deren Ende auf einen Monat. Eine stillschweigende Verlängerung muss unbefristet und mit höchstens einem Monat Frist kündbar sein. Versicherungen sind ausgenommen; für ältere Verträge können Übergangsregeln gelten.",
      en: "The current rule for standard terms covering recurring services limits the initial term to two years and notice before its end to one month. Automatic renewal must be indefinite and cancellable with at most one month's notice. Insurance is excluded; transitional rules may apply to older contracts.",
    },
    // Checked against https://www.gesetze-im-internet.de/bgb/__309.html,
    // no. 9 (b), (c) and its explicit insurance exclusion, 2026-09-10.
    subtypes: ["subscription"],
    test: ({ clause }) => {
      const term = clause.quote.match(/(?:Mindest(?:vertrags)?laufzeit|Laufzeit|Vertragsdauer)[^.]{0,40}/i);
      const t = term ? months(term[0]) : null;
      if (t && t > 24) return { de: `Ihr Vertrag bindet Sie ${t} Monate.`, en: `Your contract commits you for ${t} months.` };
      const notice = clause.quote.match(/Kündigungsfrist[^.]{0,40}/i);
      const n = notice ? months(notice[0]) : null;
      if (n && n > 1) return { de: `Ihr Vertrag nennt ${n} Monate Kündigungsfrist.`, en: `Your contract sets ${n} months' notice.` };
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
