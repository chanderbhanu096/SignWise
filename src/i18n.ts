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
  fileMeta: (pages: number | null) => string;
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
  addCalendar: (date: string) => string;
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
  // statutory benchmarks (src/lawcheck.ts)
  lawHeading: string;
  lawSub: string;
  lawRuleLabel: string;
  lawContractLabel: string;
  lawScope: (n: number) => string;
  lawLimit: string;
  lawEmptyTitle: string;
  lawEmptyBody: (n: number) => string;
  lawPanelLabel: string;
  pageTitle: string;
  figuresHeading: string;
  figuresNote: string;
  figInClause: (ref: string) => string;
  figInOther: (ref: string) => string;
  figDerived: (expr: string, ref: string) => string;
  figContext: string;
  // legal & data-protection notice (src/components/LegalNotice.tsx)
  legalNoticeLink: string;
  legalNoticeTitle: string;
  legalNoticeSections: Array<{ heading: string; items: Array<{ term: string; text: string }> }>;
  legalNoticeFoot: string;
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
  fileMeta: (p) => (p ? `${p} page${p === 1 ? "" : "s"} · explained in English` : "explained in English"),
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
  addCalendar: (d) => `Add ${d} to calendar`,
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
  originalTitle: "The contract itself",
  originalSub: "Your contract in full. Marked passages are the ones a finding came from — select one to see its explanation.",
  backToSummary: "← Back to summary",
  explanationLabel: "Explanation",
  selectFinding: "Select a finding",
  selectHint: "Choose one of the findings below and we’ll explain the passage next to it in plain language.",
  decisionBriefLabel: "Your decision brief",
  decisionTitle: "Before you sign",
  decisionSub: "Here is what this contract means for you — and what may still deserve your attention.",
  decisionSourceHint: "Every point here links back to the wording it came from.",
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
  lawHeading: "Statutory benchmarks",
  lawSub:
    "SignWise compares individual figures and wordings in your contract against what German law lays down in general. It does not assess whether a clause is valid.",
  lawRuleLabel: "What the law says in general",
  lawContractLabel: "What your contract says",
  lawScope: (n) => `${n} benchmark${n === 1 ? "" : "s"} apply to this type of contract and were checked.`,
  lawLimit:
    "This comparison is information, not legal advice, and not a validity check. Whether a clause holds in your case is something only legal advice can judge — a tenants’ association, a consumer advice centre or a lawyer.",
  lawEmptyTitle: "No divergence found",
  lawEmptyBody: (n) =>
    `None of the ${n} benchmark${n === 1 ? "" : "s"} that apply to this type of contract diverges from your contract. That does not mean the contract is unproblematic overall — these are the only points checked here.`,
  lawPanelLabel: "Statutory benchmark",
  pageTitle: "SignWise — Understand before you sign",
  figuresHeading: "Where these figures come from",
  figuresNote: "Traced against the wording of your own document.",
  figInClause: (ref) => `stated in this clause (${ref})`,
  figInOther: (ref) => `stated in ${ref}`,
  figDerived: (expr, ref) => `not stated — worked out as ${expr}${ref ? ` (${ref})` : ""}`,
  figContext: "not stated verbatim in the contract",
  legalNoticeLink: "Legal notice & data protection",
  legalNoticeTitle: "Legal notice & data protection",
  legalNoticeSections: [
    {
      heading: "What SignWise is â and what it is not",
      items: [
        { term: "It explains.", text: "SignWise puts a contract into plain language, shows what it costs, when the deadlines fall, and which passages are worth a second look." },
        { term: "It does not advise.", text: "SignWise gives no legal advice, makes no assessment of your individual case, and never says whether a clause is valid or whether you should sign. Assessing an individual case is a legal service under Â§ 2 (1) RDG, which this tool is not licensed to provide." },
        { term: "Where the limits show.", text: "Under “Statutory benchmarks”, SignWise states what a statute says in general and what your contract says, and stops there. Drawing the conclusion is for a tenants’ association, a consumer advice centre or a lawyer." },
        { term: "Every claim is traceable.", text: "Each explanation carries the verbatim passage it came from, checked against your uploaded file, plus its section and page. Statutory citations are checked against the real table of contents of the law before they become a link, so a citation that does not exist can never be presented as an official source." },
      ],
    },
    {
      heading: "What happens to your document (Art. 13 GDPR)",
      items: [
        { term: "Purpose.", text: "Producing the explanation you asked for, and nothing else. Your document is never used to train a model." },
        { term: "The file stays with you.", text: "The PDF itself is never uploaded. It is read in your browser, and only the extracted text is sent." },
        { term: "Minimised before sending.", text: "Bank details, addresses, e-mail addresses, phone numbers and tax numbers are replaced with placeholders in your browser before the text leaves it, and put back in your browser afterwards. The model host never receives them. A scanned contract has no text layer and is sent as an image, which cannot be filtered this way." },
        { term: "Recipient and location.", text: "Microsoft Azure OpenAI Service, region Sweden Central (EU), acting as a processor. No transfer to a third country is part of this design." },
        { term: "Retention.", text: "None. SignWise stores no document and no analysis. Everything lives in the browser tab and is gone when you close it." },
        { term: "Your rights.", text: "Access, rectification, erasure, restriction, objection, portability, and a complaint to a supervisory authority. Because nothing is stored, there is normally nothing to access or erase." },
      ],
    },
    {
      heading: "Machine-generated content (Art. 50 AI Act)",
      items: [
        { term: "AI-generated.", text: "The explanations, the summary and the answers are produced by a language model and can be wrong or incomplete, even where they read confidently." },
        { term: "Check against the original.", text: "The exact contract wording sits next to every explanation for that reason. A passage SignWise could not find in your document is marked as unverified." },
      ],
    },
  ],
  legalNoticeFoot:
    "SignWise is a prototype built for the Legal Loves Tech Hackathon 2026 (challenge StMJ IV, “Was unterschreibe ich?”) under the patronage of the Bavarian State Ministry of Justice. Statutory texts are cited from gesetze-im-internet.de.",
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
      extrasHeading: "Other amounts in this contract",
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
  depositBump: "The first month is higher because of the deposit.",
  bonusBump: "A highlighted month includes a bonus or holiday payment.",
  viewOfficialLaw: "View official law ↗",
  employmentBtn: "Also view an employment example",
  employmentNote: "Salary, probation and overtime",
};

