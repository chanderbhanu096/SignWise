import type { ContractCategory, Depth, Lang, Level, Tag } from "./types";

// Contract-type-aware financial copy. One reusable shape; the heading, labels and
// chart title change with the category so salary is never framed as a "cost".
export interface FinancialCopy {
  heading: string;
  subheading: string;
  monthly: string;
  yearly: string;
  extrasHeading: string;
  chartTitle: string;
  receiveHeading: string;
  payHeading: string;
}

// UI chrome strings. The contract's *content* is explained in the user's language
// by the model (or the bilingual fixture); this file is only the surrounding UI.
// German and English are first-class; tr/uk/ar reuse the English chrome and rely
// on translated contract content — the point the challenge names is understanding
// the contract, not the buttons.

interface Strings {
  tagline: string;
  disclaimer: string;
  disclaimerLong: string;
  screens: { upload: string; analyzing: string; overview: string; original: string; decision: string };
  mobileView: string;
  mobileViewOn: string;
  mockupLabel: string;
  stubBanner: string;

  // upload
  hero: string;
  heroSub: string;
  dragText: string;
  fileTypes: string;
  uploadBtn: string;
  privacy: string;
  exampleBtn: string;
  exampleNote: string;

  // analyzing
  analyzingTitle: string;
  analyzingSub: string;
  steps: [string, string, string, string];
  skip: string;

  // overview
  glanceHeading: string;
  fileMeta: (pages: number) => string;
  explanationLevel: string;
  depth: Record<Depth, string>;
  findingsHeading: (n: number) => string;
  findingsSub: string;
  levelLegend: string;
  costHeading: string;
  costSub: string;
  everyMonth: string;
  overYear: string;
  oneTimeHeading: string;
  notMentioned: string;
  possibleAddl: string;
  first12: string;
  firstMonthHigher: string;
  datesHeading: string;
  datesSub: string;
  addCalendar: string;
  calAdded: string;
  rightsHeading: string;
  rightsSub: string;
  dutiesHeading: string;
  dutiesSub: string;
  showClause: string;
  askHeading: string;
  askSub: string;
  askPlaceholder: string;
  askBtn: string;
  askExplanation: string;
  askShowClause: string;
  viewOriginal: string;
  beforeSign: string;

  // original
  originalTitle: string;
  originalSub: string;
  backToSummary: string;
  explanationLabel: string;
  selectFinding: string;
  selectHint: string;

  // decision — the "Before you sign" brief
  decisionBriefLabel: string;
  decisionTitle: string;
  decisionSub: string;
  decisionSourceHint: string;
  decisionAgreeHeading: string;
  decisionAgreeSub: string;
  decisionReviewHeading: string;
  decisionReviewSub: string;
  decisionUnderstandHeading: string;
  decisionUnderstandSub: string;
  decisionClarifyHeading: string;
  decisionClarifySub: string;
  decisionAnswerLabel: string;
  whyLookAgain: string;
  reviewEmptyTitle: string;
  reviewEmptyBody: string;
  missingInfo: string;
  stateClear: string;
  stateClarify: string;
  reviewClause: string;
  downloadSummary: string;
  summaryReady: string;

  // clause panel
  fromContract: string;
  explainedBy: string;
  meansTitle: string;
  whyTitle: string;
  legalToggle: string;
  legalDisclaimer: string;
  showInDoc: string;
  close: string;
  aiMeta: (depth: string, lang: string) => string;

  // labels
  levelName: Record<Level, string>;
  tagName: Record<Tag, string>;
  langLabel: string;

  // confidence / errors
  lowConfidence: string;
  errorTitle: string;
  tryAgain: string;

  // contract-type-aware financial section
  financial: Record<ContractCategory, FinancialCopy>;
  suggestions: Record<string, string[]>; // keyed by contract subtype
  baseAnnual: string;
  additionalAnnual: string;
  totalAnnual: string;
  timingUnspecified: string;
  depositBump: string;
  bonusBump: string;

  // legal links
  viewOfficialLaw: string;

  // employment example (secondary upload option)
  employmentBtn: string;
  employmentNote: string;
}

