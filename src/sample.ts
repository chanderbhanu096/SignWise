import type { Analysis, Clause, Depth, Lang, Level, Tag } from "./types";
import { euro } from "./format";

// The demo fixture. Text is lifted from the Claude Design mockup (a real Berlin
// Mietvertrag). Bilingual so the language toggle works instantly on the sample
// without a translate call. Uploaded contracts come back in one language from the
// model; this fixture is the one place we keep both.

type L10n<T> = { de: T; en: T };

interface RawClause {
  id: string;
  page: number;
  level: Level;
  tags: Tag[];
  quote: string; // verbatim German — the same text lives in the sample PDF
  ref: L10n<string>;
  title: L10n<string>;
  simple: L10n<Record<Depth, string>>;
  means: L10n<string>;
  legal: L10n<string>;
}

const RAW: RawClause[] = [
  {
    id: "rent",
    page: 3,
    level: "important",
    tags: ["money", "deadline"],
    quote:
      "§ 4 Miete. Die monatliche Grundmiete beträgt 1.240,00 EUR und ist spätestens am dritten Werktag eines Monats im Voraus kostenfrei auf das Konto des Vermieters zu zahlen.",
    ref: { de: "§ 4 Miete · Seite 3", en: "§ 4 Miete · page 3" },
    title: { de: "Sie zahlen jeden Monat 1.240 € Miete", en: "You will pay €1,240 every month" },
    simple: {
      de: {
        simple: "Sie zahlen jeden Monat 1.240 € Miete — spätestens am 3. Werktag.",
        standard:
          "Die Grundmiete beträgt 1.240 € im Monat und wird im Voraus gezahlt. Das Geld muss bis zum dritten Werktag beim Vermieter sein; Überweisungskosten tragen Sie.",
        detailed:
          "Die Grundmiete beträgt 1.240 € monatlich und ist im Voraus fällig, nicht am Monatsende. Die Zahlung muss bis zum dritten Werktag auf dem Konto des Vermieters eingehen; „kostenfrei“ heißt, dass Sie die Gebühren tragen. Nebenkosten werden zusätzlich nach Verbrauch abgerechnet.",
      },
      en: {
        simple: "You pay €1,240 rent each month. It must arrive by the 3rd working day of the month.",
        standard:
          "The basic rent is €1,240 per month, paid in advance. It has to be in the landlord’s account by the third working day of each month, and you carry any transfer fees.",
        detailed:
          "Your basic rent (Grundmiete) is €1,240 per month, due in advance rather than at the end of the month. Payment must reach the landlord’s account by the third working day, and the wording “kostenfrei” means bank charges are yours. Utilities are billed separately by consumption, so your real monthly outgoing will be higher.",
      },
    },
    means: {
      de: "Richten Sie einen Dauerauftrag ein paar Tage früher ein. Geht das Geld wiederholt zu spät ein, kann der Vermieter abmahnen.",
      en: "Set up a standing order a few days early. If money arrives late repeatedly, the landlord can issue a warning.",
    },
    legal: {
      de: "Die Miete ist in der Regel bis zum dritten Werktag des Monats im Voraus fällig (§ 556b BGB). Die Zahlung ist rechtzeitig, wenn die Überweisung rechtzeitig veranlasst wird, nicht erst bei Gutschrift.",
      en: "Rent is normally due in advance by the third working day of the month (§ 556b BGB). Payment is considered on time when the transfer is initiated in time, not when it is credited.",
    },
  },
  {
    id: "deposit",
    page: 3,
    level: "important",
    tags: ["money", "responsibility"],
    quote:
      "§ 6 Kaution. Der Mieter leistet eine Sicherheit in Höhe von 3.000,00 EUR. Die Kaution kann in drei gleichen monatlichen Teilbeträgen erbracht werden.",
    ref: { de: "§ 6 Kaution · Seite 3", en: "§ 6 Kaution · page 3" },
    title: { de: "Ihre Kaution beträgt 3.000 €", en: "Your deposit is €3,000" },
    simple: {
      de: {
        simple: "Sie zahlen 3.000 € Kaution — in 3 Monatsraten möglich.",
        standard:
          "Die Kaution beträgt 3.000 €, also gut zwei Monatsmieten. Sie darf in drei gleichen Raten gezahlt werden, die erste zu Mietbeginn. Nach dem Auszug bekommen Sie sie zurück, abzüglich berechtigter Forderungen.",
        detailed:
          "Die Kaution beträgt 3.000 €, rund 2,4 Grundmieten. Zahlung in drei gleichen Raten ist möglich, die erste zu Mietbeginn. Der Vermieter muss das Geld getrennt und verzinst anlegen und nach dem Auszug zurückzahlen, sobald Forderungen geklärt sind — das kann nach der Nebenkostenabrechnung einige Monate dauern.",
      },
      en: {
        simple: "You pay €3,000 as a deposit. You may split it into 3 monthly parts.",
        standard:
          "The deposit is €3,000 — a little over two months’ rent. You can pay it in three equal monthly instalments, the first at the start of the tenancy. You get it back after you move out, minus anything the landlord may lawfully keep.",
        detailed:
          "The deposit is €3,000, which is about 2.4 months’ basic rent. The contract lets you pay in three equal instalments, the first due when the tenancy begins. The landlord must hold it in a separate, interest-bearing account, and returns it after move-out once any claims (damage, unpaid utilities) are settled — this can take several months after the final utilities statement.",
      },
    },
    means: {
      de: "Planen Sie im ersten Monat 4.240 € ein, wenn Sie die Kaution auf einmal zahlen, oder je 2.240 € in den ersten drei Monaten.",
      en: "Plan for €4,240 in your first month if you pay the deposit at once, or €2,240 in each of the first three months.",
    },
    legal: {
      de: "Eine Mietkaution darf drei Monatsmieten (Grundmiete) nicht übersteigen und ist in drei Raten zahlbar (§ 551 BGB).",
      en: "A rental deposit may not exceed three months’ basic rent and may be paid in three instalments (§ 551 BGB).",
    },
  },
  {
    id: "notice",
    page: 3,
    level: "important",
    tags: ["deadline", "money"],
    quote:
      "§ 9 Kündigung. Das Mietverhältnis läuft auf unbestimmte Zeit. Die Kündigung ist schriftlich bis zum dritten Werktag eines Kalendermonats zum Ablauf des zweiten darauffolgenden Monats zulässig.",
    ref: { de: "§ 9 Kündigung · Seite 3", en: "§ 9 Kündigung · page 3" },
    title: { de: "3 Monate Frist, um zu kündigen", en: "You need 3 months’ notice to cancel" },
    simple: {
      de: {
        simple: "Zum Ausziehen schicken Sie einen unterschriebenen Brief — etwa 3 Monate vorher.",
        standard:
          "Der Vertrag hat kein Enddatum. Ihre schriftliche Kündigung muss bis zum dritten Werktag eines Monats eingehen; das Mietverhältnis endet dann zum Ende des zweiten Folgemonats. Praktisch sind das drei Monate Frist.",
        detailed:
          "Das Mietverhältnis läuft unbefristet und endet nur durch Kündigung. Die Kündigung muss schriftlich und unterschrieben sein (E-Mail genügt nicht) und bis zum dritten Werktag eines Kalendermonats zugehen; es endet zum Ablauf des zweiten Folgemonats. Ein Tag zu spät kostet eine weitere Monatsmiete — 1.240 €.",
      },
      en: {
        simple: "To move out, send a signed letter. You must send it about 3 months before you leave.",
        standard:
          "The contract has no end date. To leave, you send a written, signed cancellation that arrives by the third working day of a month — you then move out at the end of the second month after that. In practice that is three months’ notice.",
        detailed:
          "The tenancy runs indefinitely, so it ends only if one side cancels. Your cancellation must be in writing and signed (email is not enough) and must arrive by the third working day of a calendar month; the tenancy then ends at the end of the second following month. Miss that date by a day and you owe one more month’s rent — €1,240.",
      },
    },
    means: {
      de: "Wenn Sie zum 30. September 2027 ausziehen wollen, muss Ihr Brief spätestens am 30. Juni 2027 ankommen.",
      en: "If you want to leave by 30 September 2027, your letter must arrive by 30 June 2027 at the latest.",
    },
    legal: {
      de: "Für Mieter beträgt die gesetzliche Kündigungsfrist drei Monate (§ 573c BGB). Die Kündigung bedarf der Schriftform (§ 568 BGB).",
      en: "For tenants the statutory notice period is three months (§ 573c BGB). Notice must be given in written form (§ 568 BGB).",
    },
  },
  {
    id: "increase",
    page: 3,
    level: "check",
    tags: ["money", "risk"],
    quote:
      "§ 11 Mieterhöhung. Der Vermieter ist berechtigt, die Miete im Rahmen der gesetzlichen Bestimmungen an die ortsübliche Vergleichsmiete anzupassen, frühestens jedoch 15 Monate nach Mietbeginn.",
    ref: { de: "§ 11 Mieterhöhung · Seite 3", en: "§ 11 Mieterhöhung · page 3" },
    title: {
      de: "Die Miete kann unter Bedingungen steigen",
      en: "Your rent may increase under certain conditions",
    },
    simple: {
      de: {
        simple: "Die Miete kann später steigen — nicht in den ersten 15 Monaten und nur im gesetzlichen Rahmen.",
        standard:
          "Der Vermieter darf die Miete an die ortsübliche Vergleichsmiete anpassen, frühestens 15 Monate nach Mietbeginn. Die Erhöhung muss schriftlich begründet werden, und Sie haben eine Überlegungsfrist.",
        detailed:
          "Die Klausel erlaubt Anpassungen bis zur ortsüblichen Vergleichsmiete, keine freien Erhöhungen. Frühestens möglich ist eine Erhöhung 15 Monate nach Mietbeginn, also ab Januar 2028. Der Vermieter muss sie schriftlich begründen (Mietspiegel, Vergleichswohnungen, Gutachten); Kappungsgrenzen begrenzen den Anstieg innerhalb von drei Jahren.",
      },
      en: {
        simple: "The rent can go up later, but not in the first 15 months, and only within legal limits.",
        standard:
          "The landlord may raise the rent towards the local comparative rent, at the earliest 15 months after the start. Any increase has to be requested in writing with reasons, and you have time to respond before it applies.",
        detailed:
          "This clause allows increases up to the local comparative rent (ortsübliche Vergleichsmiete), not free increases. The earliest possible increase is 15 months after your start date, i.e. from January 2028. The landlord must justify it in writing (rent index, comparable flats or an expert report), and legal caps limit how much rent can rise within three years.",
      },
    },
    means: {
      de: "Kalkulieren Sie eine mögliche Erhöhung ab 2028 ein. Eine nicht ordnungsgemäß begründete Erhöhung müssen Sie nicht akzeptieren.",
      en: "Budget for a possible increase from 2028 onwards. You do not have to accept an increase that is not properly justified.",
    },
    legal: {
      de: "Erhöhungen bis zur ortsüblichen Vergleichsmiete erfordern eine schriftliche Begründung und unterliegen einer Kappungsgrenze (§§ 558 ff. BGB); regionale Grenzen können niedriger sein.",
      en: "Increases to the local comparative rent require written justification and are subject to a cap (§§ 558 ff. BGB); regional caps can be lower.",
    },
  },
  {
    id: "repairs",
    page: 3,
    level: "check",
    tags: ["money", "risk", "responsibility"],
    quote:
      "§ 13 Kleinreparaturen. Der Mieter trägt die Kosten für Kleinreparaturen an Installationsgegenständen bis zu einem Betrag von 150,00 EUR je Einzelfall, insgesamt höchstens 8 % der Jahresmiete.",
    ref: { de: "§ 13 Kleinreparaturen · Seite 3", en: "§ 13 Kleinreparaturen · page 3" },
    title: {
      de: "Kleinreparaturen bis 150 € zahlen Sie selbst",
      en: "Small repairs up to €150 are yours to pay",
    },
    simple: {
      de: {
        simple: "Kleine Reparaturen bis 150 € zahlen Sie selbst. Diese Klausel sollten Sie prüfen lassen.",
        standard:
          "Sie würden kleine Reparaturen an Armaturen, Schaltern und ähnlichen Gegenständen zahlen — bis 150 € je Fall und höchstens 8 % der Jahresmiete (rund 1.190 €). Beide Beträge liegen eher hoch, das sollte näher geprüft werden.",
        detailed:
          "Kleinreparaturklauseln verlagern die Kosten kleiner Instandsetzungen auf den Mieter. Hier bis 150 € je Einzelfall und jährlich höchstens 8 % der Jahresmiete — rund 1.190 €. Gerichte haben deutlich niedrigere Einzelbeträge als Obergrenze angesehen; fehlt eine wirksame Höchstgrenze, kann die Klausel insgesamt unwirksam sein. Eine genauere Prüfung ist sinnvoll.",
      },
      en: {
        simple: "You pay for small repairs up to €150 each. This clause may deserve closer review.",
        standard:
          "You would pay small repairs on taps, switches and similar fittings — up to €150 per case, and up to 8% of your yearly rent (about €1,190) in total. Both the per-case amount and the yearly cap are on the high side compared with what is usually accepted, so this may deserve closer review.",
        detailed:
          "Small-repair clauses shift the cost of minor fittings repairs (taps, switches, blinds) to the tenant. Here it is up to €150 per case with a yearly total of 8% of the annual rent — about €1,190. Courts have often treated per-case amounts well below this figure as the upper end of what is reasonable, and a clause without a valid cap can be ineffective as a whole. This may deserve closer review before signing.",
      },
    },
    means: {
      de: "Bitten Sie den Vermieter, den Einzelbetrag zu senken, oder lassen Sie die Klausel vor der Unterschrift von einem Mieterverein prüfen.",
      en: "Ask the landlord to lower the per-case amount, or have a tenants’ association look at this clause before you sign.",
    },
    legal: {
      de: "Kleinreparaturklauseln sind nur mit angemessener Einzelgrenze und Jahreshöchstgrenze wirksam; ohne beides haben deutsche Gerichte solche Klauseln für unwirksam gehalten.",
      en: "Small-repair clauses are only valid with a reasonable per-case limit and an annual cap; without both, German courts have found such clauses ineffective.",
    },
  },
  {
    id: "condition",
    page: 2,
    level: "standard",
    tags: ["responsibility"],
    quote:
      "§ 2 Übergabe. Die Wohnung wird in dem im Übergabeprotokoll festgehaltenen Zustand, bezugsfertig und gereinigt, übergeben.",
    ref: { de: "§ 2 Übergabe · Seite 2", en: "§ 2 Übergabe · page 2" },
    title: {
      de: "Übergabe im vereinbarten Zustand",
      en: "You receive the apartment in the agreed condition",
    },
    simple: {
      de: {
        simple: "Die Wohnung muss sauber und bezugsfertig sein — wie im Protokoll festgehalten.",
        standard:
          "Die Wohnung wird bezugsfertig und gereinigt im Zustand des Übergabeprotokolls übergeben. Dieses Protokoll ist später Ihr Beweis — machen Sie am Tag Fotos.",
        detailed:
          "Die Übergabe erfolgt im Zustand des Übergabeprotokolls, bezugsfertig und gereinigt. Das Protokoll ist der Maßstab beim Auszug: Notieren Sie Mängel, Zählerstände und Schlüssel und behalten Sie eine unterschriebene Kopie.",
      },
      en: {
        simple: "The flat must be clean and ready to move into, as written in the handover record.",
        standard:
          "The apartment is handed over ready to move in and cleaned, in the condition recorded in the handover protocol. That document is your evidence later, so take photos on the day.",
        detailed:
          "Handover happens in the condition set out in the Übergabeprotokoll, ready to occupy and cleaned. The protocol is the reference point when you move out, so record existing marks, meter readings and any missing keys, and keep a signed copy.",
      },
    },
    means: {
      de: "Füllen Sie das Übergabeprotokoll gemeinsam mit dem Vermieter aus und behalten Sie Ihre Kopie — sie schützt Ihre Kaution.",
      en: "Fill in the handover record together with the landlord and keep your copy — it protects your deposit.",
    },
    legal: {
      de: "Der Vermieter muss die Wohnung in einem zum vertragsgemäßen Gebrauch geeigneten Zustand überlassen und erhalten (§ 535 BGB).",
      en: "The landlord must provide the property in a condition suitable for the agreed use and maintain it (§ 535 BGB).",
    },
  },
];

