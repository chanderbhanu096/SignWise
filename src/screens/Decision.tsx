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
  // The one "worth checking" finding drives the review nudge, if there is one.
  const toReview = analysis.clauses.find((c) => analysis.findings.includes(c.id) && c.level === "check");

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
            <p style={{ fontWeight: 600 }}>{s.reviewWarnTitle}</p>
            <p style={{ color: "var(--muted)", marginTop: 4 }}>{s.reviewWarnBody}</p>
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
