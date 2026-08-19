import { useEffect, useRef, useState } from "react";
import type { Analysis, Clause, Depth } from "../types";
import { t } from "../i18n";
import { Severity } from "./Severity";

// The clause detail. Same component renders as a right-side panel on desktop and a
// bottom sheet on mobile (CSS decides which). The three content classes get fixed,
// visible labels so the reader always knows what is the contract, what is SignWise's
// explanation, and what is general legal information.
export function ClausePanel({
  clause,
  analysis,
  depth,
  onClose,
  onShowInDoc,
}: {
  clause: Clause;
  analysis: Analysis;
  depth: Depth;
  onClose: () => void;
  onShowInDoc: () => void;
}) {
  const s = t(analysis.lang);
  const [legalOpen, setLegalOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    // Trap Tab within the panel.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <aside className="panel" role="dialog" aria-modal="true" aria-label={clause.title} ref={panelRef} data-level={clause.level}>
        <div className="panel-head">
          <div>
            <span className="panel-ref">{clause.ref}</span>
            <h2 className="panel-title">{clause.title}</h2>
            <Severity level={clause.level} lang={analysis.lang} />
          </div>
          <button className="panel-close" ref={closeRef} onClick={onClose} aria-label={s.close}>
            ✕
          </button>
        </div>

        <div className="panel-body">
          {/* 1. what the contract says */}
          <div className="pane pane-contract">
            <div className="pane-label">{s.fromContract}</div>
            <p lang={analysis.docLanguage}>{clause.quote}</p>
            {!clause.verified && (
              <p className="legal-note" style={{ color: "var(--chk-fg)" }}>
                ⚠ {analysis.lang === "de" ? "Passage im Dokument nicht gefunden." : "Passage not found in your document."}
              </p>
            )}
          </div>

          {/* 2. SignWise's explanation */}
          <div className="pane pane-ai">
            <div className="pane-label">
              <span>{s.explainedBy}</span>
              <span>{s.aiMeta(s.depth[depth], s.langLabel)}</span>
            </div>
            <p>{clause.simple[depth]}</p>
          </div>

          <div>
            <div className="pane-label" style={{ color: "var(--muted-2)" }}>
              {s.meansTitle}
            </div>
            <p>{clause.means}</p>
          </div>

          <div>
            <div className="pane-label" style={{ color: "var(--muted-2)" }}>
              {s.whyTitle}
            </div>
            <div className="why-tags">
              {clause.tags.map((tag) => (
                <span key={tag} className="chip" style={{ minHeight: "auto", padding: "4px 10px", cursor: "default" }}>
                  {s.tagName[tag]}
                </span>
              ))}
            </div>
          </div>

          {/* 3. general legal information — clearly separated */}
          {clause.legal && (
            <div>
              <button className="legal-toggle" onClick={() => setLegalOpen((v) => !v)} aria-expanded={legalOpen}>
                <span>{s.legalToggle}</span>
                <span aria-hidden="true">{legalOpen ? "▴" : "▾"}</span>
              </button>
              {legalOpen && <p className="legal-body">{clause.legal}</p>}
              <p className="legal-note">{s.legalDisclaimer}</p>
            </div>
          )}

          <button className="btn" onClick={onShowInDoc}>
            {s.showInDoc}
          </button>
        </div>
      </aside>
    </>
  );
}