const pick = <T>(l: L10n<T>, lang: Lang): T => (lang === "de" ? l.de : l.en);

// Cited provisions per clause. The app maps law + section to the official URL.
type RawLegalRef = { label: L10n<string>; law: string; section?: string };
const LEGAL_REFS: Record<string, RawLegalRef[]> = {
  rent: [{ label: { de: "§ 556b BGB — Fälligkeit der Miete", en: "§ 556b BGB — When rent is due" }, law: "BGB", section: "§ 556b" }],
  deposit: [{ label: { de: "§ 551 BGB — Höhe und Anlage der Mietkaution", en: "§ 551 BGB — Amount and holding of the deposit" }, law: "BGB", section: "§ 551" }],
  notice: [
    { label: { de: "§ 573c BGB — Fristen der ordentlichen Kündigung", en: "§ 573c BGB — Notice periods" }, law: "BGB", section: "§ 573c" },
    { label: { de: "§ 568 BGB — Form der Kündigung", en: "§ 568 BGB — Form of notice" }, law: "BGB", section: "§ 568" },
  ],
  increase: [{ label: { de: "§ 558 BGB — Mieterhöhung bis zur ortsüblichen Vergleichsmiete", en: "§ 558 BGB — Rent increase to the local comparative rent" }, law: "BGB", section: "§ 558" }],
  repairs: [{ label: { de: "§ 307 BGB — Inhaltskontrolle von AGB", en: "§ 307 BGB — Review of standard terms" }, law: "BGB", section: "§ 307" }],
  condition: [{ label: { de: "§ 535 BGB — Pflichten aus dem Mietvertrag", en: "§ 535 BGB — Duties under the tenancy" }, law: "BGB", section: "§ 535" }],
};
const refsFor = (id: string, lang: Lang) =>
  LEGAL_REFS[id]?.map((r) => ({ label: pick(r.label, lang), law: r.law, section: r.section }));

