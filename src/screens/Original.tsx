import { useEffect, useRef } from "react";
import type { Analysis, Depth } from "../types";
import { t } from "../i18n";

// Split view: the contract's own wording on the left (verbatim clause passages,
// highlighted), the plain-language explanation on the right. Clicking a finding
// scrolls its source into view — provenance is always one click away.
export function Original({
  analysis,
  depth,
  selectedClauseId,
  onOpenClause,
  onBack,
}: {
  analysis: Analysis;
  depth: Depth;
  selectedClauseId: string | null;
  onOpenClause: (id: string) => void;
  onBack: () => void;
}) {
  const s = t(analysis.lang);
  const docRef = useRef<HTMLDivElement>(null);
  const selected = analysis.clauses.find((c) => c.id === selectedClauseId) ?? null;

  // Passages in document order.
  const ordered = [...analysis.clauses].sort((a, b) => a.page - b.page);

  useEffect(() => {
    if (!selectedClauseId || !docRef.current) return;
    const el = docRef.current.querySelector<HTMLElement>(`[data-clause="${selectedClauseId}"]`);
    // .doc is position:relative, so a clause block's offsetTop is relative to it.
    if (el) docRef.current.scrollTop = Math.max(0, el.offsetTop - 12);
  }, [selectedClauseId]);

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
              className="doc-clause"
              data-clause={c.id}
              data-tone={c.level === "check" ? "warning" : "normal"}
              role="button"
              tabIndex={0}
              onClick={() => onOpenClause(c.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpenClause(c.id))}
            >
              <span className="tag" lang={analysis.lang}>
                {c.ref} — {analysis.lang === "de" ? "Punkt" : "Finding"} {i + 1}
              </span>
              <p style={{ margin: "6px 0 0" }}>{c.quote}</p>
            </div>
          ))}
        </div>

        <div className="doc-side">
          <div className="card">
            <div className="pane-label" style={{ color: "var(--muted-2)" }}>
              {s.explanationLabel}
            </div>
            <h2 style={{ fontSize: 18, margin: "6px 0" }} lang={analysis.lang}>
              {selected ? selected.title : s.selectFinding}
            </h2>
            <p className="section-sub" style={{ marginBottom: 0 }}>
              {selected ? selected.simple[depth] : s.selectHint}
            </p>
          </div>
          <ol className="findings" style={{ marginTop: 14 }}>
            {analysis.findings.map((id, i) => {
              const c = analysis.clauses.find((x) => x.id === id);
              if (!c) return null;
              return (
                <li key={id}>
                  <button className="finding" onClick={() => onOpenClause(id)} style={{ padding: "12px 14px" }}>
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