const DE: Strings = {
  tagline: "Ihr Vertrag. Klar erklärt.",
  slogans: [
    "Ihr Vertrag, einfach erklärt.",
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
  fileMeta: (p) => (p ? `${p} Seite${p === 1 ? "" : "n"} · erklärt auf Deutsch` : "erklärt auf Deutsch"),
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
  addCalendar: (d) => `${d} in den Kalender übernehmen`,
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
  originalTitle: "Der Vertrag im Wortlaut",
  originalSub: "Ihr Vertrag vollständig. Markierte Passagen sind die, aus denen ein Punkt stammt — wählen Sie eine aus, um die Erklärung zu sehen.",
  backToSummary: "← Zurück zur Zusammenfassung",
  explanationLabel: "Erklärung",
  selectFinding: "Einen Punkt auswählen",
  selectHint: "Wählen Sie unten einen der Punkte, und wir erklären die Passage daneben in einfacher Sprache.",
  decisionBriefLabel: "Ihre Entscheidungshilfe",
  decisionTitle: "Vor der Unterschrift",
  decisionSub: "Das bedeutet dieser Vertrag für Sie — und das verdient vielleicht noch Ihre Aufmerksamkeit.",
  decisionSourceHint: "Jeder Punkt hier führt zurück zum Wortlaut, aus dem er stammt.",
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
  lawHeading: "Gesetzliche Maßstäbe",
  lawSub:
    "SignWise vergleicht einzelne Zahlen und Formulierungen Ihres Vertrags mit dem, was das Gesetz allgemein vorsieht. Ob eine Klausel wirksam ist, beurteilt SignWise nicht.",
  lawRuleLabel: "Was das Gesetz allgemein sagt",
  lawContractLabel: "Was in Ihrem Vertrag steht",
  lawScope: (n) => `Für diesen Vertragstyp gelten ${n} Maßstäbe. Sie wurden geprüft.`,
  lawLimit:
    "Diese Gegenüberstellung ist eine Information, keine Rechtsberatung und keine Prüfung der Wirksamkeit. Ob eine Klausel in Ihrem Fall gilt, kann nur eine Rechtsberatung beurteilen — zum Beispiel Mieterverein, Verbraucherzentrale oder Anwaltskanzlei.",
  lawEmptyTitle: "Keine Abweichung gefunden",
  lawEmptyBody: (n) =>
    `Keiner der ${n} Maßstäbe, die für diesen Vertragstyp gelten, weicht von Ihrem Vertrag ab. Das heißt nicht, dass der Vertrag insgesamt unproblematisch ist — geprüft sind nur diese Punkte.`,
  lawPanelLabel: "Gesetzlicher Maßstab",
  pageTitle: "SignWise — Verstehen, bevor Sie unterschreiben",
  figuresHeading: "Woher diese Zahlen kommen",
  figuresNote: "Abgeglichen mit dem Wortlaut Ihres Dokuments.",
  figInClause: (ref) => `steht in dieser Klausel (${ref})`,
  figInOther: (ref) => `steht in ${ref}`,
  figDerived: (expr, ref) => `nicht genannt — errechnet als ${expr}${ref ? ` (${ref})` : ""}`,
  figContext: "nicht wörtlich im Vertragstext",
  legalNoticeLink: "Rechtliches & Datenschutz",
  legalNoticeTitle: "Rechtliches & Datenschutz",
  legalNoticeSections: [
    {
      heading: "Was SignWise ist — und was nicht",
      items: [
        { term: "Es erklärt.", text: "SignWise übersetzt einen Vertrag in verständliche Sprache, zeigt die Kosten, die Fristen und die Stellen, die einen zweiten Blick verdienen." },
        { term: "Es berät nicht.", text: "SignWise gibt keine Rechtsberatung, prüft Ihren Einzelfall nicht und sagt nie, ob eine Klausel wirksam ist oder ob Sie unterschreiben sollten. Die Prüfung eines Einzelfalls ist eine Rechtsdienstleistung nach § 2 Abs. 1 RDG, zu der dieses Tool nicht befugt ist." },
        { term: "Wo die Grenze sichtbar wird.", text: "Unter „Gesetzliche Maßstäbe“ nennt SignWise, was ein Gesetz allgemein vorsieht und was in Ihrem Vertrag steht — und hört dort auf. Den Schluss daraus ziehen Mieterverein, Verbraucherzentrale oder Anwaltskanzlei." },
        { term: "Jede Aussage ist nachprüfbar.", text: "Zu jeder Erklärung gehört die wörtliche Passage, aus der sie stammt, geprüft gegen Ihre hochgeladene Datei, mit Paragraf und Seite. Gesetzeszitate werden gegen das echte Inhaltsverzeichnis des Gesetzes geprüft, bevor daraus ein Link wird — ein Paragraf, den es nicht gibt, kann so nie als amtliche Quelle erscheinen." },
      ],
    },
    {
      heading: "Was mit Ihrem Dokument passiert (Art. 13 DSGVO)",
      items: [
        { term: "Zweck.", text: "Ausschließlich die Erklärung, um die Sie gebeten haben. Ihr Dokument wird nicht zum Training eines Modells verwendet." },
        { term: "Die Datei bleibt bei Ihnen.", text: "Das PDF selbst wird nicht hochgeladen. Es wird in Ihrem Browser gelesen; gesendet wird nur der herausgelöste Text." },
        { term: "Datenminimierung vor dem Senden.", text: "Bankverbindungen, Adressen, E-Mail-Adressen, Telefonnummern und Steuernummern werden noch im Browser durch Platzhalter ersetzt und dort auch wieder eingesetzt. Der Modellanbieter erhält sie nicht. Ein eingescannter Vertrag hat keine Textebene und wird als Bild gesendet — das lässt sich so nicht filtern." },
        { term: "Empfänger und Ort.", text: "Microsoft Azure OpenAI Service, Region Sweden Central (EU), als Auftragsverarbeiter. Eine Drittlandsübermittlung ist in diesem Aufbau nicht vorgesehen." },
        { term: "Speicherdauer.", text: "Keine. SignWise speichert weder Dokument noch Analyse. Alles lebt im Browser-Tab und ist mit dem Schließen weg." },
        { term: "Ihre Rechte.", text: "Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch, Datenübertragbarkeit und Beschwerde bei einer Aufsichtsbehörde. Da nichts gespeichert wird, gibt es in der Regel nichts, worauf sich Auskunft oder Löschung beziehen könnte." },
      ],
    },
    {
      heading: "Maschinell erzeugte Inhalte (Art. 50 KI-VO)",
      items: [
        { term: "KI-generiert.", text: "Die Erklärungen, die Zusammenfassung und die Antworten stammen von einem Sprachmodell und können falsch oder unvollständig sein — auch dort, wo sie sehr sicher klingen." },
        { term: "Gegen das Original prüfen.", text: "Genau deshalb steht neben jeder Erklärung der wörtliche Vertragstext. Eine Passage, die SignWise in Ihrem Dokument nicht wiederfinden konnte, ist als ungeprüft gekennzeichnet." },
      ],
    },
  ],
  legalNoticeFoot:
    "SignWise ist ein Prototyp für den Legal Loves Tech Hackathon 2026 (Challenge StMJ IV, „Was unterschreibe ich?“) unter der Schirmherrschaft des Bayerischen Staatsministeriums der Justiz. Gesetzestexte werden nach gesetze-im-internet.de zitiert.",
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
      extrasHeading: "Weitere Beträge in diesem Vertrag",
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
  depositBump: "Der erste Monat ist wegen der Kaution höher.",
  bonusBump: "Ein hervorgehobener Monat enthält eine Bonus- oder Sonderzahlung.",
  viewOfficialLaw: "Gesetz im Original ansehen ↗",
  employmentBtn: "Auch ein Arbeitsvertrags-Beispiel ansehen",
  employmentNote: "Gehalt, Probezeit und Überstunden",
};

export function t(lang: Lang): Strings {
  return lang === "de" ? DE : EN;
}