const GLANCE: { key: L10n<string>; value: L10n<string>; derived?: boolean }[] = [
  { key: { de: "Vertragsart", en: "Contract type" }, value: { de: "Mietvertrag", en: "Rental Agreement" } },
  { key: { de: "Parteien", en: "Parties" }, value: { de: "Mieter ↔ Vermieter", en: "Tenant ↔ Landlord" } },
  { key: { de: "Beginn", en: "Start date" }, value: { de: "01.10.2026", en: "01.10.2026" } },
  { key: { de: "Laufzeit", en: "Duration" }, value: { de: "Unbefristet", en: "Indefinite" } },
  { key: { de: "Monatliche Kosten", en: "Monthly cost" }, value: { de: "1.240 €", en: "€1,240" } },
  {
    key: { de: "Kündigungsfrist", en: "Cancellation notice" },
    value: { de: "3 Monate", en: "3 months" },
    derived: true,
  },
];

const DATES: { date: L10n<string>; title: L10n<string>; body: L10n<string>; tone: "normal" | "warning"; iso?: string }[] = [
  {
    date: { de: "01. Okt 2026", en: "01 Oct 2026" },
    title: { de: "Vertrag beginnt", en: "Contract begins" },
    body: {
      de: "Erste Miete und die erste Kautionsrate sind fällig.",
      en: "First rent and the first deposit instalment are due.",
    },
    tone: "normal",
    iso: "2026-10-01",
  },
  {
    date: { de: "30. Jun 2027", en: "30 Jun 2027" },
    title: {
      de: "Bis hier kündigen, um zum 30. Sep auszuziehen",
      en: "Cancel before this date to leave by 30 Sep",
    },
    body: {
      de: "Ihr unterschriebener Brief muss angekommen sein. Ein Tag zu spät kostet eine weitere Monatsmiete.",
      en: "Your signed letter must have arrived. One day late costs another month’s rent.",
    },
    tone: "warning",
    iso: "2027-06-30",
  },
  {
    date: { de: "30. Sep 2027", en: "30 Sep 2027" },
    title: { de: "Mögliches Vertragsende", en: "Possible contract end" },
    body: {
      de: "Nur wenn Sie rechtzeitig gekündigt haben. Sonst läuft der Vertrag einfach weiter.",
      en: "Only if you gave notice in time. Otherwise the contract simply continues.",
    },
    tone: "normal",
    iso: "2027-09-30",
  },
];

