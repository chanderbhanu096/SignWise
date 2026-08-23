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
  slogans: string[]; // rotate one at a time in the header
  languageSelector: string;
  translating: string;
  askThinking: string;
  chartScaleNote: string;
  chartProjectionNote: string;
  newContractTitle: string;
  newContractBody: string;
  newContractCancel: string;
  newContractConfirm: string;
  disclaimer: string;
  disclaimerLong: string;
  screens: { overview: string; original: string; decision: string };
  mockupLabel: string;
  newContract: string;
  stubBanner: string;

  // upload
  uploadEyebrow: string;
  hero: string;
  heroSub: string;
  benefitLabel: string;
  uploadBenefits: [string, string, string];
  uploadHeading: string;
  uploadSub: string;
  uploadTime: string;
  dragText: string;
  fileTypes: string;
  uploadBtn: string;
  privacy: string;
  exampleEyebrow: string;
  exampleHeading: string;
  exampleSub: string;
  exampleBtn: string;
  exampleNote: string;

  // analyzing
  analyzingTitle: string;
  analyzingSub: string;
  steps: [string, string, string, string];
  analyzingElapsed: (clock: string) => string;
  analyzingPatience: [string, string]; // shown after 15s, then after 40s
  cancelAnalysis: string;

  // overview
  glanceHeading: string;
  fileMeta: (pages: number) => string;
  explanationLevel: string;
  depth: Record<Depth, string>;
  findingsHeading: (n: number) => string;
  findingsSub: string;
  levelLegend: string;
  attentionHeading: string;
  attentionNoteToggle: string;
  attentionNote: string;
  attentionScope: (clauses: number, findings: number) => string;
  filterAll: string;
  filterShowing: (shown: number, total: number) => string;
  sectionCount: (n: number) => string;
  noAmounts: string;
  rightsDutiesHeading: string;
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
  slogans: [
    "Know what you sign.",
    "Your contract, explained.",
    "See the signs. Read between the lines.",
  ],
  languageSelector: "Language",
  translating: "Translating your analysis…",
  askThinking: "Reading your contract for an answer…",
  chartScaleNote: "Bar heights are compressed so the regular months stay readable. The figures above each bar are exact.",
  chartProjectionNote:
    "A projection from the amounts written in your contract, assuming they stay the same. Any increase or change your contract allows is not included here.",
  newContractTitle: "Start with a new contract?",
  newContractBody: "This explanation will be discarded. Download the summary first if you want to keep it.",
  newContractCancel: "Keep this contract",
  newContractConfirm: "Start over",
  disclaimer: "This tool explains your contract; it does not replace legal advice.",
  disclaimerLong:
    "This tool explains your contract; it does not replace legal advice. For a binding opinion, contact a lawyer or an appropriate advice centre (e.g. a consumer or tenants’ association).",
  screens: { overview: "Overview", original: "Contract text", decision: "Before you sign" },
  mockupLabel: "Views of this contract",
  newContract: "New contract",
  stubBanner: "Demo mode — showing the sample analysis. Connect the model to read your own contract.",
  uploadEyebrow: "Clarity before you sign",
  hero: "Understand your contract before you sign.",
  heroSub:
    "Upload your contract to see key costs, deadlines and responsibilities in plain language — with links back to the original wording.",
  benefitLabel: "What you’ll see",
  uploadBenefits: [
    "Costs and payments",
    "Deadlines and cancellation",
    "Rights and responsibilities",
  ],
  uploadHeading: "Upload your contract",
  uploadSub: "Choose a file or drag it here to begin.",
  uploadTime: "Usually under 1 min",
  dragText: "Drop your contract here",
  fileTypes: "PDF, JPG, PNG or WebP · max. 4 MB",
  uploadBtn: "Choose contract file",
  privacy:
    "Your document is used to create this analysis. Only upload documents you’re allowed to share.",
  exampleEyebrow: "No contract ready?",
  exampleHeading: "See how SignWise works",
  exampleSub: "Open a prepared rental contract and explore the complete explanation. No upload required.",
  exampleBtn: "View rental example",
  exampleNote: "Rent, deposit, notice period and key clauses",
  analyzingTitle: "We’re turning the legal language into something easier to understand.",
  analyzingSub: "This usually takes under a minute. You can stay on this page.",
  steps: ["Reading your contract", "Finding important clauses", "Checking costs and deadlines", "Preparing your summary"],
  analyzingElapsed: (c) => `Running for ${c}`,
  analyzingPatience: [
    "Longer contracts take more time — yours is still being read.",
    "Still working. A long or scanned contract can take a while; you can keep waiting or cancel and try again.",
  ],
  cancelAnalysis: "Cancel and go back",
  glanceHeading: "Your contract at a glance",
  fileMeta: (p) => `${p} pages · explained in English`,
  explanationLevel: "Explanation level",
  depth: { simple: "Simple", standard: "Standard", detailed: "Detailed" },
  findingsHeading: (n) => `${n} things to know before you sign`,
  findingsSub: "Select any item to see the exact wording in your contract.",
  levelLegend:
    "Levels: Important affects money, obligations or cancellation · Worth checking may matter depending on your situation · Standard is a common provision.",
  attentionHeading: "What deserves your attention",
  attentionNoteToggle: "What do these levels mean?",
  attentionNote:
    "These levels show how much attention something deserves. They do not say whether a clause is legally valid — SignWise never judges that.",
  attentionScope: (clauses, findings) =>
    `SignWise looked at ${clauses} clauses. Below are the ${findings} that matter most — select a level to see every clause in it.`,
  filterAll: "Show all",
  filterShowing: (shown, total) => `Showing ${shown} of ${total} findings.`,
  sectionCount: (n) => `${n} ${n === 1 ? "item" : "items"}`,
  noAmounts: "This contract does not state any amounts.",
  rightsDutiesHeading: "Your rights and responsibilities",
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
  decisionReviewHeading: "Read these again before you sign",
  decisionReviewSub: "These clauses have the biggest consequences for you.",
  decisionUnderstandHeading: "Can you explain it in your own words?",
  decisionUnderstandSub: "Open each question and check your answer against the contract.",
  decisionClarifyHeading: "Ask the other side about these",
  decisionClarifySub: "The contract leaves these points open or does not give a complete amount.",
  decisionAnswerLabel: "Answer from your contract",
  whyLookAgain: "Why look again?",
  reviewEmptyTitle: "No additional review points were identified",
  reviewEmptyBody: "This does not mean the contract has been legally reviewed. You can still inspect any clause in the original contract.",
  missingInfo: "We couldn’t find this information in the contract.",
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
  employmentBtn: "Also view an employment example",
  employmentNote: "Salary, probation and overtime",
};

