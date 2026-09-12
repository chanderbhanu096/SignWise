import { useEffect, useRef, useState } from "react";
import type { Analysis, Depth, Lang } from "./types";
import { t } from "./i18n";
import {
  sampleAnalysis,
  SAMPLE_DOC_TEXT,
  SAMPLE_FILENAME,
  employmentAnalysis,
  EMPLOYMENT_DOC_TEXT,
  EMPLOYMENT_FILENAME,
} from "./sample";
import { verifyQuote } from "./verify";
import { contractMimeType, UploadError, validateContractFile } from "./upload";
import { ContractSession } from "./session";
import { narrowRef } from "./document";
import { styleCurrencyDeep } from "./format";
import { analyze, ask, translate, ApiError } from "./api";
import { downloadDeadlineIcs } from "./ics";
import { Upload } from "./screens/Upload";
import { Analyzing, type Phase } from "./screens/Analyzing";
import { Overview } from "./screens/Overview";
import { Original } from "./screens/Original";
import { Decision } from "./screens/Decision";
import { ClausePanel } from "./components/ClausePanel";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { LegalNotice } from "./components/LegalNotice";
import logoSrc from "./assets/signwise-logo.svg";

type Screen = "upload" | "analyzing" | "overview" | "original" | "decision";

type Source = "sample" | "upload";
type PendingImages = { file: File; pages: number | null; images?: string[]; task: ReturnType<ContractSession["ticket"]> };

function errMessage(code: string, lang: Lang): string {
  const de = lang === "de";
  const map: Record<string, string> = de
    ? {
        unsupported_type: "Nicht unterstütztes Format. Bitte PDF, JPG, PNG oder WebP.",
        too_large: "Die Datei ist zu groß (max. 4 MB).",
        text_too_long: "Der ausgelesene Text ist zu lang (max. 200.000 Zeichen). Bitte verwenden Sie ein kürzeres Dokument.",
        invalid_image: "Dieses Bild konnte nicht gelesen werden. Bitte laden Sie eine gültige JPG-, PNG- oder WebP-Datei hoch.",
        empty_file: "Die Datei war leer.",
        unreadable_pdf: "Dieses PDF konnte nicht geöffnet werden. Prüfen Sie, ob es beschädigt oder passwortgeschützt ist, oder laden Sie eine lesbare Kopie hoch.",
        no_readable_content: "Kein lesbarer Vertragstext gefunden. Bitte versuchen Sie eine deutlichere Datei.",
        too_many_pages: "Bitte laden Sie höchstens 12 Seiten pro Vertrag hoch.",
        scan_too_large: "Die gescannten Seiten sind zu groß. Bitte verwenden Sie ein kleineres PDF oder weniger Seiten.",
        service_unavailable: "Die KI-Analyse ist derzeit nicht verfügbar. Versuchen Sie es später erneut oder öffnen Sie eines der Beispiele unten.",
        service_authentication_failed: "Die Verbindung zum KI-Dienst muss neu eingerichtet werden. Das ist ein Problem der Dienstkonfiguration, nicht Ihres Dokuments. Die Beispiele funktionieren weiterhin.",
        service_access_denied: "Der KI-Dienst verweigert den Zugriff. Die Zugriffsrechte des Dienstes müssen geprüft werden. Ihr Dokument ist nicht die Ursache.",
        service_configuration_error: "Das konfigurierte KI-Modell ist nicht erreichbar. Die Dienstkonfiguration muss geprüft werden.",
        service_limit_reached: "Der KI-Dienst hat seine aktuelle Kapazitäts- oder Nutzungsgrenze erreicht. Bitte versuchen Sie es später erneut.",
        response_truncated: "Die KI-Antwort wurde abgeschnitten. Bitte versuchen Sie es erneut oder verwenden Sie ein kürzeres Dokument.",
        model_response_invalid: "Die KI-Antwort konnte nicht zuverlässig verarbeitet werden. Es wurde keine Analyse angezeigt. Bitte versuchen Sie es erneut.",
        request_timeout: "Die Analyse hat zu lange gedauert. Bitte versuchen Sie es erneut, gegebenenfalls mit einem kürzeren Dokument.",
        too_many_requests: "Zu viele Anfragen in kurzer Zeit. Bitte warten Sie ein paar Minuten — Ihr Vertrag ist nicht das Problem. Die Beispiele unten funktionieren weiterhin.",
        analysis_failed: "Bei der Analyse ist etwas schiefgegangen.",
      }
    : {
        unsupported_type: "Unsupported format. Please use PDF, JPG, PNG or WebP.",
        too_large: "The file is too large (max 4 MB).",
        text_too_long: "The extracted text is too long (max 200,000 characters). Please use a shorter document.",
        invalid_image: "This image could not be read. Please upload a valid JPG, PNG or WebP file.",
        empty_file: "The file was empty.",
        unreadable_pdf: "This PDF could not be opened. Check whether it is damaged or password-protected, or upload a readable copy.",
        no_readable_content: "No readable contract text was found. Please try a clearer file.",
        too_many_pages: "Please upload no more than 12 pages per contract.",
        scan_too_large: "The scanned pages are too large. Please use a smaller PDF or fewer pages.",
        service_unavailable: "AI analysis is currently unavailable. Try again later or open one of the examples below.",
        service_authentication_failed: "The AI service connection needs updating. This is a service configuration problem, not a problem with your document. The examples still work.",
        service_access_denied: "The AI service is denying access. Its access settings need to be checked. Your document is not the cause.",
        service_configuration_error: "The configured AI model could not be reached. The service configuration needs to be checked.",
        service_limit_reached: "The AI service has reached its current capacity or usage limit. Please try again later.",
        response_truncated: "The AI response was cut short. Please try again or use a shorter document.",
        model_response_invalid: "The AI response could not be processed reliably, so no analysis was shown. Please try again.",
        request_timeout: "The analysis took too long. Please try again, perhaps with a shorter document.",
        too_many_requests: "Too many requests in a short time. Please wait a few minutes — your contract is not the problem. The examples below still work.",
        analysis_failed: "Something went wrong during analysis.",
      };
  return map[code] ?? (de ? "Verbindung fehlgeschlagen. Bitte erneut versuchen." : "Connection failed. Please try again.");
}

