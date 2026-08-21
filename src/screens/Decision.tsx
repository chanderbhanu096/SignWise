import type { Analysis } from "../types";
import { t } from "../i18n";

export function Decision({
  analysis,
  checks,
  onToggle,
  onReview,
  onDownload,
  dlMsg,
}: {
  analysis: Analysis;
  checks: Record<string, boolean>;
  onToggle: (id: string) => void;
  onReview: () => void;
  onDownload: () => void;
  dlMsg: string;
}) {
  const s = t(analysis.lang);
  // The "worth checking" findings drive the review nudge, if there are any. Copy is
  // derived from the actual clause(s), not hardcoded to any contract type.
  const toReviewList = analysis.clauses.filter((c) => analysis.findings.includes(c.id) && c.level === "check");
  const toReview = toReviewList[0];
  const reviewTitle =
    toReviewList.length > 0
      ? analysis.lang === "de"
        ? `${toReviewList.length} Klausel${toReviewList.length > 1 ? "n" : ""} sollten Sie prüfen`
        : `${toReviewList.length} clause${toReviewList.length > 1 ? "s" : ""} you may want to review`
      : "";

  return (
    <section className="screen shell" style={{ maxWidth: 640 }} aria-labelledby="de-h">
      <h1 className="section-h" id="de-h">
        {s.decisionTitle}
      </h1>
      <p className="section-sub">{s.decisionSub}</p>

      <ul className="check-list">
        {s.checklist.map((item) => (
          <li key={item.id}>
            <button className="check" aria-pressed={!!checks[item.id]} onClick={() => onToggle(item.id)}>
              <span className="check-box" aria-hidden="true">
                {checks[item.id] ? "✓" : ""}
              </span>
              <span>{item.t}</span>
            </button>
          </li>
        ))}
      </ul>

      {toReview && (
        <div className="review-note">
          <span className="review-mark" aria-hidden="true">
            △
          </span>
          <div>
            <p style={{ fontWeight: 600 }}>{reviewTitle}</p>
            <p style={{ color: "var(--muted)", marginTop: 4 }}>
              <strong>{toReview.ref}</strong> — {toReview.means}
            </p>
          </div>
        </div>
      )}

      <div className="overview-foot">
        {toReview && (
          <button className="btn btn-primary" onClick={onReview}>
            {s.reviewClause}
          </button>
        )}
        <button className="btn" onClick={onDownload}>
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
