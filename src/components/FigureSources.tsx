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
  const de = analysis.lang === "de";
  const figures = figureSources(analysis, clause, text);
  if (figures.length === 0) return null;

  return (
    <div className="figs">
      <div className="figs-head">{s.figuresHeading}</div>
      <ul className="figs-list">
        {figures.map((f) => (
          <li className="fig" key={f.key} data-kind={f.sourceVerified === false ? "context" : f.kind}>
            <span className="fig-value">{f.shown}</span>
            <span className="fig-src">
              {f.sourceVerified === false
                ? de
                  ? `im erkannten Auszug (${f.ref ?? ""}); nicht unabhängig mit Ihrer Datei abgeglichen`
                  : `in the extracted passage (${f.ref ?? ""}); not independently checked against your file`
                : f.kind === "clause"
                ? s.figInClause(f.ref ?? "")
                : f.kind === "other"
                  ? s.figInOther(f.ref ?? "")
                  : f.kind === "derived"
                    ? de
                      ? `mögliche Rechnung: ${f.expr ?? ""}${f.ref ? ` (${f.ref})` : ""}. Annahmen im Vertrag prüfen.`
                      : `possible calculation: ${f.expr ?? ""}${f.ref ? ` (${f.ref})` : ""}. Check the assumptions against the contract.`
                    : de ? "in den analysierten Auszügen nicht zugeordnet; Original prüfen" : "not matched in the analysed passages; check the original"}
            </span>
          </li>
        ))}
      </ul>
      <p className="figs-note">{de
        ? "Dieser Abgleich zeigt Fundstellen und mögliche Rechnungen. Er bestätigt weder die Deutung einer Zahl noch die Vollständigkeit der Analyse."
        : "This comparison shows matching passages and possible calculations. It does not confirm what a figure means or whether the analysis is complete."}</p>
    </div>
  );
}