// Verification is a browser-side check of the complete quote, including examples.
function verifyAnalysis(a: Analysis, docText: string | null): Analysis {
  // One currency notation across the whole screen, including the amounts the model
  // wrote into its own sentences. Quotes and refs are excluded by styleCurrencyDeep.
  const styled = styleCurrencyDeep(a, a.money.currency, a.lang);
  return {
    ...styled,
    clauses: styled.clauses.map((c) => ({
      ...c,
      verified: !!docText && verifyQuote(docText, c.quote),
      ref: narrowRef(c.ref, c.quote),
    })),
  };
}

export default function App() {
  const [lang, setLang] = useState<Lang>("de");
  const [screen, setScreen] = useState<Screen>("upload");
  const [phase, setPhase] = useState<Phase>("read");
  const [source, setSource] = useState<Source>("sample");
  const [sampleKind, setSampleKind] = useState<"rental" | "employment">("rental");
  const [filename, setFilename] = useState(SAMPLE_FILENAME);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  // The extracted contract text, kept so the "original contract" screen can show the
  // document itself rather than a list of the passages the model happened to quote.
  const [docText, setDocText] = useState<string | null>(null);
  // Real page count, or null when we have no PDF to count (image upload, sample).
  const [docPages, setDocPages] = useState<number | null>(null);
  const [depth, setDepth] = useState<Depth>("standard");
  const [clauseId, setClauseId] = useState<string | null>(null);
  const [answer, setAnswer] = useState<{ text: string; clauseId: string | null; question?: string; error?: boolean } | null>(null);
  const [asking, setAsking] = useState(false);
  const [calMsg, setCalMsg] = useState("");
  const [dlMsg, setDlMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [legalOpen, setLegalOpen] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(false);
  const [imageReview, setImageReview] = useState<PendingImages | null>(null);

  const sessionRef = useRef(new ContractSession());
  const askVersion = useRef(0);
  const askingRef = useRef(false);
  const translatingRef = useRef(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const s = t(lang);

  useEffect(() => {
    const session = sessionRef.current;
    return () => session.cancel();
  }, []);

  useEffect(() => {
    const heading = document.querySelector<HTMLElement>("main h1");
    heading?.setAttribute("tabindex", "-1");
    heading?.focus({ preventScroll: true });
    if (screen !== "original") window.scrollTo({ top: 0, behavior: "instant" });
  }, [screen]);

  function resetContract() {
    sessionRef.current.reset();
    askVersion.current++;
    askingRef.current = false;
    translatingRef.current = false;
    setAsking(false);
    setTranslating(false);
    setTranslationError(false);
    setAnalysis(null);
    setDocText(null);
    setDocPages(null);
    setAnswer(null);
    setClauseId(null);
    setSelectedInDoc(null);
    setCalMsg("");
    setDlMsg("");
    setError(null);
    setImageReview(null);
  }

  function openExample(kind: "rental" | "employment") {
    resetContract();
    const a = kind === "employment" ? employmentAnalysis(lang) : sampleAnalysis(lang);
    const text = kind === "employment" ? EMPLOYMENT_DOC_TEXT : SAMPLE_DOC_TEXT;
    setSource("sample");
    setSampleKind(kind);
    setFilename(kind === "employment" ? EMPLOYMENT_FILENAME : SAMPLE_FILENAME);
    setAnalysis(verifyAnalysis(a, text));
    setDocText(text);
    setScreen("overview");
  }

  function startExample() {
    openExample("rental");
  }

  function startEmploymentExample() {
    openExample("employment");
  }

  async function startUpload(file: File) {
    const issue = validateContractFile(file);
    if (issue) { setError(issue); return; }
    resetContract();
    const task = sessionRef.current.ticket();
    setSource("upload");
    setFilename(file.name);
    setPhase("read");
    setScreen("analyzing");
    try {
      let text: string | null = null;
      let pages: number | null = null;
      let images: string[] | undefined;
      if (contractMimeType(file) === "application/pdf") {
        const { extractPdfText } = await import("./pdf");
        if (!task.isCurrent()) return;
        const buf = await file.arrayBuffer();
        ({ text, pages, images } = await extractPdfText(buf, task.signal));
      }
      if (!task.isCurrent()) return;
      if (!text) {
        // The person must see this document-specific disclosure before any
        // unmasked page/photo leaves the browser, not after the model response.
        setImageReview({ file, pages, images, task });
        return;
      }
      await completeUpload(file, text, pages, images, task);
    } catch (e) {
      if (!task.isCurrent()) return;
      setError(e instanceof ApiError || e instanceof UploadError ? e.code : "analysis_failed");
      setScreen("upload");
    }
  }

  async function completeUpload(file: File, text: string | null, pages: number | null, images: string[] | undefined, task: PendingImages["task"]) {
    if (!task.isCurrent()) return;
    setPhase("model");
    try {
      const a = await analyze(file, lang, text, task.signal, images);
      if (!task.isCurrent()) return;
      if (a.warnings.includes("stub")) throw new ApiError("service_unavailable");
      setPhase("verify");
      const checked = verifyAnalysis(a, text);
      sessionRef.current.translations.set(lang, checked);
      setAnalysis(checked);
      setDocText(text);
      setDocPages(pages);
      setScreen("overview");
    } catch (e) {
      if (!task.isCurrent()) return;
      setError(e instanceof ApiError || e instanceof UploadError ? e.code : "analysis_failed");
      setScreen("upload");
    }
  }

  const [selectedInDoc, setSelectedInDoc] = useState<string | null>(null);

  // Two distinct actions on one selection. selectClause moves the current clause
  // (the Original split view follows it); openClause additionally opens the detail
  // panel. Both write the same state, so no screen can show a stale explanation.
  function selectClause(id: string) {
    setSelectedInDoc(id);
  }
  function openClause(id: string) {
    triggerRef.current = document.activeElement as HTMLElement;
    setSelectedInDoc(id);
    setClauseId(id);
  }
  // Entering the document without picking a clause: start clean, not on whatever
  // was clicked several screens ago. Original then falls back to the first finding.
  function goOriginal() {
    setSelectedInDoc(null);
    setScreen("original");
  }
  function closePanel() {
    setClauseId(null);
    triggerRef.current?.focus?.();
  }

  function showInDoc() {
    const id = clauseId;
    setClauseId(null);
    if (id) setSelectedInDoc(id);
    setScreen("original"); // Original scrolls to selectedInDoc on mount
  }

  async function handleAsk(q: string) {
    if (!analysis || askingRef.current || translatingRef.current || !q.trim()) return;
    const task = sessionRef.current.ticket();
    const version = ++askVersion.current;
    askingRef.current = true;
    setAsking(true);
    setAnswer(null);
    try {
      const r = await ask(q, analysis, task.signal);
      if (!task.isCurrent() || version !== askVersion.current) return;
      setAnswer({ text: r.answer, clauseId: r.clauseId, question: q });
    } catch {
      if (!task.isCurrent() || version !== askVersion.current) return;
      setAnswer({ text: lang === "de" ? "Die Frage konnte gerade nicht beantwortet werden. Bitte versuchen Sie es erneut; Ihre Frage bleibt erhalten." : "That question couldn’t be answered right now. Please try again; your question has been kept.", clauseId: null, question: q, error: true });
    } finally {
      if (task.isCurrent() && version === askVersion.current) {
        askingRef.current = false;
        setAsking(false);
      }
    }
  }

  // The page's own language attribute, not just the strings. Without this the
  // document stayed lang="de" while the interface was in English, so a screen
  // reader read English out with a German voice — and the tab title stayed German
  // whatever the reader had chosen.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t(lang).pageTitle;
  }, [lang]);

  async function changeLang(l: Lang) {
    if (l === lang || translatingRef.current || screen === "analyzing") return;
    setTranslationError(false);
    if (!analysis) { setLang(l); return; }
    const task = sessionRef.current.ticket();
    askVersion.current++;
    askingRef.current = false;
    setAsking(false);
    setAnswer(null);
    translatingRef.current = true;
    setTranslating(true);
    try {
      sessionRef.current.translations.set(lang, analysis);
      const translated = source === "sample"
        ? sampleKind === "employment" ? employmentAnalysis(l) : sampleAnalysis(l)
        : sessionRef.current.translations.get(l) ?? await translate(analysis, l, task.signal);
      if (!task.isCurrent()) return;
      if (translated.lang !== l || translated.warnings.includes("translate-stub")) throw new ApiError("translation_unavailable");
      const checked = verifyAnalysis(translated, docText);
      sessionRef.current.translations.set(l, checked);
      setAnalysis(checked);
      setLang(l);
    } catch {
      if (task.isCurrent()) setTranslationError(true);
    } finally {
      if (task.isCurrent()) {
        translatingRef.current = false;
        setTranslating(false);
      }
    }
  }

  // Navigation and result notices only belong to an open contract.
  const inDocument = !!analysis && screen !== "upload" && screen !== "analyzing";

  const openClauseObj = clauseId ? analysis?.clauses.find((c) => c.id === clauseId) ?? null : null;

  const langBtn = (code: Lang, label: string) => (
    <button
      className={"pill" + (lang === code ? " on" : "")}
      aria-pressed={lang === code}
      disabled={translating || screen === "analyzing"}
      onClick={() => changeLang(code)}
    >
      {label}
    </button>
  );

  return (
    <div className="app">
      <header className="hdr">
        <div className="hdr-in">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              <img className="brand-logo" src={logoSrc} alt="" />
            </div>
            <div className="brand-name">SignWise</div>
          </div>
          <div className="langs" role="group" aria-label={s.languageSelector} aria-busy={translating}>
            {langBtn("de", "DE")}
            {langBtn("en", "EN")}
          </div>
        </div>
      </header>

      {/* The three views of one contract. They are destinations, not wizard steps —
          you can read them in any order — so they are tabs, without step numbers.
          "New contract" is not a fourth view of this contract; it throws this one
          away, so it sits outside the tab group and never scrolls out of reach. */}
      {inDocument && (
        <nav className="nav" aria-label={s.mockupLabel}>
          <div className="nav-tabs">
            {([
              ["overview", s.screens.overview, () => setScreen("overview")],
              ["original", s.screens.original, goOriginal],
              ["decision", s.screens.decision, () => setScreen("decision")],
            ] as const).map(([id, label, go]) => (
              <button
                key={id}
                className={"nav-btn" + (screen === id ? " on" : "")}
                aria-current={screen === id ? "page" : undefined}
                onClick={go}
              >
                {label}
              </button>
            ))}
          </div>
          {/* aria-label carries the name in both states: the visible label is hidden
              on a phone, and a second sr-only copy would read the name twice on
              desktop. */}
          <button className="nav-new" onClick={() => setConfirmNew(true)} aria-label={s.newContract} title={s.newContract}>
            <span aria-hidden="true">+</span>
            <span className="nav-new-label" aria-hidden="true">{s.newContract}</span>
          </button>
        </nav>
      )}

      {/* A translation is a model call; without this the page looks frozen. */}
      {translating && (
        <div className="banner banner-busy">
          <div className="banner-in" role="status">
            <span className="spinner" aria-hidden="true" />
            <span>{s.translating}</span>
          </div>
        </div>
      )}
      {translationError && inDocument && (
        <div className="banner banner-error">
          <div className="banner-in" role="alert">
            {lang === "de" ? "Die Übersetzung hat nicht funktioniert. Ihr Vertrag bleibt auf Deutsch verfügbar. Bitte versuchen Sie den Sprachwechsel erneut." : "Translation failed. Your contract is still available in English. Please try switching language again."}
          </div>
        </div>
      )}
      {source === "sample" && inDocument && (
        <div className="banner banner-busy result-notice">
          <div className="banner-in">
            {lang === "de" ? "Beispielvertrag · Diese Erklärung ist vorbereitet. Laden Sie einen eigenen Vertrag hoch, um ihn analysieren zu lassen." : "Example contract · This explanation is prepared. Upload your own contract to have it analysed."}
          </div>
        </div>
      )}
      {source === "upload" && inDocument && !docText && (
        <div className="banner banner-warn result-notice">
          <div className="banner-in" role="status">
            {lang === "de" ? "Aus Bildern gelesen: Die erkannten Passagen konnten nicht unabhängig mit einer Textebene abgeglichen werden. Bitte vergleichen Sie Zahlen und Wortlaut mit Ihrer Datei." : "Read from images: the recognised passages could not be independently checked against a text layer. Please compare the figures and wording with your file."}
          </div>
        </div>
      )}

      {inDocument && analysis.confidence === "low" && (
        <div className="banner banner-warn result-notice">
          <div className="banner-in" role="alert">
            <span aria-hidden="true">⚠</span>
            <span>{s.lowConfidence}</span>
          </div>
        </div>
      )}

      <main>
        {screen === "upload" && (
          <Upload lang={lang} onUpload={startUpload} onExample={startExample} onEmploymentExample={startEmploymentExample} error={error ? errMessage(error, lang) : null} />
        )}
        {screen === "analyzing" && <Analyzing lang={lang} phase={phase} filename={filename} onCancel={() => { resetContract(); setScreen("upload"); }} />}
        {screen === "overview" && analysis && (
          <Overview
            analysis={analysis}
            filename={filename}
            pages={docPages}
            onOpenClause={openClause}
            onOriginal={goOriginal}
            onDecision={() => setScreen("decision")}
            onAsk={handleAsk}
            answer={answer}
            asking={asking}
            disabled={translating}
            onAddCalendar={(summary, iso) => {
              if (downloadDeadlineIcs(summary, iso)) setCalMsg(s.calAdded);
            }}
            calMsg={calMsg}
          />
        )}
        {screen === "original" && analysis && (
          <Original
            analysis={analysis}
            depth={depth}
            setDepth={setDepth}
            docText={docText}
            pages={docPages}
            selectedClauseId={selectedInDoc}
            onSelectClause={selectClause}
            onOpenClause={openClause}
            onBack={() => setScreen("overview")}
          />
        )}
        {screen === "decision" && analysis && (
          <Decision
            analysis={analysis}
            onOpenClause={openClause}
            onOriginal={goOriginal}
            onDownload={() => {
              setDlMsg(s.summaryReady);
              setTimeout(() => window.print(), 200);
            }}
            dlMsg={dlMsg}
          />
        )}
      </main>

      <footer className="site-foot">
        <button className="link-btn" onClick={() => setLegalOpen(true)}>
          {s.legalNoticeLink}
        </button>
      </footer>

      {legalOpen && <LegalNotice lang={lang} onClose={() => setLegalOpen(false)} />}

      <ConfirmDialog
        open={!!imageReview}
        title={lang === "de" ? "Dieses Dokument als Bilder analysieren?" : "Analyse this document as images?"}
        body={lang === "de"
          ? "Dieses Dokument enthält einen Scan, Bilder oder grafische Inhalte. Für eine vollständige Analyse werden alle Seiten als Bilder an Azure OpenAI gesendet, einschließlich sichtbarer Namen, Unterschriften und anderer persönlicher Daten. Diese Daten werden nicht maskiert. Zitate können dabei nicht unabhängig geprüft werden. Fahren Sie nur fort, wenn Sie das Dokument so teilen dürfen."
          : "This document contains a scan, images or graphics. To avoid missing content, all pages will be sent as images to Azure OpenAI, including visible names, signatures and other personal details. These details will not be masked. Quotes cannot be independently verified in this mode. Continue only if you are allowed to share the document this way."}
        cancelLabel={lang === "de" ? "Zurück zum Upload" : "Back to upload"}
        confirmLabel={lang === "de" ? "Bilder senden und analysieren" : "Send images and analyse"}
        onCancel={() => { resetContract(); setScreen("upload"); }}
        onConfirm={() => {
          const pending = imageReview;
          setImageReview(null);
          if (pending) void completeUpload(pending.file, null, pending.pages, pending.images, pending.task);
        }}
      />

      {/* key: transient panel state (the legal-context expander) belongs to one
          clause and must not carry over when a different clause is opened. */}
      {openClauseObj && analysis && (
        <ClausePanel key={openClauseObj.id} clause={openClauseObj} analysis={analysis} depth={depth} setDepth={setDepth} onClose={closePanel} onShowInDoc={showInDoc} />
      )}

      {/* Starting over throws the whole explanation away, so it asks first. */}
      <ConfirmDialog
        open={confirmNew}
        title={s.newContractTitle}
        body={s.newContractBody}
        cancelLabel={s.newContractCancel}
        confirmLabel={s.newContractConfirm}
        onCancel={() => setConfirmNew(false)}
        onConfirm={() => {
          setConfirmNew(false);
          resetContract();
          setScreen("upload");
        }}
      />
    </div>
  );
}
