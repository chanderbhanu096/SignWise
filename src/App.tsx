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
import { extractPdfText, verifyQuote } from "./pdf";
import { narrowRef } from "./document";
import { analyze, ask, translate, ApiError } from "./api";
import { downloadDeadlineIcs } from "./ics";
import { Upload } from "./screens/Upload";
import { Analyzing, type Phase } from "./screens/Analyzing";
import { Overview } from "./screens/Overview";
import { Original } from "./screens/Original";
import { Decision } from "./screens/Decision";
import { ClausePanel } from "./components/ClausePanel";
import { ConfirmDialog } from "./components/ConfirmDialog";
import logoSrc from "./assets/signwise-logo.svg";

type Screen = "upload" | "analyzing" | "overview" | "original" | "decision";

type Source = "sample" | "upload";

function errMessage(code: string, lang: Lang): string {
  const de = lang === "de";
  const map: Record<string, string> = de
    ? {
        unsupported_type: "Nicht unterstütztes Format. Bitte PDF, JPG, PNG oder WebP.",
        too_large: "Die Datei ist zu groß (max. 4 MB).",
        empty_file: "Die Datei war leer.",
        analysis_failed: "Bei der Analyse ist etwas schiefgegangen.",
      }
    : {
        unsupported_type: "Unsupported format. Please use PDF, JPG, PNG or WebP.",
        too_large: "The file is too large (max 4 MB).",
        empty_file: "The file was empty.",
        analysis_failed: "Something went wrong during analysis.",
      };
  return map[code] ?? (de ? "Verbindung fehlgeschlagen. Bitte erneut versuchen." : "Connection failed. Please try again.");
}