const EN: Strings = {
  tagline: "Your contract. Explained clearly.",
  disclaimer: "This tool explains your contract; it does not replace legal advice.",
  disclaimerLong:
    "This tool explains your contract; it does not replace legal advice. For a binding opinion, contact a lawyer or an appropriate advice centre (e.g. a consumer or tenants’ association).",
  screens: { upload: "1 · Upload", analyzing: "2 · Analysis", overview: "3 · Overview", original: "4 · Original", decision: "5 · Before you sign" },
  mobileView: "Mobile view",
  mobileViewOn: "Mobile view ✓",
  mockupLabel: "Screens",
  stubBanner: "Demo mode — showing the sample analysis. Connect the model to read your own contract.",
  hero: "Know what you’re signing.",
  heroSub: "Upload your contract and we’ll explain the important parts in plain language.",
  dragText: "Drag your contract here",
  fileTypes: "PDF, DOCX or image · up to 20 pages",
  uploadBtn: "Upload contract",
  privacy:
    "Your document is processed only to create your explanation. It is not stored after your session, and never used for training.",
  exampleBtn: "Try with an example contract",
  exampleNote: "A sample rental agreement — nothing to upload.",
  analyzingTitle: "We’re turning the legal language into something easier to understand.",
  analyzingSub: "This usually takes under a minute. You can stay on this page.",
  steps: ["Reading your contract", "Finding important clauses", "Checking costs and deadlines", "Preparing your summary"],
  skip: "Skip ahead to my summary",
  glanceHeading: "Your contract at a glance",
  fileMeta: (p) => `${p} pages · explained in English`,
  explanationLevel: "Explanation level",
  depth: { simple: "Simple", standard: "Standard", detailed: "Detailed" },
  findingsHeading: (n) => `${n} things to know before you sign`,
  findingsSub: "Select any item to see the exact wording in your contract.",
  levelLegend:
    "Levels: Important affects money, obligations or cancellation · Worth checking may matter depending on your situation · Standard is a common provision.",
  costHeading: "What will this cost me?",
  costSub: "Based on the amounts written in your contract.",
  everyMonth: "Every month",
  overYear: "Over one year",
  oneTimeHeading: "One-time, at the start",
  notMentioned: "Not mentioned in your contract",
  possibleAddl: "Possible additional costs",
  first12: "Your first 12 months",
  firstMonthHigher: "First month is higher because of the deposit",
  datesHeading: "Important dates",
  datesSub: "Missing a deadline can have real financial consequences, so these matter most.",
  addCalendar: "Add deadline to calendar",
  calAdded: "A reminder file (.ics) has been downloaded — open it to add the deadline to your calendar.",
  rightsHeading: "Your rights",
  rightsSub: "What the contract says you can expect.",
  dutiesHeading: "Your responsibilities",
  dutiesSub: "What you agree to do by signing.",
  showClause: "Show clause",
  askHeading: "Ask about this contract…",
  askSub: "Answers point back to the wording in your document.",
  askPlaceholder: "Type your question…",
  askBtn: "Ask",
  askExplanation: "SignWise explanation",
  askShowClause: "Show the clause this comes from",
  viewOriginal: "View original contract",
  beforeSign: "Before you sign →",
  originalTitle: "Original contract",
  originalSub: "Highlighted passages are the ones your findings come from.",
  backToSummary: "← Back to summary",
  explanationLabel: "Explanation",
  selectFinding: "Select a finding",
  selectHint: "Choose one of the findings below and we’ll explain the passage next to it in plain language.",
  decisionBriefLabel: "Your decision brief",
  decisionTitle: "Before you sign",
  decisionSub: "Here is what this contract means for you — and what may still deserve your attention.",
  decisionSourceHint: "Use the available source links to return to the wording in your contract.",
  decisionAgreeHeading: "What you’re agreeing to",
  decisionAgreeSub: "The most important practical consequences stated in this contract.",
  decisionReviewHeading: "Worth another look",
  decisionReviewSub: "Consequential clauses to inspect once more before deciding.",
  decisionUnderstandHeading: "Check your understanding",
  decisionUnderstandSub: "Open each question and make sure you can explain the answer in your own words.",
  decisionClarifyHeading: "Questions to clarify",
  decisionClarifySub: "The contract leaves these points open or does not give a complete amount.",
  decisionAnswerLabel: "Answer from your contract",
  whyLookAgain: "Why look again?",
  reviewEmptyTitle: "No additional review points were identified",
  reviewEmptyBody: "This does not mean the contract has been legally reviewed. You can still inspect any clause in the original contract.",
  missingInfo: "We couldn’t find this information in the contract.",
  stateClear: "Clear from contract",
  stateClarify: "Clarify with the other party",
  reviewClause: "Review the clause",
  downloadSummary: "Print / save my summary",
  summaryReady: "The print window is opening — choose Save as PDF to keep a copy.",
  fromContract: "From your contract",
  explainedBy: "Explained by SignWise",
  meansTitle: "What this means for you",
  whyTitle: "Why it matters",
  legalToggle: "Relevant legal context (general information)",
  legalDisclaimer: "General information about German law — not a statement about your contract, and not legal advice.",
  showInDoc: "Show this in the original document",
  close: "Close",
  aiMeta: (d, l) => `AI explanation · ${d} · ${l}`,
  levelName: { important: "Important", check: "Worth checking", standard: "Standard" },
  tagName: { money: "Money", deadline: "Deadline", responsibility: "Responsibility", risk: "Risk" },
  langLabel: "English",
  lowConfidence:
    "SignWise is less certain about this contract than usual — the document may be scanned, unusual, or hard to read. Treat the summary as a first orientation and check the original wording.",
  errorTitle: "We couldn’t read that file",
  tryAgain: "Try another file",
  financial: {
    expense: {
      heading: "What will this cost me?",
      subheading: "Based on the amounts written in your contract.",
      monthly: "Every month",
      yearly: "Over one year",
      extrasHeading: "One-time, at the start",
      chartTitle: "Your cost over 12 months",
      receiveHeading: "You receive",
      payHeading: "You pay",
    },
    income: {
      heading: "Your compensation",
      subheading: "Based on the salary and payments stated in your contract.",
      monthly: "Gross per month",
      yearly: "Gross per year",
      extrasHeading: "Additional compensation",
      chartTitle: "Your compensation over 12 months",
      receiveHeading: "You receive",
      payHeading: "You pay",
    },
    mixed: {
      heading: "Your financial overview",
      subheading: "Based on the amounts stated in your contract.",
      monthly: "Every month",
      yearly: "Over one year",
      extrasHeading: "Other amounts",
      chartTitle: "Your money over 12 months",
      receiveHeading: "You receive",
      payHeading: "You pay",
    },
    neutral: {
      heading: "Financial terms",
      subheading: "The financial terms stated in your contract.",
      monthly: "Amount",
      yearly: "Per year",
      extrasHeading: "Other amounts",
      chartTitle: "",
      receiveHeading: "You receive",
      payHeading: "You pay",
    },
  },
  suggestions: {
    rental: ["Can my rent increase?", "How do I cancel?", "What happens if I move out early?", "What additional costs can I be charged?"],
    employment: ["What is my salary?", "What is my notice period?", "Is there a probation period?", "How much vacation do I get?", "Are overtime hours paid?"],
    subscription: ["When can I cancel?", "Does the contract renew automatically?", "Can the price increase?", "Are there additional fees?"],
    insurance: ["What does the policy cover?", "What is excluded?", "What deductible applies?", "When can I cancel?"],
    loan: ["What is the interest rate?", "What are the monthly repayments?", "Can I repay early?", "What happens if I miss a payment?"],
    generic: ["What are my main obligations?", "How and when can I cancel?", "What are the key dates?", "Explain this in simpler language."],
  },
  baseAnnual: "Base annual salary",
  additionalAnnual: "Additional payments",
  totalAnnual: "Potential total annual compensation",
  timingUnspecified: "Additional payment — timing not specified",
  depositBump: "The first month is higher because of the deposit.",
  bonusBump: "A highlighted month includes a bonus or holiday payment.",
  viewOfficialLaw: "View official law ↗",
  employmentBtn: "Or try an employment contract",
  employmentNote: "A sample employment agreement.",
};

