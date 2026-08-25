import type { Analysis, Clause, DecisionSummary, Depth, Lang, Level, Tag } from "./types";
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
      "§ 4 Miete. Die monatliche Grundmiete beträgt 1.240,00 EUR und ist spätestens am dritten Werktag eines Monats im Voraus kostenfrei auf das Konto des Vermieters zu zahlen. Nebenkosten werden gesondert nach Verbrauch abgerechnet.",
    ref: { de: "§ 4 Miete · Seite 3", en: "§ 4 Miete · page 3" },
    title: { de: "Sie zahlen jeden Monat 1.240 € Miete", en: "You will pay €1,240 every month" },
    simple: {
      de: {
        simple: "Sie zahlen jeden Monat 1.240 € Miete.",
        standard: "Sie zahlen jeden Monat 1.240 € Miete, und zwar im Voraus: spätestens am dritten Werktag des Monats muss das Geld auf dem Konto des Vermieters sein.",
        detailed: "Sie zahlen jeden Monat 1.240 € Grundmiete im Voraus — spätestens am dritten Werktag muss das Geld auf dem Konto des Vermieters angekommen sein. „Kostenfrei“ heißt hier, dass Sie die Überweisungsgebühren tragen. Die Nebenkosten stecken nicht in diesem Betrag; sie werden nach Verbrauch gesondert abgerechnet.",
      },
      en: {
        simple: "You pay €1,240 rent every month.",
        standard: "You pay €1,240 rent every month, and you pay it in advance: the money has to be in the landlord’s account by the third working day of the month.",
        detailed: "You pay €1,240 base rent every month in advance — the money has to have arrived in the landlord’s account by the third working day. “Kostenfrei” here means the transfer fees are yours. Utilities are not part of that amount; they are billed separately by consumption.",
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
        simple: "Sie zahlen 3.000 € Kaution.",
        standard: "Sie zahlen 3.000 € Kaution und dürfen den Betrag in drei gleichen Monatsraten aufbringen, die erste zu Beginn des Mietverhältnisses.",
        detailed: "Sie zahlen 3.000 € Kaution, aufteilbar in drei gleiche Monatsraten ab Mietbeginn. Der Vermieter muss das Geld getrennt von seinem eigenen Vermögen und verzinst anlegen. Zurück bekommen Sie es nach dem Auszug, sobald offene Ansprüche geklärt sind — das kann bis nach der letzten Betriebskostenabrechnung dauern.",
      },
      en: {
        simple: "You pay a deposit of €3,000.",
        standard: "You pay a deposit of €3,000, and you may split it into three equal monthly instalments, the first when the tenancy starts.",
        detailed: "You pay a deposit of €3,000, which you may split into three equal monthly instalments from the start of the tenancy. The landlord has to hold it separately from their own money and pay interest on it. You get it back after you move out, once any claims are settled — which can run until after the final utilities statement.",
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
        simple: "Um auszuziehen, kündigen Sie schriftlich mit rund drei Monaten Frist.",
        standard: "Um auszuziehen, kündigen Sie schriftlich mit rund drei Monaten Frist: Ihr unterschriebener Brief muss bis zum dritten Werktag eines Monats angekommen sein, dann endet das Mietverhältnis zum Ende des zweiten Folgemonats.",
        detailed: "Um auszuziehen, kündigen Sie schriftlich mit rund drei Monaten Frist — Ihr unterschriebener Brief muss bis zum dritten Werktag eines Monats beim Vermieter angekommen sein, und das Mietverhältnis endet dann zum Ablauf des zweiten darauffolgenden Monats. Eine E-Mail genügt dafür nicht. Ein Tag zu spät verschiebt das Ende um einen vollen Monat, also um weitere 1.240 € Miete.",
      },
      en: {
        simple: "To move out, you cancel in writing with about three months’ notice.",
        standard: "To move out, you cancel in writing with about three months’ notice: your signed letter has to arrive by the third working day of a month, and the tenancy then ends at the end of the second month after that.",
        detailed: "To move out, you cancel in writing with about three months’ notice — your signed letter has to reach the landlord by the third working day of a month, and the tenancy then ends at the close of the second month after that. An e-mail does not count. One day late pushes the end back by a full month, which is another €1,240 of rent.",
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
        simple: "Die Miete kann später steigen, frühestens 15 Monate nach Mietbeginn.",
        standard: "Die Miete kann später steigen, frühestens 15 Monate nach Mietbeginn und auch dann nur bis zur ortsüblichen Vergleichsmiete — freie Erhöhungen erlaubt die Klausel nicht.",
        detailed: "Die Miete kann frühestens 15 Monate nach Mietbeginn steigen und höchstens bis zur ortsüblichen Vergleichsmiete; freie Erhöhungen erlaubt die Klausel nicht. Jede Erhöhung muss der Vermieter Ihnen schriftlich begründen, mit Mietspiegel, Vergleichswohnungen oder Gutachten. Zusätzlich begrenzt die gesetzliche Kappungsgrenze, wie stark die Miete innerhalb von drei Jahren insgesamt steigen darf.",
      },
      en: {
        simple: "The rent can rise later, at the earliest 15 months after the tenancy starts.",
        standard: "The rent can rise later, at the earliest 15 months after the tenancy starts, and even then only up to the local comparative rent — the clause does not allow free increases.",
        detailed: "The rent can rise at the earliest 15 months after the tenancy starts, and only as far as the local comparative rent; the clause does not allow free increases. The landlord has to justify every increase to you in writing, using the rent index, comparable flats or an expert report. On top of that, the statutory cap limits how far the rent may rise in total within three years.",
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
        simple: "Kleine Reparaturen bis 150 € je Fall zahlen Sie selbst.",
        standard: "Kleine Reparaturen an Armaturen, Schaltern und ähnlichen Gegenständen zahlen Sie selbst: bis 150 € je Einzelfall und im Jahr höchstens 8 % der Jahresmiete.",
        detailed: "Kleine Reparaturen an Armaturen, Schaltern und ähnlichen Gegenständen zahlen Sie selbst — bis 150 € je Einzelfall und über das Jahr höchstens 8 % der Jahresmiete, hier also rund 1.190 €. Beide Grenzen gelten nebeneinander und entscheiden zusammen, wie teuer die Klausel für Sie werden kann. Sie verdient einen zweiten Blick, bevor Sie unterschreiben.",
      },
      en: {
        simple: "You pay small repairs up to €150 per case yourself.",
        standard: "You pay small repairs to taps, switches and similar fittings yourself: up to €150 per case, and no more than 8 % of the annual rent per year.",
        detailed: "You pay small repairs to taps, switches and similar fittings yourself — up to €150 per case, and across the year no more than 8 % of the annual rent, which here is about €1,190. The two limits apply side by side and together decide how expensive this clause can get for you. It deserves a second look before you sign.",
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
        simple: "Die Wohnung wird Ihnen bezugsfertig und gereinigt übergeben.",
        standard: "Die Wohnung wird Ihnen bezugsfertig und gereinigt übergeben; maßgeblich ist der Zustand, den das Übergabeprotokoll festhält.",
        detailed: "Die Wohnung wird Ihnen bezugsfertig und gereinigt übergeben, und maßgeblich ist allein der Zustand, den das Übergabeprotokoll festhält. Dieses Protokoll ist später Ihr wichtigster Beweis: Notieren Sie jeden Mangel und jeden Kratzer darin und lassen Sie es von beiden Seiten unterschreiben. Fehlt der Eintrag, tragen beim Auszug Sie die Beweislast dafür, dass ein Schaden schon vorher da war.",
      },
      en: {
        simple: "The flat is handed over to you ready to move into and cleaned.",
        standard: "The flat is handed over to you ready to move into and cleaned; what counts is the condition recorded in the handover protocol.",
        detailed: "The flat is handed over to you ready to move into and cleaned, and what counts is only the condition recorded in the handover protocol. That protocol is your most important evidence later: note every defect and every scratch in it, and have both sides sign it. Without the entry, when you move out the burden is on you to prove a damage was already there.",
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
  {
    id: "access",
    page: 3,
    level: "check",
    tags: ["responsibility"],
    quote:
      "§ 12 Betreten der Mieträume. Der Vermieter oder ein von ihm Beauftragter darf die Wohnung nach rechtzeitiger Ankündigung zu angemessener Tageszeit betreten. Bei Gefahr im Verzug ist der Zutritt jederzeit gestattet.",
    ref: { de: "§ 12 Betreten der Mieträume · Seite 3", en: "§ 12 Betreten der Mieträume · page 3" },
    title: {
      de: "Der Vermieter darf nur angekündigt herein",
      en: "The landlord may only enter with notice",
    },
    simple: {
      de: {
        simple: "Der Vermieter darf die Wohnung nur nach Ankündigung betreten.",
        standard: "Der Vermieter oder eine beauftragte Person darf die Wohnung nur nach rechtzeitiger Ankündigung und zu angemessener Tageszeit betreten — bei Gefahr im Verzug auch sofort.",
        detailed: "Der Vermieter oder eine beauftragte Person darf die Wohnung nur nach rechtzeitiger Ankündigung und zu angemessener Tageszeit betreten; bei Gefahr im Verzug, etwa einem Wasserrohrbruch, auch sofort und ohne Ankündigung. Was „rechtzeitig“ und „angemessen“ genau heißt, sagt der Vertrag nicht — üblich sind einige Tage Vorlauf und Werktage zu normalen Zeiten. Ein Recht, mit eigenem Schlüssel in Ihrer Abwesenheit hereinzukommen, folgt daraus nicht.",
      },
      en: {
        simple: "The landlord may only enter the flat after giving notice.",
        standard: "The landlord or someone acting for them may only enter the flat after giving reasonable notice and at a reasonable time of day — in an emergency, immediately.",
        detailed: "The landlord or someone acting for them may only enter the flat after giving reasonable notice and at a reasonable time of day; in an emergency, such as a burst pipe, immediately and without notice. What exactly counts as “reasonable” is not defined in the contract — a few days’ warning and normal hours on working days is the usual reading. It gives no right to let themselves in with their own key while you are out.",
      },
    },
    means: {
      de: "Bestehen Sie auf einer Ankündigung mit Datum und Uhrzeit und schlagen Sie einen anderen Termin vor, wenn er Ihnen nicht passt.",
      en: "Insist on notice with a date and a time, and offer a different slot if the one proposed does not suit you.",
    },
    legal: {
      de: "Die Wohnung ist während der Mietzeit dem Besitz des Mieters zugeordnet; ein allgemeines Betretungsrecht des Vermieters ohne Anlass besteht nicht (§ 535 BGB).",
      en: "During the tenancy the flat is in the tenant’s possession; the landlord has no general right of entry without a reason (§ 535 BGB).",
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

// Bilingual "Before you sign" briefs, built from the same clauses. The app derives
// an equivalent brief for uploaded contracts that lack one.
interface RawDecision {
  commitments: { title: L10n<string>; value?: L10n<string>; explanation: L10n<string>; clauseId: string }[];
  reviewItems: { title: L10n<string>; explanation: L10n<string>; reason: L10n<string>; clauseId: string }[];
  understandingQuestions: { question: L10n<string>; answer: L10n<string>; clauseId: string }[];
  clarificationQuestions: { question: L10n<string>; reason?: L10n<string>; clauseId?: string }[];
}
const buildDecision = (d: RawDecision, lang: Lang): DecisionSummary => ({
  commitments: d.commitments.map((c) => ({ title: pick(c.title, lang), value: c.value ? pick(c.value, lang) : undefined, explanation: pick(c.explanation, lang), clauseId: c.clauseId })),
  reviewItems: d.reviewItems.map((r) => ({ title: pick(r.title, lang), explanation: pick(r.explanation, lang), reason: pick(r.reason, lang), clauseId: r.clauseId })),
  understandingQuestions: d.understandingQuestions.map((q) => ({ question: pick(q.question, lang), answer: pick(q.answer, lang), clauseId: q.clauseId })),
  clarificationQuestions: d.clarificationQuestions.map((q) => ({ question: pick(q.question, lang), reason: q.reason ? pick(q.reason, lang) : undefined, clauseId: q.clauseId })),
});

const RENTAL_DECISION: RawDecision = {
  commitments: [
    { title: { de: "Jeden Monat", en: "Every month" }, value: { de: "1.240 €", en: "€1,240" }, explanation: { de: "Miete, monatlich im Voraus fällig.", en: "Rent, due monthly in advance." }, clauseId: "rent" },
    { title: { de: "Kaution", en: "Deposit" }, value: { de: "3.000 €", en: "€3,000" }, explanation: { de: "Einmalig zu Beginn (in 3 Raten möglich).", en: "Once, at the start (up to 3 instalments)." }, clauseId: "deposit" },
    { title: { de: "Kündigungsfrist", en: "Notice period" }, value: { de: "3 Monate", en: "3 months" }, explanation: { de: "So kündigen Sie die Wohnung.", en: "How you end the tenancy." }, clauseId: "notice" },
    { title: { de: "Laufzeit", en: "Duration" }, value: { de: "Unbefristet", en: "Indefinite" }, explanation: { de: "Läuft bis zur Kündigung.", en: "Runs until cancelled." }, clauseId: "notice" },
  ],
  reviewItems: [
    { title: { de: "Kleinreparaturen bis 150 €", en: "Small repairs up to €150" }, explanation: { de: "Sie tragen kleine Reparaturen bis 150 € je Fall, höchstens 8 % der Jahresmiete.", en: "You pay small repairs up to €150 per case, max 8% of the yearly rent." }, reason: { de: "Kann zusätzliche Kosten bedeuten — die Beträge liegen eher hoch.", en: "Could create additional costs — the amounts are on the high side." }, clauseId: "repairs" },
    { title: { de: "Miete kann steigen", en: "Rent may increase" }, explanation: { de: "Ab 15 Monaten nach Beginn kann die Miete an die ortsübliche Vergleichsmiete angepasst werden.", en: "From 15 months after the start the rent may be raised to the local comparative rent." }, reason: { de: "Ihre Miete könnte später steigen.", en: "Your rent could rise later." }, clauseId: "increase" },
  ],
  understandingQuestions: [
    { question: { de: "Wie viel zahle ich regelmäßig?", en: "How much will I pay regularly?" }, answer: { de: "1.240 € Grundmiete pro Monat, im Voraus bis zum dritten Werktag.", en: "€1,240 basic rent per month, paid in advance by the third working day." }, clauseId: "rent" },
    { question: { de: "Was muss ich zu Beginn für die Kaution einplanen?", en: "What must I budget for the deposit at the start?" }, answer: { de: "3.000 €; der Vertrag erlaubt drei gleiche Monatsraten.", en: "€3,000; the contract allows three equal monthly instalments." }, clauseId: "deposit" },
    { question: { de: "Wie kann ich den Mietvertrag beenden?", en: "How can I end the tenancy?" }, answer: { de: "Mit drei Monaten Frist und in schriftlicher Form.", en: "With three months’ notice and in written form." }, clauseId: "notice" },
    { question: { de: "Kann sich meine Miete später ändern?", en: "Can my rent change later?" }, answer: { de: "Ja. Frühestens 15 Monate nach Beginn kann sie an die ortsübliche Vergleichsmiete angepasst werden.", en: "Yes. No earlier than 15 months after the start, it may be adjusted to the local comparative rent." }, clauseId: "increase" },
    { question: { de: "Welche Reparaturen könnten mich etwas kosten?", en: "Which repairs could I have to pay for?" }, answer: { de: "Bestimmte Kleinreparaturen bis 150 € je Fall, insgesamt höchstens 8 % der Jahresgrundmiete.", en: "Certain small repairs up to €150 per case, capped at 8% of the annual basic rent." }, clauseId: "repairs" },
  ],
  clarificationQuestions: [
    { question: { de: "Mit welchen monatlichen Nebenkosten sollte ich rechnen?", en: "What monthly utilities should I budget for?" }, reason: { de: "Sie werden laut Vertrag zusätzlich nach Verbrauch abgerechnet, aber nicht beziffert.", en: "The contract bills them separately by consumption but gives no amount." }, clauseId: "rent" },
    { question: { de: "Welche Kleinreparaturen muss ich genau zahlen?", en: "Which small repairs exactly must I pay for?" }, reason: { de: "§ 13 nennt Grenzen, aber keine konkrete Liste.", en: "§ 13 gives limits but no concrete list." }, clauseId: "repairs" },
  ],
};

const EMP_DECISION: RawDecision = {
  commitments: [
    { title: { de: "Brutto pro Monat", en: "Gross per month" }, value: { de: "3.440 €", en: "€3,440" }, explanation: { de: "Ihr vertragliches Grundgehalt.", en: "Your contractual base salary." }, clauseId: "salary" },
    { title: { de: "Urlaubsgeld", en: "Holiday pay" }, value: { de: "1.200 € / Jahr", en: "€1,200 / year" }, explanation: { de: "Zusätzlich, im Juni gezahlt.", en: "Additional, paid in June." }, clauseId: "holiday" },
    { title: { de: "Urlaub", en: "Vacation" }, value: { de: "28 Tage", en: "28 days" }, explanation: { de: "Bezahlter Urlaub pro Jahr.", en: "Paid holiday per year." }, clauseId: "vacation" },
    { title: { de: "Probezeit", en: "Probation" }, value: { de: "6 Monate", en: "6 months" }, explanation: { de: "In dieser Zeit 2 Wochen Kündigungsfrist.", en: "2 weeks' notice during this time." }, clauseId: "probation" },
    { title: { de: "Kündigungsfrist", en: "Notice period" }, value: { de: "2 Wochen (Probezeit)", en: "2 weeks (probation)" }, explanation: { de: "Danach gilt die gesetzliche Frist.", en: "Then the statutory period applies." }, clauseId: "notice" },
  ],
  reviewItems: [
    { title: { de: "Überstundenvergütung bleibt offen", en: "Overtime compensation remains open" }, explanation: { de: "Nur vorab angeordnete Überstunden werden vergütet; Betrag oder Freizeitausgleich nennt der Vertrag nicht.", en: "Only overtime ordered in advance is paid; the contract states neither an amount nor a time-off arrangement." }, reason: { de: "Kann Ihre tatsächliche Arbeitszeit und Vergütung beeinflussen.", en: "Could affect your actual working time and compensation." }, clauseId: "overtime" },
    { title: { de: "Kurze Frist in der Probezeit", en: "Short notice during probation" }, explanation: { de: "In den ersten sechs Monaten kann mit nur zwei Wochen gekündigt werden.", en: "In the first six months either side can cancel with just two weeks' notice." }, reason: { de: "Wenig Sicherheit in den ersten Monaten.", en: "Little security in the first months." }, clauseId: "probation" },
    { title: { de: "Kündigung nach der Probezeit", en: "Notice after probation" }, explanation: { de: "Danach gilt die gesetzliche Frist von vier Wochen zum 15. oder Monatsende.", en: "After that the statutory four-week period to the 15th or month end applies." }, reason: { de: "Betrifft, wie schnell Sie wechseln können.", en: "Affects how quickly you can move on." }, clauseId: "notice" },
  ],
  understandingQuestions: [
    { question: { de: "Welche regelmäßige Vergütung nennt der Vertrag?", en: "What recurring compensation does the contract state?" }, answer: { de: "3.440 € brutto pro Monat, jeweils zum Monatsende.", en: "€3,440 gross per month, paid at the end of each month." }, clauseId: "salary" },
    { question: { de: "Was gilt während der Probezeit?", en: "What applies during the probation period?" }, answer: { de: "Sie dauert sechs Monate; in dieser Zeit können beide Seiten mit zwei Wochen Frist kündigen.", en: "It lasts six months; during that time either side can give two weeks’ notice." }, clauseId: "probation" },
    { question: { de: "Welche Kündigungsfrist gilt danach?", en: "What notice period applies afterward?" }, answer: { de: "Vier Wochen zum 15. oder zum Ende eines Kalendermonats.", en: "Four weeks to the 15th or the end of a calendar month." }, clauseId: "notice" },
    { question: { de: "Wie viel bezahlten Urlaub erhalte ich?", en: "How much paid vacation do I receive?" }, answer: { de: "28 Urlaubstage pro Kalenderjahr.", en: "28 vacation days per calendar year." }, clauseId: "vacation" },
    { question: { de: "Welche zusätzliche Zahlung nennt der Vertrag?", en: "What additional payment does the contract state?" }, answer: { de: "1.200 € Urlaubsgeld pro Jahr, ausgezahlt im Juni.", en: "€1,200 holiday pay per year, paid in June." }, clauseId: "holiday" },
  ],
  clarificationQuestions: [
    { question: { de: "Wie werden angeordnete Überstunden genau vergütet?", en: "How exactly is ordered overtime compensated?" }, reason: { de: "Der Vertrag verspricht Vergütung, nennt aber weder Betrag noch Freizeitausgleich.", en: "The contract promises compensation but states neither an amount nor a time-off arrangement." }, clauseId: "overtime" },
    { question: { de: "Hängt das Urlaubsgeld davon ab, im Juni noch angestellt zu sein?", en: "Does the holiday pay depend on still being employed in June?" }, reason: { de: "Der Vertrag nennt keine Bedingung.", en: "The contract states no condition." }, clauseId: "holiday" },
  ],
};

const GLANCE: { key: L10n<string>; value: L10n<string>; derived?: boolean; clauseId?: string }[] = [
  { key: { de: "Vertragsart", en: "Contract type" }, value: { de: "Mietvertrag", en: "Rental Agreement" } },
  { key: { de: "Parteien", en: "Parties" }, value: { de: "Mieter ↔ Vermieter", en: "Tenant ↔ Landlord" } },
  { key: { de: "Beginn", en: "Start date" }, value: { de: "01.10.2026", en: "01.10.2026" } },
  { key: { de: "Laufzeit", en: "Duration" }, value: { de: "Unbefristet", en: "Indefinite" }, clauseId: "notice" },
  { key: { de: "Monatliche Kosten", en: "Monthly cost" }, value: { de: "1.240 €", en: "€1,240" }, clauseId: "rent" },
  {
    key: { de: "Kündigungsfrist", en: "Cancellation notice" },
    value: { de: "3 Monate", en: "3 months" },
    derived: true,
    clauseId: "notice",
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
    glance: GLANCE.map((g) => ({ key: pick(g.key, lang), value: pick(g.value, lang), derived: g.derived, clauseId: g.clauseId })),
    money: {
      direction: "outgoing",
      monthly: 1240,
      yearly: 14880,
      monthlyClauseId: "rent",
      yearlyClauseId: "rent",
      oneTime: [
        {
          label: lang === "de" ? "Kaution" : "Deposit",
          amount: 3000,
          ref: lang === "de" ? "§ 6 · Seite 3" : "§ 6 · page 3",
          clauseId: "deposit",
          kind: "deposit",
          timingMonth: 0, // due in the first month → the first bar is taller
        },
        // Absence ≠ zero: the contract names no admin fee, so amount is null, not 0.
        { label: lang === "de" ? "Bearbeitungsgebühr" : "Administration fee", amount: null, kind: "fee" },
      ],
      variable: [
        {
          label: lang === "de" ? "Nebenkosten" : "Utilities (Nebenkosten)",
          clauseId: "rent",
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
    decisionSummary: buildDecision(RENTAL_DECISION, lang),
  };
}

// The plain text of the sample contract page, so quote-verification has something
// to match against and the "original document" pane has something to show.
export const SAMPLE_DOC_TEXT = [
  "Mietvertrag über Wohnraum",
  "zwischen Frau Beate Wagner, Kastanienallee 14, 10435 Berlin — nachfolgend Vermieterin — und Herrn Malik Osei, Sonnenallee 3, 12045 Berlin — nachfolgend Mieter — wird folgender Mietvertrag geschlossen:",
  "§ 1 Mietsache. Vermietet werden die im Anwesen Kastanienallee 14, 10435 Berlin, gelegene Wohnung im 3. Obergeschoss, bestehend aus 3 Zimmern, Küche, Bad, Balkon, sowie ein Kellerabteil.",
  RAW.find((c) => c.id === "condition")!.quote,
  "§ 3 Mietzeit. Das Mietverhältnis beginnt am 01.10.2026 und läuft auf unbestimmte Zeit. Eine Befristung ist nicht vereinbart.",
  RAW.find((c) => c.id === "rent")!.quote,
  "§ 5 Betriebskosten. Die Betriebskosten im Sinne der Betriebskostenverordnung trägt der Mieter. Über die geleisteten Vorauszahlungen wird jährlich abgerechnet; die Abrechnung erfolgt spätestens zwölf Monate nach Ende des Abrechnungszeitraums.",
  RAW.find((c) => c.id === "deposit")!.quote +
    " Die erste Teilzahlung ist zu Beginn des Mietverhältnisses fällig.",
  "§ 7 Hausordnung. Der Mieter verpflichtet sich, die als Anlage beigefügte Hausordnung einzuhalten. Ruhezeiten gelten von 22:00 bis 6:00 Uhr sowie sonn- und feiertags.",
  "§ 8 Untervermietung. Der Mieter darf die Wohnung oder Teile davon nur mit vorheriger Zustimmung des Vermieters untervermieten. Die Zustimmung ist schriftlich einzuholen.",
  RAW.find((c) => c.id === "notice")!.quote,
  "§ 10 Tierhaltung. Das Halten von Kleintieren ist gestattet. Die Haltung von Hunden und Katzen bedarf der Zustimmung des Vermieters.",
  RAW.find((c) => c.id === "increase")!.quote,
  RAW.find((c) => c.id === "access")!.quote,
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
    id: "duration",
    page: 1,
    level: "standard",
    tags: ["deadline"],
    quote: "§ 1 Beginn. Das Arbeitsverhältnis beginnt am 01.11.2026 und wird auf unbestimmte Zeit geschlossen.",
    ref: { de: "§ 1 Beginn · Seite 1", en: "§ 1 Beginn · page 1" },
    title: { de: "Beginn am 1. November — unbefristet", en: "Starts 1 November — indefinite" },
    simple: {
      de: {
        simple: "Das Arbeitsverhältnis beginnt am 1. November 2026.",
        standard: "Das Arbeitsverhältnis beginnt am 1. November 2026 und ist unbefristet geschlossen — es hat kein festes Enddatum.",
        detailed: "Das Arbeitsverhältnis beginnt am 1. November 2026 und ist unbefristet geschlossen. Es endet deshalb nicht von selbst, sondern läuft weiter, bis eine der beiden Seiten kündigt. Das ist für Sie die günstigere Variante: Ein befristeter Vertrag würde ohne Kündigung einfach auslaufen.",
      },
      en: {
        simple: "The employment starts on 1 November 2026.",
        standard: "The employment starts on 1 November 2026 and is open-ended — there is no fixed end date.",
        detailed: "The employment starts on 1 November 2026 and is open-ended. It therefore does not end by itself; it continues until one side gives notice. That is the better version for you: a fixed-term contract would simply expire with no notice at all.",
      },
    },
    means: {
      de: "Es gibt kein automatisches Vertragsende; für einen Austritt müssen die Kündigungsfristen beachtet werden.",
      en: "There is no automatic end date; leaving requires compliance with the notice periods.",
    },
    legal: {
      de: "Ein unbefristetes Arbeitsverhältnis läuft bis zu einer wirksamen Beendigung fort.",
      en: "An indefinite employment relationship continues until it is effectively terminated.",
    },
  },
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
        simple: "Sie verdienen 3.440 € brutto im Monat.",
        standard: "Sie verdienen 3.440 € brutto im Monat, ausgezahlt jeweils zum Monatsende.",
        detailed: "Sie verdienen 3.440 € brutto im Monat, ausgezahlt jeweils zum Monatsende. Brutto heißt vor Steuern und Sozialabgaben — was ankommt, hängt von Steuerklasse und Krankenkasse ab und liegt deutlich darunter. Eine Regelung zu späteren Gehaltserhöhungen enthält der Vertrag nicht.",
      },
      en: {
        simple: "You earn €3,440 gross per month.",
        standard: "You earn €3,440 gross per month, paid at the end of each month.",
        detailed: "You earn €3,440 gross per month, paid at the end of each month. Gross means before tax and social contributions — what actually arrives depends on your tax class and health insurer and is noticeably less. The contract says nothing about later pay rises.",
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
        simple: "Die ersten sechs Monate sind Probezeit.",
        standard: "Die ersten sechs Monate sind Probezeit; in dieser Zeit kann jede Seite mit zwei Wochen Frist kündigen.",
        detailed: "Die ersten sechs Monate sind Probezeit — gerechnet ab dem 1. November 2026 also bis zum 30. April 2027. In dieser Zeit kann jede Seite mit einer Frist von zwei Wochen kündigen, und zwar zu jedem beliebigen Tag. Der allgemeine Kündigungsschutz greift meist erst danach.",
      },
      en: {
        simple: "The first six months are a probation period.",
        standard: "The first six months are a probation period; during it either side can give notice with two weeks’ notice.",
        detailed: "The first six months are a probation period — counted from 1 November 2026, that runs to 30 April 2027. During it either side can give two weeks’ notice, on any day of the month. General protection against dismissal usually only starts afterwards.",
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
        simple: "Nach der Probezeit gilt für Sie eine Kündigungsfrist von vier Wochen.",
        standard: "Nach der Probezeit gilt für Sie eine Kündigungsfrist von vier Wochen, jeweils zum 15. oder zum Ende eines Kalendermonats.",
        detailed: "Nach der Probezeit gilt für Sie eine Kündigungsfrist von vier Wochen, jeweils zum 15. oder zum Ende eines Kalendermonats. Der Vertrag nennt keine eigene Frist, sondern verweist auf das Gesetz — das ist die gesetzliche Grundfrist. Für den Arbeitgeber verlängert sie sich mit Ihrer Beschäftigungsdauer, für Sie bleibt sie gleich.",
      },
      en: {
        simple: "After the probation period your notice period is four weeks.",
        standard: "After the probation period your notice period is four weeks, taking effect on the 15th or at the end of a calendar month.",
        detailed: "After the probation period your notice period is four weeks, taking effect on the 15th or at the end of a calendar month. The contract sets no period of its own and points at the law instead — this is the statutory baseline. For the employer it grows with your length of service; for you it stays the same.",
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
        standard: "Sie haben 28 bezahlte Urlaubstage im Jahr — mehr als den gesetzlichen Mindesturlaub von 20 Tagen bei einer Fünf-Tage-Woche.",
        detailed: "Sie haben 28 bezahlte Urlaubstage im Jahr, also acht Tage mehr als den gesetzlichen Mindesturlaub von 20 Tagen bei einer Fünf-Tage-Woche. Treten Sie unterjährig ein oder aus, wird der Anspruch anteilig gekürzt. Wie lange nicht genommener Urlaub ins nächste Jahr mitgenommen werden kann, steht nicht im Vertrag.",
      },
      en: {
        simple: "You get 28 paid holiday days a year.",
        standard: "You get 28 paid holiday days a year — more than the statutory minimum of 20 days on a five-day week.",
        detailed: "You get 28 paid holiday days a year, eight more than the statutory minimum of 20 days on a five-day week. If you join or leave part way through a year, the entitlement is reduced pro rata. How long untaken holiday can be carried into the next year is not stated in the contract.",
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
        simple: "Sie bekommen zusätzlich 1.200 € Urlaubsgeld im Jahr.",
        standard: "Sie bekommen zusätzlich 1.200 € Urlaubsgeld im Jahr, ausgezahlt einmal jährlich im Juni.",
        detailed: "Sie bekommen zusätzlich 1.200 € Urlaubsgeld im Jahr, ausgezahlt einmal jährlich im Juni. Zusammen mit zwölf Monatsgehältern von 3.440 € ergibt das eine Jahresvergütung von 42.480 € brutto. Ob die Zahlung auch in Jahren mit unterjährigem Ein- oder Austritt anteilig anfällt, regelt der Vertrag nicht.",
      },
      en: {
        simple: "You also get €1,200 of holiday pay a year.",
        standard: "You also get €1,200 of holiday pay a year, paid once annually in June.",
        detailed: "You also get €1,200 of holiday pay a year, paid once annually in June. Together with twelve monthly salaries of €3,440 that comes to €42,480 gross a year. The contract does not say whether the payment is pro-rated in a year you join or leave part way through.",
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
  {
    id: "overtime",
    page: 2,
    level: "check",
    tags: ["money", "responsibility", "risk"],
    quote: "§ 8 Mehrarbeit. Überstunden werden nur nach vorheriger Anordnung vergütet.",
    ref: { de: "§ 8 Mehrarbeit · Seite 2", en: "§ 8 Mehrarbeit · page 2" },
    title: { de: "Überstunden nur nach Anordnung vergütet", en: "Overtime is paid only when ordered in advance" },
    simple: {
      de: {
        simple: "Überstunden werden nur bezahlt, wenn sie vorher angeordnet wurden.",
        standard: "Überstunden werden nur bezahlt, wenn sie vorher angeordnet wurden — freiwillig geleistete Mehrarbeit wird nicht vergütet.",
        detailed: "Überstunden werden nur bezahlt, wenn sie vorher angeordnet wurden; freiwillig geleistete Mehrarbeit wird nicht vergütet. Lassen Sie sich eine Anordnung deshalb schriftlich oder wenigstens per Nachricht geben, bevor Sie länger bleiben. Wie Überstunden abgegolten werden — in Geld oder in Freizeit — sagt der Vertrag nicht.",
      },
      en: {
        simple: "Overtime is only paid if it was ordered in advance.",
        standard: "Overtime is only paid if it was ordered in advance — extra hours you put in voluntarily are not compensated.",
        detailed: "Overtime is only paid if it was ordered in advance; extra hours you put in voluntarily are not compensated. So get the instruction in writing, or at least in a message, before you stay late. The contract does not say how overtime is settled — in money or in time off.",
      },
    },
    means: {
      de: "Klären Sie vorab, wie angeordnete Überstunden berechnet oder durch Freizeit ausgeglichen werden.",
      en: "Clarify in advance how ordered overtime is calculated or compensated with time off.",
    },
    legal: {
      de: "Ob und wie Überstunden vergütet werden, hängt von der konkreten Vereinbarung und den Umständen ab.",
      en: "Whether and how overtime is compensated depends on the specific agreement and circumstances.",
    },
  },
  {
    id: "hours",
    page: 2,
    level: "standard",
    tags: ["responsibility"],
    quote:
      "§ 6 Arbeitszeit. Die regelmäßige wöchentliche Arbeitszeit beträgt 40 Stunden, verteilt auf fünf Werktage von Montag bis Freitag.",
    ref: { de: "§ 6 Arbeitszeit · Seite 2", en: "§ 6 Arbeitszeit · page 2" },
    title: { de: "40 Stunden pro Woche, Montag bis Freitag", en: "40 hours a week, Monday to Friday" },
    simple: {
      de: {
        simple: "Sie arbeiten 40 Stunden pro Woche.",
        standard: "Sie arbeiten 40 Stunden pro Woche, verteilt auf fünf Werktage von Montag bis Freitag — also acht Stunden am Tag.",
        detailed: "Sie arbeiten 40 Stunden pro Woche, verteilt auf fünf Werktage von Montag bis Freitag, also acht Stunden am Tag. Der Vertrag legt die Dauer fest, nicht aber Beginn und Ende des Arbeitstags; darüber entscheidet der Arbeitgeber im Rahmen seines Weisungsrechts. Eine Regelung zu Gleitzeit, Zeiterfassung oder mobiler Arbeit enthält er nicht.",
      },
      en: {
        simple: "You work 40 hours a week.",
        standard: "You work 40 hours a week over five working days, Monday to Friday — eight hours a day.",
        detailed: "You work 40 hours a week over five working days, Monday to Friday, which is eight hours a day. The contract fixes the length of the week but not when the day starts and ends; the employer decides that under its right to direct work. It says nothing about flexitime, time recording or remote work.",
      },
    },
    means: {
      de: "Klären Sie vor der Unterschrift, wie die Arbeitszeit erfasst wird und ob es feste Kernzeiten gibt.",
      en: "Before signing, clarify how working time is recorded and whether there are fixed core hours.",
    },
    legal: {
      de: "Die werktägliche Arbeitszeit darf acht Stunden nicht überschreiten und nur unter Ausgleich auf bis zu zehn Stunden verlängert werden (§ 3 ArbZG).",
      en: "Daily working time may not exceed eight hours and may only be extended to ten hours where it is averaged out (§ 3 ArbZG).",
    },
  },
];

const EMP_GLANCE: { key: L10n<string>; value: L10n<string>; derived?: boolean; clauseId?: string }[] = [
  { key: { de: "Vertragsart", en: "Contract type" }, value: { de: "Arbeitsvertrag", en: "Employment agreement" } },
  { key: { de: "Parteien", en: "Parties" }, value: { de: "Arbeitnehmer ↔ Arbeitgeber", en: "Employee ↔ Employer" } },
  { key: { de: "Beginn", en: "Start date" }, value: { de: "01.11.2026", en: "01.11.2026" } },
  { key: { de: "Laufzeit", en: "Duration" }, value: { de: "Unbefristet", en: "Indefinite" }, clauseId: "duration" },
  { key: { de: "Bruttogehalt", en: "Gross salary" }, value: { de: "3.440 € / Monat", en: "€3,440 / month" }, clauseId: "salary" },
  { key: { de: "Kündigungsfrist", en: "Notice period" }, value: { de: "2 Wochen (Probezeit)", en: "2 weeks (probation)" }, derived: true, clauseId: "probation" },
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
    glance: EMP_GLANCE.map((g) => ({ key: pick(g.key, lang), value: pick(g.value, lang), derived: g.derived, clauseId: g.clauseId })),
    money: {
      direction: "incoming",
      monthly: 3440,
      yearly: 41280,
      monthlyClauseId: "salary",
      yearlyClauseId: "salary",
      currency: "EUR",
      oneTime: [
        {
          label: lang === "de" ? "Urlaubsgeld" : "Holiday pay",
          amount: 1200,
          clauseId: "holiday",
          freq: "annual",
          timingMonth: 8, // paid in June; month index 8 in the Oct-anchored 12-month axis
          kind: "holiday_pay",
          ref: lang === "de" ? "§ 5 · Seite 1" : "§ 5 · page 1",
        },
      ],
      variable: [
        {
          label: lang === "de" ? "Überstundenvergütung" : "Overtime pay",
          clauseId: "overtime",
          note:
            lang === "de"
              ? "Nur nach vorheriger Anordnung vergütet — im Vertrag nicht beziffert."
              : "Paid only if ordered in advance — not quantified in the contract.",
        },
      ],
    },
    dates: EMP_DATES.map((d) => ({ date: pick(d.date, lang), title: pick(d.title, lang), body: pick(d.body, lang), tone: d.tone, iso: d.iso })),
    findings: ["salary", "overtime", "probation", "notice", "vacation"],
    rights: EMP_RIGHTS.map((r) => ({ clauseId: r.clauseId, text: pick(r.text, lang) })),
    duties: EMP_DUTIES.map((d) => ({ clauseId: d.clauseId, text: pick(d.text, lang) })),
    clauses,
    confidence: "high",
    warnings: [],
    decisionSummary: buildDecision(EMP_DECISION, lang),
  };
}

export const EMPLOYMENT_DOC_TEXT = [
  "Arbeitsvertrag",
  "zwischen der Nordlicht Systeme GmbH, Gertrudenstraße 8, 20095 Hamburg — nachfolgend Arbeitgeberin — und Frau Ayla Demir, Beim Grünen Jäger 21, 20359 Hamburg — nachfolgend Arbeitnehmerin — wird folgender Arbeitsvertrag geschlossen:",
  EMP.find((c) => c.id === "duration")!.quote,
  EMP.find((c) => c.id === "probation")!.quote,
  "§ 3 Tätigkeit. Die Arbeitnehmerin wird als Sachbearbeiterin im Bereich Kundenbetreuung eingestellt. Der Arbeitgeber kann ihr auch andere zumutbare Tätigkeiten zuweisen, die ihrer Vorbildung und ihren Fähigkeiten entsprechen.",
  EMP.find((c) => c.id === "salary")!.quote,
  EMP.find((c) => c.id === "holiday")!.quote,
  EMP.find((c) => c.id === "hours")!.quote,
  EMP.find((c) => c.id === "vacation")!.quote,
  EMP.find((c) => c.id === "overtime")!.quote,
  EMP.find((c) => c.id === "notice")!.quote,
  "§ 10 Schlussbestimmungen. Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform. Mündliche Nebenabreden bestehen nicht.",
].join("\n\n");