// Client-side provenance check. Only meaningful for real model output — the stub
// fixture verifies itself, so we trust its flags and skip.
function verifyAnalysis(a: Analysis, docText: string | null): Analysis {
  if (a.warnings.includes("stub") || !docText) return a;
  return {
    ...a,
    clauses: a.clauses.map((c) => ({
      ...c,
      verified: verifyQuote(docText, c.quote),
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
  const [answer, setAnswer] = useState<{ text: string; clauseId: string | null } | null>(null);
  const [asking, setAsking] = useState(false);
  const [calMsg, setCalMsg] = useState("");
  const [dlMsg, setDlMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const [translating, setTranslating] = useState(false);

  const pendingRef = useRef<Promise<{ a: Analysis; text: string | null; pages: number | null }> | null>(null);
  // One translated copy per language, kept for the life of this contract. Switching
  // back is then instant instead of a second round-trip for text we already have.
  const langCacheRef = useRef<Map<Lang, Analysis>>(new Map());
  const triggerRef = useRef<HTMLElement | null>(null);
  const s = t(lang);

  // Wait for the real work. The screen reports whichever phase the job is in;
  // leaving this screen (cancel included) makes any late result a no-op.
  useEffect(() => {
    if (screen !== "analyzing") return;
    let cancelled = false;
    pendingRef.current
      ?.then(({ a, text, pages }) => {
        if (cancelled) return;
        setAnalysis(verifyAnalysis(a, text));
        setDocText(text);
        setDocPages(pages);
        setScreen("overview");
      })
      .catch((e) => {
        if (cancelled) return;
        setError(errMessage(e instanceof ApiError ? e.code : "analysis_failed", lang));
        setScreen("upload");
      });
    return () => {
      cancelled = true;
    };
  }, [screen, lang]);

  // Esc closes the clause panel and returns focus to whatever opened it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && clauseId) closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clauseId]);

  function begin(p: Promise<{ a: Analysis; text: string | null; pages: number | null }>) {
    pendingRef.current = p;
    setError(null);
    setPhase("read");
    setScreen("analyzing");
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // The bundled examples need no work at all. Walk them through the same phases so
  // the screen reads the same way, without pretending it took as long as a real one.
  async function runExample(a: Analysis, text: string) {
    await sleep(600);
    setPhase("model");
    await sleep(1100);
    setPhase("verify");
    await sleep(450);
    // A bundled fixture is not a PDF, so there is no page count to report — and an
    // invented one is exactly the kind of number this app exists to catch.
    return { a, text, pages: null };
  }

  function startExample() {
    setSource("sample");
    setSampleKind("rental");
    setFilename(SAMPLE_FILENAME);
    begin(runExample(sampleAnalysis(lang), SAMPLE_DOC_TEXT));
  }

  function startEmploymentExample() {
    setSource("sample");
    setSampleKind("employment");
    setFilename(EMPLOYMENT_FILENAME);
    begin(runExample(employmentAnalysis(lang), EMPLOYMENT_DOC_TEXT));
  }

  function startUpload(file: File) {
    setSource("upload");
    setFilename(file.name);
    begin(
      (async () => {
        const buf = await file.arrayBuffer();
        const { text, pages } = await extractPdfText(buf.slice(0)); // slice: keep our own copy
        setPhase("model");
        const a = await analyze(file, lang, text);
        setPhase("verify");
        return { a, text, pages };
      })(),
    );
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
    if (!analysis) return;
    setAsking(true);
    setAnswer(null);
    try {
      const r = await ask(q, analysis);
      setAnswer({ text: r.answer, clauseId: r.clauseId });
    } catch {
      setAnswer({ text: lang === "de" ? "Die Frage konnte gerade nicht beantwortet werden." : "That question couldn’t be answered right now.", clauseId: null });
    } finally {
      setAsking(false);
    }
  }

  async function changeLang(l: Lang) {
    if (l === lang || translating) return;
    setLang(l);
    if (!analysis) return;
    if (source === "sample") {
      setAnalysis(sampleKind === "employment" ? employmentAnalysis(l) : sampleAnalysis(l));
      setAnswer(null);
      return;
    }
    // Uploaded contract: translating the analysis is a model call and takes seconds.
    // Cache what we already have, reuse it on the way back, and say out loud that
    // the wait is a translation — silence is what made this read as "slow".
    langCacheRef.current.set(analysis.lang as Lang, analysis);
    const cached = langCacheRef.current.get(l);
    if (cached) {
      setAnalysis(cached);
      setAnswer(null);
      return;
    }
    setTranslating(true);
    try {
      const translated = await translate(analysis, l);
      langCacheRef.current.set(l, translated);
      setAnalysis(translated);
      setAnswer(null);
    } catch {
      /* leave current analysis; language label still switches */
    } finally {
      setTranslating(false);
    }
  }

  // The document's chrome — the screen switcher and the banners that describe an
  // analysis — belongs to the document screens only. Each of those blocks used to
  // test `analysis && screen !== "analyzing"` separately, which also renders them
  // over the landing page for any state that leaves an analysis in memory while the
  // upload screen is showing. Nothing in today's flow reaches that state (starting
  // over clears the analysis first), but that is the confirm dialog's discipline
  // holding it, not the condition — and a reviewer has a screenshot of the landing
  // page wearing the switcher. Stated once, it cannot drift.
  const inDocument = !!analysis && screen !== "upload" && screen !== "analyzing";

  const openClauseObj = clauseId ? analysis?.clauses.find((c) => c.id === clauseId) ?? null : null;
  const langBtn = (code: Lang, label: string) => (
    <button
      className={"pill" + (lang === code ? " on" : "")}
      aria-pressed={lang === code}
      disabled={translating}
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
          <button className="nav-new" onClick={() => setConfirmNew(true)} title={s.newContract}>
            <span aria-hidden="true">+</span>
            <span className="nav-new-label">{s.newContract}</span>
            <span className="sr-only">{s.newContract}</span>
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

      {/* Banners */}
      {inDocument && analysis.warnings.includes("stub") && (
        <div className="banner banner-stub">
          <div className="banner-in">
            <span aria-hidden="true">🛈</span>
            <span>{s.stubBanner}</span>
          </div>
        </div>
      )}
      {inDocument && analysis.warnings.includes("translate-stub") && (
        <div className="banner banner-warn">
          <div className="banner-in">
            {lang === "de" ? "Übersetzung wird aktiv, sobald das Modell verbunden ist." : "Translation activates once the model is connected."}
          </div>
        </div>
      )}
      {inDocument && analysis.confidence === "low" && (
        <div className="banner banner-warn">
          <div className="banner-in" role="alert">
            <span aria-hidden="true">⚠</span>
            <span>{s.lowConfidence}</span>
          </div>
        </div>
      )}

      <main>
        {screen === "upload" && (
          <Upload lang={lang} onUpload={startUpload} onExample={startExample} onEmploymentExample={startEmploymentExample} error={error} />
        )}
        {screen === "analyzing" && <Analyzing lang={lang} phase={phase} filename={filename} onCancel={() => setScreen("upload")} />}
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
            onAddCalendar={(summary, iso) => {
              downloadDeadlineIcs(summary, iso);
              setCalMsg(s.calAdded);
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
          setScreen("upload");
          setAnalysis(null);
          setDocText(null);
          setDocPages(null);
          setAnswer(null);
        }}
      />
    </div>
  );
}
