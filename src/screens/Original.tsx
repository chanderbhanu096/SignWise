import { useEffect, useRef } from "react";
import type { Analysis, Depth } from "../types";
import { t } from "../i18n";
import { Severity } from "../components/Severity";

// Split view: the contract's own wording on the left (verbatim clause passages,
// highlighted), the plain-language explanation on the right. Selecting a passage or
// a finding updates both sides at once — the explanation is never one click behind.
// Opening the full clause detail is a separate, explicit action.
export function Original({
  analysis,
  depth,
  selectedClauseId,
  onSelectClause,
  onOpenClause,
  onBack,
}: {
  analysis: Analysis;
  depth: Depth;
  selectedClauseId: string | null;
  onSelectClause: (id: string) => void;
  onOpenClause: (id: string) => void;
  onBack: () => void;
}) {
  const s = t(analysis.lang);
  const docRef = useRef<HTMLDivElement>(null);
  const sideRef = useRef<HTMLDivElement>(null);

  // Arriving without a selection (via the screen nav) starts at the first finding
  // rather than showing whatever was clicked several screens ago.
  const firstFinding = analysis.clauses.find((c) => c.id === analysis.findings[0]) ?? analysis.clauses[0] ?? null;
  const selected = analysis.clauses.find((c) => c.id === selectedClauseId) ?? firstFinding;

  // Passages in document order.
  const ordered = [...analysis.clauses].sort((a, b) => a.page - b.page);

  useEffect(() => {
    if (!selected || !docRef.current) return;
    const el = docRef.current.querySelector<HTMLElement>(`[data-clause="${selected.id}"]`);
    // .doc is position:relative, so a clause block's offsetTop is relative to it.
    if (el) docRef.current.scrollTop = Math.max(0, el.offsetTop - 12);
    // Stacked layout: the explanation sits below the document, so bring it into view.
    if (selectedClauseId && window.matchMedia("(max-width: 860px)").matches) {
      sideRef.current?.scrollIntoView({ block: "start" });
    }
  }, [selected, selectedClauseId]);

  return (
    <section className="screen shell wide" aria-labelledby="or-h">
      <div className="overview-head">
        <div>
          <h1 className="section-h" id="or-h">
            {s.originalTitle}
          </h1>
          <p className="section-sub" style={{ marginBottom: 0 }}>
            {s.originalSub}
          </p>
        </div>
        <button className="btn" onClick={onBack}>
          {s.backToSummary}
        </button>
      </div>

      <div className="split">
        <div className="doc" ref={docRef} lang={analysis.docLanguage}>
          <p className="doc-page">
            {analysis.contractType} · {s.fileMeta(14)}
          </p>
          {ordered.map((c, i) => (
            <div
              key={c.id}
              className={"doc-clause" + (selected?.id === c.id ? " on" : "")}
              data-clause={c.id}
              data-tone={c.level === "check" ? "warning" : "normal"}
              role="button"
              tabIndex={0}
              aria-current={selected?.id === c.id ? "true" : undefined}
              onClick={() => onSelectClause(c.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelectClause(c.id))}
            >
              <span className="tag" lang={analysis.lang}>
                {c.ref} — {analysis.lang === "de" ? "Punkt" : "Finding"} {i + 1}
              </span>
              <p style={{ margin: "6px 0 0" }}>{c.quote}</p>
            </div>
          ))}
        </div>

        <div className="doc-side" ref={sideRef}>
          <div className="card">
            <div className="pane-label" style={{ color: "var(--muted-2)" }}>
              {s.explanationLabel}
            </div>
            {selected ? (
              <>
                <h2 style={{ fontSize: 18, margin: "6px 0" }} lang={analysis.lang}>
                  {selected.title}
                </h2>
                <div className="expl-meta">
                  <Severity level={selected.level} lang={analysis.lang} />
                  <span className="finding-ref">{selected.ref}</span>
                </div>
                <p className="section-sub" style={{ margin: "10px 0 14px" }}>
                  {selected.simple[depth]}
                </p>
                <button className="btn" onClick={() => onOpenClause(selected.id)}>
                  {s.showClause}
                </button>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: 18, margin: "6px 0" }}>{s.selectFinding}</h2>
                <p className="section-sub" style={{ marginBottom: 0 }}>
                  {s.selectHint}
                </p>
              </>
            )}
          </div>
          <ol className="findings" style={{ marginTop: 14 }}>
            {analysis.findings.map((id, i) => {
              const c = analysis.clauses.find((x) => x.id === id);
              if (!c) return null;
              return (
                <li key={id}>
                  <button
                    className={"finding" + (selected?.id === id ? " on" : "")}
                    aria-current={selected?.id === id ? "true" : undefined}
                    onClick={() => onSelectClause(id)}
                    style={{ padding: "12px 14px" }}
                  >
                    <span className="finding-n" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span className="finding-body">
                      <span className="finding-title" style={{ fontSize: 15 }}>
                        {c.title}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