const DE: Strings = {
  tagline: "Ihr Vertrag. Klar erklärt.",
  slogans: [
    "Dein Vertrag, einfach erklärt.",
    "Erst verstehen, dann unterschreiben.",
    "Verträge verständlich gemacht.",
  ],
  languageSelector: "Sprache",
  translating: "Ihre Analyse wird übersetzt…",
  askThinking: "Der Vertrag wird nach einer Antwort durchsucht…",
  chartScaleNote: "Die Balkenhöhen sind gestaucht, damit die regulären Monate lesbar bleiben. Die Beträge über den Balken sind exakt.",
  chartProjectionNote:
    "Eine Hochrechnung aus den in Ihrem Vertrag genannten Beträgen, unter der Annahme, dass sie gleich bleiben. Im Vertrag mögliche Erhöhungen oder Änderungen sind hier nicht enthalten.",
  newContractTitle: "Mit einem neuen Vertrag beginnen?",
  newContractBody: "Diese Erklärung wird verworfen. Laden Sie die Zusammenfassung vorher herunter, wenn Sie sie behalten möchten.",
  newContractCancel: "Diesen Vertrag behalten",
  newContractConfirm: "Neu beginnen",
  disclaimer: "Dieses Tool erklärt Ihren Vertrag; es ersetzt keine Rechtsberatung.",
  disclaimerLong:
    "Dieses Tool erklärt Ihren Vertrag; es ersetzt keine Rechtsberatung. Für eine verbindliche Einschätzung wenden Sie sich an einen Anwalt oder eine geeignete Beratungsstelle (z. B. Verbraucher- oder Mieterverein).",
  screens: { overview: "Überblick", original: "Vertragstext", decision: "Vor der Unterschrift" },
  mockupLabel: "Ansichten dieses Vertrags",
  newContract: "Neuer Vertrag",
  stubBanner: "Demo-Modus — es wird die Beispielanalyse gezeigt. Verbinden Sie das Modell, um Ihren eigenen Vertrag zu lesen.",
  uploadEyebrow: "Klarheit vor der Unterschrift",
  hero: "Vertrag verstehen, bevor Sie unterschreiben.",
  heroSub:
    "Laden Sie Ihren Vertrag hoch und sehen Sie wichtige Kosten, Fristen und Pflichten in verständlicher Sprache — mit Verweisen auf den Originalwortlaut.",
  benefitLabel: "Das sehen Sie auf einen Blick",
  uploadBenefits: [
    "Kosten und Zahlungen",
    "Fristen und Kündigung",
    "Rechte und Pflichten",
  ],
  uploadHeading: "Vertrag hochladen",
  uploadSub: "Datei auswählen oder hierher ziehen, um zu starten.",
  uploadTime: "Meist unter 1 Min.",
  dragText: "Vertrag hier ablegen",
  fileTypes: "PDF, JPG, PNG oder WebP · max. 4 MB",
  uploadBtn: "Vertragsdatei auswählen",
  privacy:
    "Ihr Dokument wird verwendet, um diese Analyse zu erstellen. Laden Sie nur Dokumente hoch, die Sie teilen dürfen.",
  exampleEyebrow: "Kein Vertrag zur Hand?",
  exampleHeading: "So funktioniert SignWise",
  exampleSub: "Öffnen Sie einen vorbereiteten Mietvertrag und erkunden Sie die vollständige Erklärung. Kein Upload erforderlich.",
  exampleBtn: "Mietvertrags-Beispiel ansehen",
  exampleNote: "Miete, Kaution, Kündigungsfrist und wichtige Klauseln",
  analyzingTitle: "Wir übersetzen die Rechtssprache in etwas Verständlicheres.",
  analyzingSub: "Das dauert meist unter einer Minute. Sie können auf dieser Seite bleiben.",
  steps: ["Vertrag wird gelesen", "Wichtige Klauseln werden gesucht", "Kosten und Fristen werden geprüft", "Ihre Zusammenfassung wird erstellt"],
  analyzingElapsed: (c) => `Läuft seit ${c}`,
  analyzingPatience: [
    "Längere Verträge brauchen mehr Zeit — Ihrer wird noch gelesen.",
    "Wird weiter bearbeitet. Ein langer oder gescannter Vertrag kann dauern; Sie können warten oder abbrechen und es erneut versuchen.",
  ],
  cancelAnalysis: "Abbrechen und zurück",
  glanceHeading: "Ihr Vertrag auf einen Blick",
  fileMeta: (p) => `${p} Seiten · erklärt auf Deutsch`,
  explanationLevel: "Erklärungstiefe",
  depth: { simple: "Einfach", standard: "Standard", detailed: "Ausführlich" },
  findingsHeading: (n) => `${n} Dinge, die Sie vor der Unterschrift wissen sollten`,
  findingsSub: "Wählen Sie einen Punkt, um den genauen Wortlaut in Ihrem Vertrag zu sehen.",
  levelLegend:
    "Stufen: Wichtig betrifft Geld, Pflichten oder Kündigung · Prüfenswert kann je nach Situation relevant sein · Standard ist eine übliche Regelung.",
  attentionHeading: "Was Ihre Aufmerksamkeit verdient",
  attentionNoteToggle: "Was bedeuten diese Stufen?",
  attentionNote:
    "Die Stufen zeigen, welche Punkte besondere Aufmerksamkeit verdienen. Sie bewerten nicht die rechtliche Wirksamkeit einer Klausel — das beurteilt SignWise nie.",
  attentionScope: (clauses, findings) =>
    `SignWise hat ${clauses} Klauseln geprüft. Unten stehen die ${findings} wichtigsten — wählen Sie eine Stufe, um alle Klauseln darin zu sehen.`,
  filterAll: "Alle anzeigen",
  filterShowing: (shown, total) => `${shown} von ${total} Punkten werden angezeigt.`,
  sectionCount: (n) => `${n} ${n === 1 ? "Eintrag" : "Einträge"}`,
  noAmounts: "Dieser Vertrag nennt keine Beträge.",
  rightsDutiesHeading: "Ihre Rechte und Pflichten",
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
  decisionReviewHeading: "Vor der Unterschrift noch einmal lesen",
  decisionReviewSub: "Diese Klauseln haben für Sie die größten Folgen.",
  decisionUnderstandHeading: "Können Sie es in eigenen Worten erklären?",
  decisionUnderstandSub: "Öffnen Sie jede Frage und vergleichen Sie Ihre Antwort mit dem Vertrag.",
  decisionClarifyHeading: "Das sollten Sie nachfragen",
  decisionClarifySub: "Diese Punkte lässt der Vertrag offen oder nennt keinen vollständigen Betrag.",
  decisionAnswerLabel: "Antwort aus Ihrem Vertrag",
  whyLookAgain: "Warum nochmal ansehen?",
  reviewEmptyTitle: "Keine zusätzlichen Prüfpunkte gefunden",
  reviewEmptyBody: "Das bedeutet nicht, dass der Vertrag rechtlich geprüft wurde. Sie können jede Klausel im Originalvertrag ansehen.",
  missingInfo: "Wir konnten diese Information im Vertrag nicht finden.",
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
  employmentBtn: "Auch ein Arbeitsvertrags-Beispiel ansehen",
  employmentNote: "Gehalt, Probezeit und Überstunden",
};

export function t(lang: Lang): Strings {
  return lang === "de" ? DE : EN;
}