const RIGHTS: { clauseId: string; text: L10n<string> }[] = [
  {
    clauseId: "condition",
    text: {
      de: "Die Wohnung im vereinbarten Zustand erhalten, gereinigt und bezugsfertig",
      en: "Receive the apartment in the agreed condition, cleaned and ready to move in",
    },
  },
  {
    clauseId: "repairs",
    text: {
      de: "Reparaturen bei Mängeln verlangen, die keine vereinbarten Kleinreparaturen sind",
      en: "Request repairs for defects that are not small repairs you agreed to cover",
    },
  },
  {
    clauseId: "increase",
    text: {
      de: "Vor einer Mietanpassung eine schriftliche, begründete Ankündigung erhalten",
      en: "Receive written, justified notice before the rent is adjusted",
    },
  },
];

const DUTIES: { clauseId: string; text: L10n<string> }[] = [
  {
    clauseId: "rent",
    text: { de: "1.240 € bis zum dritten Werktag jedes Monats zahlen", en: "Pay €1,240 by the third working day of each month" },
  },
  {
    clauseId: "deposit",
    text: { de: "3.000 € Kaution leisten (bis zu drei Raten)", en: "Provide a €3,000 deposit (up to three instalments)" },
  },
  {
    clauseId: "notice",
    text: {
      de: "Etwa drei Monate vor dem Auszug schriftlich kündigen",
      en: "Give written notice about three months before you move out",
    },
  },
];

