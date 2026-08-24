import { useEffect, useRef } from "react";
import type { Analysis, Depth } from "../types";
import { t } from "../i18n";
import { depthText } from "../depth";
import { Severity } from "../components/Severity";
import { DepthPicker } from "../components/DepthPicker";
import { splitDocument } from "../document";

// Split view: the contract's own wording on the left (verbatim clause passages,
// highlighted), the plain-language explanation on the right. Selecting a passage or
// a finding updates both sides at once — the explanation is never one click behind.
// Opening the full clause detail is a separate, explicit action.
export function Original({
  analysis,
  depth,
  setDepth,
  docText,
  pages,
  selectedClauseId,
  onSelectClause,
  onOpenClause,
  onBack,
}: {
  analysis: Analysis;
  depth: Depth;
  setDepth: (d: Depth) => void;
  docText: string | null;
  pages: number | null;
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

  // Passages in document order — the fallback when there is no extracted text to
  // show (an uploaded image, or a PDF we could not read).
  const ordered = [...analysis.clauses].sort((a, b) => a.page - b.page);

  // With the document itself in hand, the pane shows the whole thing and marks the
  // passages the findings came from. Without it, the excerpts are all there is.
  const blocks = docText ? splitDocument(docText, analysis.clauses) : null;
  // Only the headline findings carry a number, and it is the number they carry
  // everywhere else — the overview list and the list in this screen's own side
  // pane. Numbering every clause in document order (the previous behaviour) meant
  // a passage tagged "Punkt 12" sat next to a list that stopped at 5.
  const findingNo = new Map(analysis.findings.map((id, i) => [id, i + 1]));

  useEffect(() => {
    if (!selected || !docRef.current) return;
    const el = docRef.current.querySelector<HTMLElement>(`[data-clause="${selected.id}"]`);
    if (!el) return;
    if (docRef.current.scrollHeight > docRef.current.clientHeight) {
      // Side-by-side: the document pane scrolls on its own. .doc is position:relative,
      // so a clause block's offsetTop is relative to it.
      docRef.current.scrollTop = Math.max(0, el.offsetTop - 12);
    } else if (selectedClauseId) {
      // Stacked: the document is full height, so the page scrolls to the passage.
      el.scrollIntoView({ block: "center" });
    }
  }, [selected, selectedClauseId]);

  // Stacked layout has no side pane to update, so a tap opens the sheet — which is
  // the same explanation, and leaves the reader's place in the document intact.
  const pick = (id: string) =>
    window.matchMedia("(max-width: 860px)").matches ? onOpenClause(id) : onSelectClause(id);

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
            {analysis.contractType} · {s.fileMeta(pages)}
          </p>
          {(blocks ?? ordered.map((c) => ({ text: c.quote, clauseId: c.id }))).map((block, i) => {
            const c = block.clauseId ? analysis.clauses.find((x) => x.id === block.clauseId) : undefined;
            if (!c) return (
              <p className="doc-plain" key={i}>
                {block.text}
              </p>
            );
            // Only the first block of a multi-section passage answers to the clause
            // id, so scrolling to a finding lands at its start.
            const first = (blocks ?? []).findIndex((b) => b.clauseId === c.id) === i || !blocks;
            return (
              <div
                key={i}
                className={"doc-clause" + (selected?.id === c.id ? " on" : "")}
                data-clause={first ? c.id : undefined}
                data-tone={c.level}
                role="button"
                tabIndex={0}
                aria-current={selected?.id === c.id ? "true" : undefined}
                onClick={() => pick(c.id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), pick(c.id))}
              >
                {first && (
                  <span className="tag" lang={analysis.lang}>
                    {c.ref}
                    {findingNo.has(c.id) && (
                      <> — {analysis.lang === "de" ? "Punkt" : "Finding"} {findingNo.get(c.id)}</>
                    )}
                  </span>
                )}
                <p style={{ margin: first ? "6px 0 0" : 0 }}>{block.text}</p>
              </div>
            );
          })}
        </div>

        <div className="doc-side" ref={sideRef}>
          <div className="card">
            <div className="pane-label" style={{ color: "var(--muted-2)" }}>
              <span>{s.explanationLabel}</span>
              {selected && <DepthPicker depth={depth} setDepth={setDepth} lang={analysis.lang} />}
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
                  {depthText(selected.simple, depth)}
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
                    onClick={() => pick(id)}
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
