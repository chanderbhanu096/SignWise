import type { Analysis } from "../types";
import { t } from "../i18n";
import { getDecisionSummary } from "../decision";

// "Before you sign" — a personalized decision brief synthesized from the analysis:
// what you're committing to, what deserves another look, and what you might ask the
// other party. Not a checklist, not a verdict. Every card links to its source clause.
export function Decision({
  analysis,
  onOpenClause,
  onOriginal,
  onDownload,
  dlMsg,
}: {
  analysis: Analysis;
  onOpenClause: (id: string) => void;
  onOriginal: () => void;
  onDownload: () => void;
  dlMsg: string;
}) {
  const s = t(analysis.lang);
  const brief = getDecisionSummary(analysis);
  const hasClause = (id: string) => analysis.clauses.some((c) => c.id === id);

  return (
    <section className="screen shell" style={{ maxWidth: 920 }} aria-labelledby="de-h">
      <h1 className="section-h" id="de-h">
        {s.decisionTitle}
      </h1>
      <p className="section-sub">{s.decisionSub}</p>

      {/* 1. What you're agreeing to */}
      <h2 className="section-h block" style={{ fontSize: 20 }}>
        {s.decisionAgreeHeading}
      </h2>
      {brief.commitments.length > 0 ? (
        <div className="brief-grid">
          {brief.commitments.map((c, i) => (
            <div className="brief-card" key={i}>
              {c.value && <div className="brief-value">{c.value}</div>}
              <div className="brief-title">{c.title}</div>
              <p className="brief-exp">{c.explanation}</p>
              {hasClause(c.clauseId) && (
                <button className="link-btn" onClick={() => onOpenClause(c.clauseId)}>
                  {s.showClause} →
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="brief-empty">
          <p className="brief-exp">{s.missingInfo}</p>
        </div>
      )}

      {/* 2. Worth another look — up to 3 ranked review items */}
      <h2 className="section-h block" style={{ fontSize: 20 }}>
        {s.decisionReviewHeading}
      </h2>
      {brief.reviewItems.length > 0 ? (
        <div className="brief-grid">
          {brief.reviewItems.map((r, i) => (
            <div className="brief-card review" key={i}>
              <span className="state-badge check">
                <span aria-hidden="true">△</span> {s.levelName.check}
              </span>
              <div className="brief-title">{r.title}</div>
              <p className="brief-exp">{r.explanation}</p>
              <p className="brief-reason">
                <strong>{s.whyLookAgain}</strong> {r.reason}
              </p>
              {hasClause(r.clauseId) && (
                <button className="link-btn" onClick={() => onOpenClause(r.clauseId)}>
                  {s.reviewClause} →
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="brief-empty">
          <span className="state-badge clear">
            <span aria-hidden="true">✓</span> {s.reviewEmptyTitle}
          </span>
          <p className="brief-exp" style={{ marginTop: 8 }}>
            {s.reviewEmptyBody}
          </p>
        </div>
      )}

      {/* 3. Questions to clarify — only when the contract genuinely leaves something open */}
      {brief.clarificationQuestions.length > 0 && (
        <>
          <h2 className="section-h block" style={{ fontSize: 20 }}>
            {s.decisionClarifyHeading}
          </h2>
          <ul className="clarify-list">
            {brief.clarificationQuestions.map((q, i) => (
              <li className="brief-card clarify" key={i}>
                <div className="brief-title">
                  <span className="q-mark" aria-hidden="true">
                    ?
                  </span>{" "}
                  {q.question}
                </div>
                {q.reason && <p className="brief-exp">{q.reason}</p>}
                {q.clauseId && hasClause(q.clauseId) && (
                  <button className="link-btn" onClick={() => onOpenClause(q.clauseId!)}>
                    {s.showClause} →
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="overview-foot">
        <button className="btn" onClick={onOriginal}>
          {s.viewOriginal}
        </button>
        <button className="btn btn-primary" onClick={onDownload}>
          {s.downloadSummary}
        </button>
      </div>
      {dlMsg && (
        <div className="banner-warn" style={{ marginTop: 12 }}>
          <div className="banner-in">{dlMsg}</div>
        </div>
      )}

      <p className="disclaimer">{s.disclaimerLong}</p>
    </section>
  );
}
