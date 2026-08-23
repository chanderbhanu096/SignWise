import { useEffect, useRef } from "react";
import type { Analysis } from "../types";
import { t } from "../i18n";
import { getDecisionSummary } from "../decision";

// A personalized decision-preparation brief: clear commitments, consequential
// review items, answerable comprehension prompts, and genuine open questions.
// It deliberately avoids a verdict, safety score, or recommendation to sign.
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
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasClause = (id: string | undefined) => !!id && analysis.clauses.some((clause) => clause.id === id);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section className="screen shell decision-screen" aria-labelledby="de-h">
      <header className="decision-hero">
        <div className="decision-kicker">
          {s.decisionBriefLabel} <span aria-hidden="true">·</span> {analysis.contractType}
        </div>
        <h1 className="decision-title" id="de-h" ref={headingRef} tabIndex={-1}>
          {s.decisionTitle}
        </h1>
        <p className="decision-lead">{s.decisionSub}</p>
        <p className="decision-source-hint">{s.decisionSourceHint}</p>
        {/* A contents line, not a glossary: each badge is the mark and the exact
            wording of the section it points at, so no label here is a term the
            reader then fails to find further down the page. */}
        <div className="decision-states" aria-label={s.decisionBriefLabel}>
          <span className="state-badge clear">
            <span aria-hidden="true">✓</span> {s.decisionAgreeHeading}
          </span>
          <span className="state-badge check">
            <span aria-hidden="true">△</span> {s.decisionReviewHeading}
          </span>
          {brief.clarificationQuestions.length > 0 && (
            <span className="state-badge clarify">
              <span aria-hidden="true">?</span> {s.decisionClarifyHeading}
            </span>
          )}
        </div>
      </header>

      <section className="decision-section" aria-labelledby="agree-h">
        <div className="decision-section-head">
          <span className="decision-step" aria-hidden="true">
            1
          </span>
          <div>
            <h2 id="agree-h">{s.decisionAgreeHeading}</h2>
            <p>{s.decisionAgreeSub}</p>
          </div>
        </div>

        {brief.commitments.length > 0 ? (
          <ul className="commitment-grid">
            {brief.commitments.map((commitment) => (
              <li className="commitment-card" key={`${commitment.clauseId}:${commitment.title}`}>
                {commitment.value && <div className="commitment-value">{commitment.value}</div>}
                <h3>{commitment.title}</h3>
                <p>{commitment.explanation}</p>
                <button className="link-btn" onClick={() => onOpenClause(commitment.clauseId)}>
                  {s.showClause} <span aria-hidden="true">→</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="brief-empty">
            <p>{s.missingInfo}</p>
          </div>
        )}
      </section>

      <div className={`decision-attention-grid${brief.clarificationQuestions.length === 0 ? " single" : ""}`}>
        <section className="decision-panel review-panel" aria-labelledby="review-h">
          <div className="decision-panel-head">
            <span className="decision-panel-mark check" aria-hidden="true">
              △
            </span>
            <div>
              <h2 id="review-h">{s.decisionReviewHeading}</h2>
              <p>{s.decisionReviewSub}</p>
            </div>
          </div>

          {brief.reviewItems.length > 0 ? (
            <ul className="review-list">
              {brief.reviewItems.map((item) => (
                <li className="review-card" key={item.clauseId}>
                  <h3>{item.title}</h3>
                  <p>{item.explanation}</p>
                  <p className="review-reason">
                    <strong>{s.whyLookAgain}</strong> {item.reason}
                  </p>
                  <button className="link-btn" onClick={() => onOpenClause(item.clauseId)}>
                    {s.reviewClause} <span aria-hidden="true">→</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="brief-empty compact">
              <span className="state-badge clear">
                <span aria-hidden="true">✓</span> {s.reviewEmptyTitle}
              </span>
              <p>{s.reviewEmptyBody}</p>
            </div>
          )}
        </section>

        {brief.clarificationQuestions.length > 0 && (
          <section className="decision-panel clarify-panel" aria-labelledby="clarify-h">
            <div className="decision-panel-head">
              <span className="decision-panel-mark clarify" aria-hidden="true">
                ?
              </span>
              <div>
                <h2 id="clarify-h">{s.decisionClarifyHeading}</h2>
                <p>{s.decisionClarifySub}</p>
              </div>
            </div>
            <ul className="clarification-list">
              {brief.clarificationQuestions.map((item) => (
                <li className="clarification-card" key={`${item.clauseId ?? "open"}:${item.question}`}>
                  <h3>{item.question}</h3>
                  {item.reason && <p>{item.reason}</p>}
                  {hasClause(item.clauseId) && (
                    <button className="link-btn" onClick={() => onOpenClause(item.clauseId!)}>
                      {s.showClause} <span aria-hidden="true">→</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {brief.understandingQuestions.length > 0 && (
        <section className="decision-section understanding-section" aria-labelledby="understand-h">
          <div className="decision-section-head">
            <span className="decision-step" aria-hidden="true">
              2
            </span>
            <div>
              <h2 id="understand-h">{s.decisionUnderstandHeading}</h2>
              <p>{s.decisionUnderstandSub}</p>
            </div>
          </div>
          <div className="understanding-list">
            {brief.understandingQuestions.map((item, index) => (
              <details className="understanding-item" key={`${item.clauseId}:${item.question}`}>
                <summary>
                  <span className="question-number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span>{item.question}</span>
                  <span className="details-chevron" aria-hidden="true">
                    ⌄
                  </span>
                </summary>
                <div className="understanding-answer">
                  <div className="answer-label">{s.decisionAnswerLabel}</div>
                  <p>{item.answer}</p>
                  <button className="link-btn" onClick={() => onOpenClause(item.clauseId)}>
                    {s.showClause} <span aria-hidden="true">→</span>
                  </button>
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <div className="overview-foot decision-actions">
        <button className="btn" onClick={onOriginal}>
          {s.viewOriginal}
        </button>
        <button className="btn btn-primary" onClick={onDownload}>
          {s.downloadSummary}
        </button>
      </div>
      {dlMsg && (
        <div className="print-status" role="status" aria-live="polite">
          {dlMsg}
        </div>
      )}

      <p className="disclaimer decision-disclaimer">{s.disclaimerLong}</p>
    </section>
  );
}