export const SAMPLE_FILENAME = "Beispiel-Mietvertrag_Kastanienallee.pdf";

export function sampleAnalysis(lang: Lang): Analysis {
  const clauses: Clause[] = RAW.map((c) => ({
    id: c.id,
    ref: pick(c.ref, lang),
    page: c.page,
    quote: c.quote,
    verified: true, // the fixture's quotes are the sample PDF, by construction
    level: c.level,
    tags: c.tags,
    title: pick(c.title, lang),
    simple: pick(c.simple, lang),
    means: pick(c.means, lang),
    legal: pick(c.legal, lang),
    legalRefs: refsFor(c.id, lang),
  }));

  return {
    lang,
    docLanguage: "de",
    contractType: lang === "de" ? "Mietvertrag" : "Rental Agreement",
    glance: GLANCE.map((g) => ({ key: pick(g.key, lang), value: pick(g.value, lang), derived: g.derived })),
    money: {
      direction: "outgoing",
      monthly: 1240,
      yearly: 14880,
      oneTime: [
        {
          label: lang === "de" ? "Kaution" : "Deposit",
          amount: 3000,
          ref: lang === "de" ? "§ 6 · Seite 3" : "§ 6 · page 3",
          kind: "deposit",
          timingMonth: 0, // due in the first month → the first bar is taller
        },
        // Absence ≠ zero: the contract names no admin fee, so amount is null, not 0.
        { label: lang === "de" ? "Bearbeitungsgebühr" : "Administration fee", amount: null, kind: "fee" },
      ],
      variable: [
        {
          label: lang === "de" ? "Nebenkosten" : "Utilities (Nebenkosten)",
          note:
            lang === "de"
              ? "Im Vertrag nicht beziffert — nach Verbrauch. Fragen Sie nach der letzten Abrechnung."
              : "Not fixed in your contract — billed by consumption. Ask for last year’s statement.",
        },
      ],
      currency: "EUR",
    },
    dates: DATES.map((d) => ({ date: pick(d.date, lang), title: pick(d.title, lang), body: pick(d.body, lang), tone: d.tone, iso: d.iso })),
    findings: ["rent", "deposit", "notice", "increase", "repairs"],
    rights: RIGHTS.map((r) => ({ clauseId: r.clauseId, text: pick(r.text, lang) })),
    duties: DUTIES.map((d) => ({ clauseId: d.clauseId, text: pick(d.text, lang) })),
    clauses,
    confidence: "high",
    warnings: [],
  };
}

// The plain text of the sample contract page, so quote-verification has something
// to match against and the "original document" pane has something to show.
export const SAMPLE_DOC_TEXT = [
  "Mietvertrag über Wohnraum",
  "§ 1 Mietsache. Vermietet werden die im Anwesen Kastanienallee 14, 10435 Berlin, gelegene Wohnung im 3. Obergeschoss, bestehend aus 3 Zimmern, Küche, Bad, Balkon, sowie ein Kellerabteil.",
  RAW.find((c) => c.id === "condition")!.quote,
  RAW.find((c) => c.id === "rent")!.quote + " Nebenkosten werden gesondert nach Verbrauch abgerechnet.",
  "§ 7 Hausordnung. Der Mieter verpflichtet sich, die als Anlage beigefügte Hausordnung einzuhalten. Ruhezeiten gelten von 22:00 bis 6:00 Uhr sowie sonn- und feiertags.",
  RAW.find((c) => c.id === "deposit")!.quote +
    " Die erste Teilzahlung ist zu Beginn des Mietverhältnisses fällig.",
  RAW.find((c) => c.id === "notice")!.quote,
  RAW.find((c) => c.id === "increase")!.quote,
  RAW.find((c) => c.id === "repairs")!.quote,
  "§ 14 Schlussbestimmungen. Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform. Sollte eine Bestimmung unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.",
].join("\n\n");

// Convenience: what the Overview needs alongside the analysis for display.
export const sampleYearlyLabel = (lang: Lang) => euro(14880, lang);

// ---------------------------------------------------------------------------
// Employment fixture — demonstrates the income-side financial framing. Salary is
// never framed as a "cost", and the compensation chart shows a June holiday-pay bump.
// ---------------------------------------------------------------------------

type EmpClause = RawClause & { legalRefs?: RawLegalRef[] };

