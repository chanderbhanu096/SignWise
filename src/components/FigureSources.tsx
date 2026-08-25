import type { Analysis, Clause, Depth } from "../types";
import { t } from "../i18n";
import { figureSources } from "../provenance";

// Shown only at the detailed level, and only when there is something to say. The
// simple and standard levels stay plain prose: someone who asked for the short
// version is not asking to audit it.
export function FigureSources({
  analysis,
  clause,
  text,
  depth,
}: {
  analysis: Analysis;
  clause: Clause;
  text: string;
  depth: Depth;
}) {
  if (depth !== "detailed") return null;
  const s = t(analysis.lang);
  const figures = figureSources(analysis, clause, text);
  if (figures.length === 0) return null;

  return (
    <div className="figs">
      <div className="figs-head">{s.figuresHeading}</div>
      <ul className="figs-list">
        {figures.map((f) => (
          <li className="fig" key={f.key} data-kind={f.kind}>
            <span className="fig-value">{f.shown}</span>
            <span className="fig-src">
              {f.kind === "clause"
                ? s.figInClause(f.ref ?? "")
                : f.kind === "other"
                  ? s.figInOther(f.ref ?? "")
                  : f.kind === "derived"
                    ? s.figDerived(f.expr ?? "", f.ref ?? "")
                    : s.figContext}
            </span>
          </li>
        ))}
      </ul>
      <p className="figs-note">{s.figuresNote}</p>
    </div>
  );
}