const DE: Strings = {
  tagline: "Ihr Vertrag. Klar erklärt.",
  disclaimer: "Dieses Tool erklärt Ihren Vertrag; es ersetzt keine Rechtsberatung.",
  disclaimerLong:
    "Dieses Tool erklärt Ihren Vertrag; es ersetzt keine Rechtsberatung. Für eine verbindliche Einschätzung wenden Sie sich an einen Anwalt oder eine geeignete Beratungsstelle (z. B. Verbraucher- oder Mieterverein).",
  screens: { upload: "1 · Hochladen", analyzing: "2 · Analyse", overview: "3 · Überblick", original: "4 · Original", decision: "5 · Vor der Unterschrift" },
  mobileView: "Mobile Ansicht",
  mobileViewOn: "Mobile Ansicht ✓",
  mockupLabel: "Bildschirme",
  stubBanner: "Demo-Modus — es wird die Beispielanalyse gezeigt. Verbinden Sie das Modell, um Ihren eigenen Vertrag zu lesen.",
  hero: "Wissen, was Sie unterschreiben.",
  heroSub: "Laden Sie Ihren Vertrag hoch, und wir erklären die wichtigen Teile in einfacher Sprache.",
  dragText: "Vertrag hierher ziehen",
  fileTypes: "PDF, DOCX oder Bild · bis zu 20 Seiten",
  uploadBtn: "Vertrag hochladen",
  privacy:
    "Ihr Dokument wird nur zur Erstellung Ihrer Erklärung verarbeitet. Es wird nach Ihrer Sitzung nicht gespeichert und niemals für Training verwendet.",
  exampleBtn: "Mit einem Beispielvertrag testen",
  exampleNote: "Ein Beispiel-Mietvertrag — Sie müssen nichts hochladen.",
  analyzingTitle: "Wir übersetzen die Rechtssprache in etwas Verständlicheres.",
  analyzingSub: "Das dauert meist unter einer Minute. Sie können auf dieser Seite bleiben.",
  steps: ["Vertrag wird gelesen", "Wichtige Klauseln werden gesucht", "Kosten und Fristen werden geprüft", "Ihre Zusammenfassung wird erstellt"],
  skip: "Direkt zur Zusammenfassung",
  glanceHeading: "Ihr Vertrag auf einen Blick",
  fileMeta: (p) => `${p} Seiten · erklärt auf Deutsch`,
  explanationLevel: "Erklärungstiefe",
  depth: { simple: "Einfach", standard: "Standard", detailed: "Ausführlich" },
  findingsHeading: (n) => `${n} Dinge, die Sie vor der Unterschrift wissen sollten`,
  findingsSub: "Wählen Sie einen Punkt, um den genauen Wortlaut in Ihrem Vertrag zu sehen.",
  levelLegend:
    "Stufen: Wichtig betrifft Geld, Pflichten oder Kündigung · Prüfenswert kann je nach Situation relevant sein · Standard ist eine übliche Regelung.",
  costHeading: "Was kostet mich das?",
  costSub: "Basierend auf den in Ihrem Vertrag genannten Beträgen.",
  everyMonth: "Jeden Monat",
  overYear: "Über ein Jahr",
  oneTimeHeading: "Einmalig, zu Beginn",
  notMentioned: "Nicht im Vertrag erwähnt",
  possibleAddl: "Mögliche zusätzliche Kosten",
  first12: "Ihre ersten 12 Monate",
  firstMonthHigher: "Der erste Monat ist wegen der Kaution höher",
  datesHeading: "Wichtige Termine",
  datesSub: "Eine verpasste Frist kann echte finanzielle Folgen haben — deshalb zählen diese am meisten.",
  addCalendar: "Frist zum Kalender hinzufügen",
  calAdded: "Eine Erinnerungsdatei (.ics) wurde heruntergeladen — öffnen Sie sie, um die Frist in Ihren Kalender zu übernehmen.",
  rightsHeading: "Ihre Rechte",
  rightsSub: "Was Sie laut Vertrag erwarten dürfen.",
  dutiesHeading: "Ihre Pflichten",
  dutiesSub: "Wozu Sie sich mit der Unterschrift verpflichten.",
  showClause: "Klausel anzeigen",
  askHeading: "Fragen Sie zu diesem Vertrag…",
  askSub: "Antworten verweisen zurück auf den Wortlaut in Ihrem Dokument.",
  askPlaceholder: "Ihre Frage eingeben…",
  askBtn: "Fragen",
  askExplanation: "SignWise-Erklärung",
  askShowClause: "Die zugehörige Klausel anzeigen",
  viewOriginal: "Originalvertrag ansehen",
  beforeSign: "Vor der Unterschrift →",
  originalTitle: "Originalvertrag",
  originalSub: "Hervorgehobene Passagen sind die, aus denen Ihre Punkte stammen.",
  backToSummary: "← Zurück zur Zusammenfassung",
  explanationLabel: "Erklärung",
  selectFinding: "Einen Punkt auswählen",
  selectHint: "Wählen Sie unten einen der Punkte, und wir erklären die Passage daneben in einfacher Sprache.",
  decisionBriefLabel: "Ihre Entscheidungshilfe",
  decisionTitle: "Vor der Unterschrift",
  decisionSub: "Das bedeutet dieser Vertrag für Sie — und das verdient vielleicht noch Ihre Aufmerksamkeit.",
  decisionSourceHint: "Über die verfügbaren Quellenlinks gelangen Sie zurück zum Wortlaut in Ihrem Vertrag.",
  decisionAgreeHeading: "Was Sie zusagen",
  decisionAgreeSub: "Die wichtigsten praktischen Folgen, die in diesem Vertrag stehen.",
  decisionReviewHeading: "Genauer ansehen",
  decisionReviewSub: "Folgenreiche Klauseln, die Sie vor Ihrer Entscheidung noch einmal prüfen sollten.",
  decisionUnderstandHeading: "Prüfen Sie Ihr Verständnis",
  decisionUnderstandSub: "Öffnen Sie jede Frage und prüfen Sie, ob Sie die Antwort mit eigenen Worten erklären können.",
  decisionClarifyHeading: "Fragen, die Sie klären sollten",
  decisionClarifySub: "Diese Punkte lässt der Vertrag offen oder nennt keinen vollständigen Betrag.",
  decisionAnswerLabel: "Antwort aus Ihrem Vertrag",
  whyLookAgain: "Warum nochmal ansehen?",
  reviewEmptyTitle: "Keine zusätzlichen Prüfpunkte gefunden",
  reviewEmptyBody: "Das bedeutet nicht, dass der Vertrag rechtlich geprüft wurde. Sie können jede Klausel im Originalvertrag ansehen.",
  missingInfo: "Wir konnten diese Information im Vertrag nicht finden.",
  stateClear: "Im Vertrag klar genannt",
  stateClarify: "Mit der anderen Partei klären",
  reviewClause: "Klausel prüfen",
  downloadSummary: "Zusammenfassung drucken / speichern",
  summaryReady: "Das Druckfenster öffnet sich — wählen Sie Als PDF speichern, um eine Kopie zu behalten.",
  fromContract: "Aus Ihrem Vertrag",
  explainedBy: "Von SignWise erklärt",
  meansTitle: "Was das für Sie bedeutet",
  whyTitle: "Warum es wichtig ist",
  legalToggle: "Relevanter rechtlicher Kontext (allgemeine Information)",
  legalDisclaimer: "Allgemeine Informationen zum deutschen Recht — keine Aussage über Ihren Vertrag und keine Rechtsberatung.",
  showInDoc: "Dies im Originaldokument anzeigen",
  close: "Schließen",
  aiMeta: (d, l) => `KI-Erklärung · ${d} · ${l}`,
  levelName: { important: "Wichtig", check: "Prüfenswert", standard: "Standard" },
  tagName: { money: "Geld", deadline: "Frist", responsibility: "Pflicht", risk: "Risiko" },
  langLabel: "Deutsch",
  lowConfidence:
    "SignWise ist bei diesem Vertrag unsicherer als sonst — das Dokument ist vielleicht gescannt, ungewöhnlich oder schwer lesbar. Sehen Sie die Zusammenfassung als erste Orientierung und prüfen Sie den Originalwortlaut.",
  errorTitle: "Wir konnten diese Datei nicht lesen",
  tryAgain: "Andere Datei versuchen",
  financial: {
    expense: {
      heading: "Was kostet mich das?",
      subheading: "Basierend auf den in Ihrem Vertrag genannten Beträgen.",
      monthly: "Jeden Monat",
      yearly: "Über ein Jahr",
      extrasHeading: "Einmalig, zu Beginn",
      chartTitle: "Ihre Kosten über 12 Monate",
      receiveHeading: "Sie erhalten",
      payHeading: "Sie zahlen",
    },
    income: {
      heading: "Ihre Vergütung",
      subheading: "Basierend auf dem in Ihrem Vertrag genannten Gehalt und den Zahlungen.",
      monthly: "Brutto pro Monat",
      yearly: "Brutto pro Jahr",
      extrasHeading: "Zusätzliche Vergütung",
      chartTitle: "Ihre Vergütung über 12 Monate",
      receiveHeading: "Sie erhalten",
      payHeading: "Sie zahlen",
    },
    mixed: {
      heading: "Ihre Finanzübersicht",
      subheading: "Basierend auf den in Ihrem Vertrag genannten Beträgen.",
      monthly: "Jeden Monat",
      yearly: "Über ein Jahr",
      extrasHeading: "Weitere Beträge",
      chartTitle: "Ihr Geld über 12 Monate",
      receiveHeading: "Sie erhalten",
      payHeading: "Sie zahlen",
    },
    neutral: {
      heading: "Finanzielle Bedingungen",
      subheading: "Die in Ihrem Vertrag genannten finanziellen Bedingungen.",
      monthly: "Betrag",
      yearly: "Pro Jahr",
      extrasHeading: "Weitere Beträge",
      chartTitle: "",
      receiveHeading: "Sie erhalten",
      payHeading: "Sie zahlen",
    },
  },
  suggestions: {
    rental: ["Kann meine Miete steigen?", "Wie kündige ich?", "Was passiert, wenn ich früher ausziehe?", "Welche Zusatzkosten können anfallen?"],
    employment: ["Wie hoch ist mein Gehalt?", "Wie lang ist meine Kündigungsfrist?", "Gibt es eine Probezeit?", "Wie viel Urlaub bekomme ich?", "Werden Überstunden bezahlt?"],
    subscription: ["Wann kann ich kündigen?", "Verlängert sich der Vertrag automatisch?", "Kann der Preis steigen?", "Fallen Zusatzkosten an?"],
    insurance: ["Was deckt die Versicherung ab?", "Was ist ausgeschlossen?", "Welcher Selbstbehalt gilt?", "Wann kann ich kündigen?"],
    loan: ["Wie hoch ist der Zinssatz?", "Wie hoch sind die monatlichen Raten?", "Kann ich vorzeitig zurückzahlen?", "Was passiert, wenn ich eine Rate verpasse?"],
    generic: ["Was sind meine wichtigsten Pflichten?", "Wie und wann kann ich kündigen?", "Was sind die wichtigen Termine?", "Erkläre das einfacher."],
  },
  baseAnnual: "Jahresgrundgehalt",
  additionalAnnual: "Zusätzliche Zahlungen",
  totalAnnual: "Mögliche Gesamtvergütung pro Jahr",
  timingUnspecified: "Zusätzliche Zahlung — Zeitpunkt nicht angegeben",
  depositBump: "Der erste Monat ist wegen der Kaution höher.",
  bonusBump: "Ein hervorgehobener Monat enthält eine Bonus- oder Sonderzahlung.",
  viewOfficialLaw: "Gesetz im Original ansehen ↗",
  employmentBtn: "Oder einen Arbeitsvertrag testen",
  employmentNote: "Ein Beispiel-Arbeitsvertrag.",
};

export function t(lang: Lang): Strings {
  return lang === "de" ? DE : EN;
}