const EMP: EmpClause[] = [
  {
    id: "salary",
    page: 1,
    level: "important",
    tags: ["money"],
    quote: "§ 4 Vergütung. Das monatliche Bruttogehalt beträgt 3.440,00 EUR und wird zum Monatsende gezahlt.",
    ref: { de: "§ 4 Vergütung · Seite 1", en: "§ 4 Vergütung · page 1" },
    title: { de: "Ihr Bruttogehalt beträgt 3.440 € / Monat", en: "Your gross salary is €3,440 / month" },
    simple: {
      de: {
        simple: "Sie verdienen 3.440 € brutto im Monat, gezahlt zum Monatsende.",
        standard: "Das monatliche Bruttogehalt beträgt 3.440 € und wird jeweils zum Monatsende gezahlt. Brutto heißt vor Steuern und Sozialabgaben.",
        detailed: "Das vereinbarte Bruttogehalt beträgt 3.440 € pro Monat, zahlbar zum Monatsende. „Brutto“ ist der Betrag vor Lohnsteuer und Sozialversicherung; Ihr Nettobetrag ist niedriger und hängt von Steuerklasse und Beiträgen ab — das steht nicht im Vertrag.",
      },
      en: {
        simple: "You earn €3,440 gross per month, paid at month end.",
        standard: "The monthly gross salary is €3,440, paid at the end of each month. Gross means before tax and social-security contributions.",
        detailed: "The agreed gross salary is €3,440 per month, payable at month end. “Gross” is the figure before income tax and social security; your net pay is lower and depends on your tax class and contributions — which the contract does not state.",
      },
    },
    means: {
      de: "Ihr Nettogehalt liegt darunter. SignWise schätzt keine Abzüge — nutzen Sie einen Brutto-Netto-Rechner.",
      en: "Your take-home pay is lower. SignWise does not estimate deductions — use a gross-to-net calculator.",
    },
    legal: {
      de: "Der Arbeitgeber schuldet die vereinbarte Vergütung für geleistete Arbeit (§ 611a BGB).",
      en: "The employer owes the agreed remuneration for work performed (§ 611a BGB).",
    },
    legalRefs: [{ label: { de: "§ 611a BGB — Arbeitsvertrag", en: "§ 611a BGB — Employment contract" }, law: "BGB", section: "§ 611a" }],
  },
  {
    id: "probation",
    page: 1,
    level: "important",
    tags: ["deadline"],
    quote: "§ 2 Probezeit. Die ersten sechs Monate gelten als Probezeit. Während der Probezeit beträgt die Kündigungsfrist zwei Wochen.",
    ref: { de: "§ 2 Probezeit · Seite 1", en: "§ 2 Probezeit · page 1" },
    title: { de: "6 Monate Probezeit — 2 Wochen Frist", en: "6-month probation — 2 weeks’ notice" },
    simple: {
      de: {
        simple: "In den ersten 6 Monaten können beide Seiten mit 2 Wochen Frist kündigen.",
        standard: "Die ersten sechs Monate sind Probezeit. In dieser Zeit kann jede Seite mit einer Frist von zwei Wochen kündigen.",
        detailed: "Die Probezeit dauert sechs Monate (bis 30.04.2027). Während dieser Zeit gilt eine verkürzte Kündigungsfrist von zwei Wochen zu jedem Tag; ein besonderer Kündigungsschutz besteht meist noch nicht.",
      },
      en: {
        simple: "In the first 6 months, either side can cancel with 2 weeks’ notice.",
        standard: "The first six months are a probation period. During it either side may cancel with two weeks’ notice.",
        detailed: "Probation lasts six months (until 30 Apr 2027). During it a shortened two-week notice applies on any day, and full dismissal protection usually does not yet apply.",
      },
    },
    means: {
      de: "Rechnen Sie in den ersten sechs Monaten mit einer kurzen Frist von zwei Wochen.",
      en: "Expect a short two-week notice period during the first six months.",
    },
    legal: {
      de: "Während einer vereinbarten Probezeit (max. sechs Monate) kann mit zwei Wochen Frist gekündigt werden (§ 622 Abs. 3 BGB).",
      en: "During an agreed probation (max. six months) notice may be two weeks (§ 622 (3) BGB).",
    },
    legalRefs: [{ label: { de: "§ 622 BGB — Kündigungsfristen im Arbeitsverhältnis", en: "§ 622 BGB — Notice periods in employment relationships" }, law: "BGB", section: "§ 622" }],
  },
  {
    id: "notice",
    page: 2,
    level: "important",
    tags: ["deadline"],
    quote: "§ 9 Kündigung. Nach Ablauf der Probezeit gelten die gesetzlichen Kündigungsfristen.",
    ref: { de: "§ 9 Kündigung · Seite 2", en: "§ 9 Kündigung · page 2" },
    title: { de: "Nach der Probezeit gilt die gesetzliche Frist", en: "After probation the statutory notice applies" },
    simple: {
      de: {
        simple: "Nach der Probezeit gelten die normalen gesetzlichen Fristen — für Sie 4 Wochen.",
        standard: "Nach der Probezeit richtet sich die Kündigungsfrist nach dem Gesetz: für Arbeitnehmer vier Wochen zum 15. oder zum Monatsende.",
        detailed: "Nach der Probezeit gilt die gesetzliche Grundfrist von vier Wochen zum 15. oder zum Ende eines Kalendermonats (§ 622 Abs. 1 BGB). Für den Arbeitgeber verlängert sie sich mit der Beschäftigungsdauer.",
      },
      en: {
        simple: "After probation the normal statutory periods apply — four weeks for you.",
        standard: "After probation the notice period follows the law: for employees four weeks to the 15th or the end of a month.",
        detailed: "After probation the statutory base period is four weeks to the 15th or the end of a calendar month (§ 622 (1) BGB). For the employer it lengthens with your years of service.",
      },
    },
    means: {
      de: "Planen Sie nach der Probezeit mindestens vier Wochen Kündigungsfrist ein.",
      en: "After probation, plan for at least four weeks’ notice.",
    },
    legal: {
      de: "Die gesetzliche Grundkündigungsfrist beträgt vier Wochen zum 15. oder zum Monatsende (§ 622 Abs. 1 BGB).",
      en: "The statutory base notice period is four weeks to the 15th or month end (§ 622 (1) BGB).",
    },
    legalRefs: [{ label: { de: "§ 622 BGB — Kündigungsfristen im Arbeitsverhältnis", en: "§ 622 BGB — Notice periods in employment relationships" }, law: "BGB", section: "§ 622" }],
  },
  {
    id: "vacation",
    page: 2,
    level: "standard",
    tags: ["responsibility"],
    quote: "§ 7 Urlaub. Der Arbeitnehmer hat Anspruch auf 28 Urlaubstage pro Kalenderjahr.",
    ref: { de: "§ 7 Urlaub · Seite 2", en: "§ 7 Urlaub · page 2" },
    title: { de: "28 Urlaubstage pro Jahr", en: "28 holiday days per year" },
    simple: {
      de: {
        simple: "Sie haben 28 bezahlte Urlaubstage im Jahr.",
        standard: "Der Vertrag gibt 28 bezahlte Urlaubstage pro Kalenderjahr — mehr als das gesetzliche Minimum von 20 Tagen (bei 5-Tage-Woche).",
        detailed: "28 bezahlte Urlaubstage pro Jahr liegen über dem gesetzlichen Mindesturlaub von 20 Tagen bei einer Fünf-Tage-Woche (§ 3 BUrlG). Anteilige Kürzung gilt bei unterjährigem Ein- oder Austritt.",
      },
      en: {
        simple: "You get 28 paid holiday days a year.",
        standard: "The contract gives 28 paid holiday days per calendar year — more than the statutory minimum of 20 days (on a 5-day week).",
        detailed: "28 paid holiday days a year is above the statutory minimum of 20 days on a five-day week (§ 3 BUrlG). A pro-rata reduction applies if you join or leave mid-year.",
      },
    },
    means: {
      de: "Sie haben mehr Urlaub als gesetzlich vorgeschrieben — ein Pluspunkt des Vertrags.",
      en: "You get more holiday than the law requires — a plus in this contract.",
    },
    legal: {
      de: "Der gesetzliche Mindesturlaub beträgt 24 Werktage, also 20 Tage bei einer Fünf-Tage-Woche (§ 3 BUrlG).",
      en: "The statutory minimum holiday is 24 working days, i.e. 20 days on a five-day week (§ 3 BUrlG).",
    },
    legalRefs: [{ label: { de: "§ 3 BUrlG — Dauer des Mindesturlaubs", en: "§ 3 BUrlG — Minimum holiday entitlement" }, law: "BUrlG", section: "§ 3" }],
  },
  {
    id: "holiday",
    page: 1,
    level: "standard",
    tags: ["money"],
    quote: "§ 5 Sonderzahlung. Zusätzlich zum Gehalt wird ein Urlaubsgeld in Höhe von 1.200,00 EUR jährlich im Juni gezahlt.",
    ref: { de: "§ 5 Sonderzahlung · Seite 1", en: "§ 5 Sonderzahlung · page 1" },
    title: { de: "1.200 € Urlaubsgeld pro Jahr", en: "€1,200 holiday pay per year" },
    simple: {
      de: {
        simple: "Sie bekommen zusätzlich 1.200 € Urlaubsgeld im Jahr, ausgezahlt im Juni.",
        standard: "Zusätzlich zum Monatsgehalt zahlt der Arbeitgeber einmal im Jahr 1.200 € Urlaubsgeld, im Juni. Das kommt zum Jahresgehalt hinzu.",
        detailed: "Das Urlaubsgeld von 1.200 € wird zusätzlich zum Grundgehalt einmal jährlich im Juni gezahlt. Zusammen mit 12 × 3.440 € ergibt sich eine mögliche Jahresvergütung von 42.480 € brutto.",
      },
      en: {
        simple: "You also get €1,200 holiday pay a year, paid in June.",
        standard: "On top of your monthly salary, the employer pays €1,200 holiday pay once a year, in June. It adds to your annual pay.",
        detailed: "The €1,200 holiday pay is paid on top of base salary once a year in June. With 12 × €3,440 that gives a possible annual compensation of €42,480 gross.",
      },
    },
    means: {
      de: "Ihre mögliche Jahresvergütung liegt bei 42.480 € brutto (41.280 € Gehalt + 1.200 € Urlaubsgeld).",
      en: "Your possible annual compensation is €42,480 gross (€41,280 salary + €1,200 holiday pay).",
    },
    legal: {
      de: "Sonderzahlungen wie Urlaubsgeld sind nicht gesetzlich vorgeschrieben; sie ergeben sich aus dem Vertrag.",
      en: "Special payments such as holiday pay are not required by law; they follow from the contract.",
    },
  },
];

