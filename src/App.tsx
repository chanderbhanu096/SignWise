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
import { analyze, ask, translate, ApiError } from "./api";
import { downloadDeadlineIcs } from "./ics";
import { Upload } from "./screens/Upload";
import { Analyzing } from "./screens/Analyzing";
import { Overview } from "./screens/Overview";
import { Original } from "./screens/Original";
import { Decision } from "./screens/Decision";
import { ClausePanel } from "./components/ClausePanel";
import { Slogan } from "./components/Slogan";

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
  return { ...a, clauses: a.clauses.map((c) => ({ ...c, verified: verifyQuote(docText, c.quote) })) };
}

export default function App() {
  const [lang, setLang] = useState<Lang>("de");
  const [screen, setScreen] = useState<Screen>("upload");
  const [step, setStep] = useState(0);
  const [source, setSource] = useState<Source>("sample");
  const [sampleKind, setSampleKind] = useState<"rental" | "employment">("rental");
  const [filename, setFilename] = useState(SAMPLE_FILENAME);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [depth, setDepth] = useState<Depth>("standard");
  const [clauseId, setClauseId] = useState<string | null>(null);
  const [answer, setAnswer] = useState<{ text: string; clauseId: string | null } | null>(null);
  const [asking, setAsking] = useState(false);
  const [calMsg, setCalMsg] = useState("");
  const [dlMsg, setDlMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const pendingRef = useRef<Promise<{ a: Analysis; text: string | null }> | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const s = t(lang);

  // Analysis progress: advance the four steps, then resolve into the overview.
  useEffect(() => {
    if (screen !== "analyzing") return;
    if (step < 4) {
      const id = setTimeout(() => setStep((n) => n + 1), 650);
      return () => clearTimeout(id);
    }
    let cancelled = false;
    pendingRef.current
      ?.then(({ a, text }) => {
        if (cancelled) return;
        setAnalysis(verifyAnalysis(a, text));
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
  }, [screen, step, lang]);

  // Esc closes the clause panel and returns focus to whatever opened it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && clauseId) closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clauseId]);

  function begin(p: Promise<{ a: Analysis; text: string | null }>) {
    pendingRef.current = p;
    setError(null);
    setStep(0);
    setScreen("analyzing");
  }

  function startExample() {
    setSource("sample");
    setSampleKind("rental");
    setFilename(SAMPLE_FILENAME);
    begin(Promise.resolve({ a: sampleAnalysis(lang), text: SAMPLE_DOC_TEXT }));
  }

  function startEmploymentExample() {
    setSource("sample");
    setSampleKind("employment");
    setFilename(EMPLOYMENT_FILENAME);
    begin(Promise.resolve({ a: employmentAnalysis(lang), text: EMPLOYMENT_DOC_TEXT }));
  }

  function startUpload(file: File) {
    setSource("upload");
    setFilename(file.name);
    begin(
      (async () => {
        const buf = await file.arrayBuffer();
        const text = await extractPdfText(buf.slice(0)); // slice: keep our own copy
        const a = await analyze(file, lang, text);
        return { a, text };
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
    setMoreOpen(false);
    if (l === lang) return;
    setLang(l);
    if (!analysis) return;
    if (source === "sample") {
      setAnalysis(sampleKind === "employment" ? employmentAnalysis(l) : sampleAnalysis(l));
      setAnswer(null);
      return;
    }
    // Uploaded contract: translate the existing analysis.
    try {
      const translated = await translate(analysis, l);
      setAnalysis(translated);
      setAnswer(null);
    } catch {
      /* leave current analysis; language label still switches */
    }
  }

  const openClauseObj = clauseId ? analysis?.clauses.find((c) => c.id === clauseId) ?? null : null;
  const langBtn = (code: Lang, label: string) => (
    <button className={"pill" + (lang === code ? " on" : "")} aria-pressed={lang === code} onClick={() => changeLang(code)}>
      {label}
    </button>
  );

  return (
    <div className="app">
      <header className="hdr">
        <div className="hdr-in">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              SW
            </div>
            <div>
              <div className="brand-name">SignWise</div>
              <div className="brand-tag">
                {/* key={lang}: remount resets the rotation, so no slogan from the old language lingers. */}
                <Slogan key={lang} slogans={s.slogans} label={s.tagline} />
              </div>
            </div>
          </div>
          <div className="langs" role="group" aria-label={s.languageSelector}>
            {langBtn("de", "DE")}
            {langBtn("en", "EN")}
            <div style={{ position: "relative" }}>
              <button className={"pill" + (["tr", "uk", "ar"].includes(lang) ? " on" : "")} aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)}>
                {lang === "tr" ? "TR" : lang === "uk" ? "UA" : lang === "ar" ? "AR" : s.moreLanguages}
              </button>
              {moreOpen && (
                <div className="card" style={{ position: "absolute", right: 0, top: "52px", padding: 8, zIndex: 40, minWidth: 160 }}>
                  {[
                    ["tr", "Türkçe"],
                    ["uk", "Українська"],
                    ["ar", "العربية"],
                  ].map(([code, label]) => (
                    <button key={code} className="nav-btn" style={{ width: "100%", justifyContent: "flex-start", marginBottom: 4 }} onClick={() => changeLang(code)}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Demo screen switcher — only once there is an analysis to move around in. */}
      {analysis && screen !== "analyzing" && (
        <nav className="nav" aria-label={s.mockupLabel}>
          <span className="nav-label">{s.mockupLabel}</span>
          <div className="nav-btns">
            <button className={"nav-btn" + (screen === "overview" ? " on" : "")} aria-current={screen === "overview" ? "page" : undefined} onClick={() => setScreen("overview")}>
              {s.screens.overview}
            </button>
            <button className={"nav-btn" + (screen === "original" ? " on" : "")} aria-current={screen === "original" ? "page" : undefined} onClick={goOriginal}>
              {s.screens.original}
            </button>
            <button className={"nav-btn" + (screen === "decision" ? " on" : "")} aria-current={screen === "decision" ? "page" : undefined} onClick={() => setScreen("decision")}>
              {s.screens.decision}
            </button>
            <button className="nav-btn" onClick={() => { setScreen("upload"); setAnalysis(null); }}>
              {lang === "de" ? "+ Neuer Vertrag" : "+ New contract"}
            </button>
          </div>
        </nav>
      )}

      {/* Banners */}
      {analysis?.warnings.includes("stub") && screen !== "upload" && screen !== "analyzing" && (
        <div className="banner banner-stub">
          <div className="banner-in">
            <span aria-hidden="true">🛈</span>
            <span>{s.stubBanner}</span>
          </div>
        </div>
      )}
      {analysis?.warnings.includes("translate-stub") && (
        <div className="banner banner-warn">
          <div className="banner-in">
            {lang === "de" ? "Übersetzung wird aktiv, sobald das Modell verbunden ist." : "Translation activates once the model is connected."}
          </div>
        </div>
      )}
      {analysis?.confidence === "low" && (
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
        {screen === "analyzing" && <Analyzing lang={lang} step={step} filename={filename} onSkip={() => setStep(4)} />}
        {screen === "overview" && analysis && (
          <Overview
            analysis={analysis}
            depth={depth}
            setDepth={setDepth}
            filename={filename}
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
        <ClausePanel key={openClauseObj.id} clause={openClauseObj} analysis={analysis} depth={depth} onClose={closePanel} onShowInDoc={showInDoc} />
      )}
    </div>
  );
}