const EMP_GLANCE: { key: L10n<string>; value: L10n<string>; derived?: boolean }[] = [
  { key: { de: "Vertragsart", en: "Contract type" }, value: { de: "Arbeitsvertrag", en: "Employment agreement" } },
  { key: { de: "Parteien", en: "Parties" }, value: { de: "Arbeitnehmer ↔ Arbeitgeber", en: "Employee ↔ Employer" } },
  { key: { de: "Beginn", en: "Start date" }, value: { de: "01.11.2026", en: "01.11.2026" } },
  { key: { de: "Laufzeit", en: "Duration" }, value: { de: "Unbefristet", en: "Indefinite" } },
  { key: { de: "Bruttogehalt", en: "Gross salary" }, value: { de: "3.440 € / Monat", en: "€3,440 / month" } },
  { key: { de: "Kündigungsfrist", en: "Notice period" }, value: { de: "2 Wochen (Probezeit)", en: "2 weeks (probation)" }, derived: true },
];

const EMP_DATES: typeof DATES = [
  {
    date: { de: "01. Nov 2026", en: "01 Nov 2026" },
    title: { de: "Arbeitsverhältnis beginnt", en: "Employment begins" },
    body: { de: "Beginn der sechsmonatigen Probezeit.", en: "Start of the six-month probation period." },
    tone: "normal",
    iso: "2026-11-01",
  },
  {
    date: { de: "30. Apr 2027", en: "30 Apr 2027" },
    title: { de: "Ende der Probezeit", en: "End of probation" },
    body: {
      de: "Danach gilt die längere gesetzliche Kündigungsfrist; in der Probezeit sind es nur zwei Wochen.",
      en: "After this the longer statutory notice applies; during probation it is only two weeks.",
    },
    tone: "warning",
    iso: "2027-04-30",
  },
];

const EMP_RIGHTS: { clauseId: string; text: L10n<string> }[] = [
  { clauseId: "vacation", text: { de: "28 bezahlte Urlaubstage pro Jahr", en: "28 paid holiday days per year" } },
  { clauseId: "holiday", text: { de: "Zusätzliches Urlaubsgeld von 1.200 € jährlich", en: "Additional holiday pay of €1,200 per year" } },
  { clauseId: "salary", text: { de: "Pünktliche Zahlung des vereinbarten Gehalts", en: "The agreed salary paid on time" } },
];

const EMP_DUTIES: { clauseId: string; text: L10n<string> }[] = [
  { clauseId: "salary", text: { de: "Die vereinbarte Arbeitsleistung erbringen", en: "Perform the agreed work" } },
  { clauseId: "probation", text: { de: "In der Probezeit gilt eine 2-Wochen-Frist", en: "A 2-week notice applies during probation" } },
  { clauseId: "notice", text: { de: "Nach der Probezeit die Kündigungsfrist einhalten", en: "After probation, observe the notice period" } },
];

export const EMPLOYMENT_FILENAME = "Beispiel-Arbeitsvertrag.pdf";

export function employmentAnalysis(lang: Lang): Analysis {
  const clauses: Clause[] = EMP.map((c) => ({
    id: c.id,
    ref: pick(c.ref, lang),
    page: c.page,
    quote: c.quote,
    verified: true,
    level: c.level,
    tags: c.tags,
    title: pick(c.title, lang),
    simple: pick(c.simple, lang),
    means: pick(c.means, lang),
    legal: pick(c.legal, lang),
    legalRefs: c.legalRefs?.map((r) => ({ label: pick(r.label, lang), law: r.law, section: r.section })),
  }));

  return {
    lang,
    docLanguage: "de",
    contractType: lang === "de" ? "Arbeitsvertrag" : "Employment agreement",
    glance: EMP_GLANCE.map((g) => ({ key: pick(g.key, lang), value: pick(g.value, lang), derived: g.derived })),
    money: {
      direction: "incoming",
      monthly: 3440,
      yearly: 41280,
      currency: "EUR",
      oneTime: [
        {
          label: lang === "de" ? "Urlaubsgeld" : "Holiday pay",
          amount: 1200,
          freq: "annual",
          timingMonth: 8, // paid in June; month index 8 in the Oct-anchored 12-month axis
          kind: "holiday_pay",
          ref: lang === "de" ? "§ 5 · Seite 1" : "§ 5 · page 1",
        },
      ],
      variable: [
        {
          label: lang === "de" ? "Überstundenvergütung" : "Overtime pay",
          note:
            lang === "de"
              ? "Nur nach vorheriger Anordnung vergütet — im Vertrag nicht beziffert."
              : "Paid only if ordered in advance — not quantified in the contract.",
        },
      ],
    },
    dates: EMP_DATES.map((d) => ({ date: pick(d.date, lang), title: pick(d.title, lang), body: pick(d.body, lang), tone: d.tone, iso: d.iso })),
    findings: ["salary", "probation", "notice", "vacation", "holiday"],
    rights: EMP_RIGHTS.map((r) => ({ clauseId: r.clauseId, text: pick(r.text, lang) })),
    duties: EMP_DUTIES.map((d) => ({ clauseId: d.clauseId, text: pick(d.text, lang) })),
    clauses,
    confidence: "high",
    warnings: [],
  };
}

export const EMPLOYMENT_DOC_TEXT = [
  "Arbeitsvertrag",
  "§ 1 Beginn. Das Arbeitsverhältnis beginnt am 01.11.2026 und wird auf unbestimmte Zeit geschlossen.",
  EMP.find((c) => c.id === "probation")!.quote,
  EMP.find((c) => c.id === "salary")!.quote,
  EMP.find((c) => c.id === "holiday")!.quote,
  EMP.find((c) => c.id === "vacation")!.quote,
  EMP.find((c) => c.id === "notice")!.quote,
  "§ 8 Mehrarbeit. Überstunden werden nur nach vorheriger Anordnung vergütet.",
].join("\n\n");
