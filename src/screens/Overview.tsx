import { useState } from "react";
import type { Analysis, Depth } from "../types";
import { DEPTHS } from "../types";
import { t } from "../i18n";
import { euro } from "../format";
import { Severity } from "../components/Severity";

const SUGGESTIONS: Record<string, string[]> = {
  de: ["Kann meine Miete steigen?", "Wie kündige ich?", "Was passiert, wenn ich früher ausziehe?", "Erkläre das einfacher."],
  en: ["Can my rent increase?", "How do I cancel?", "What happens if I leave early?", "Explain this in simpler language."],
};

export function Overview({
  analysis,
  depth,
  setDepth,
  filename,
  onOpenClause,
  onOriginal,
  onDecision,
  onAsk,
  answer,
  asking,
  onAddCalendar,
  calMsg,
}: {
  analysis: Analysis;
  depth: Depth;
  setDepth: (d: Depth) => void;
  filename: string;
  onOpenClause: (id: string) => void;
  onOriginal: () => void;
  onDecision: () => void;
  onAsk: (q: string) => void;
  answer: { text: string; clauseId: string | null } | null;
  asking: boolean;
  onAddCalendar: () => void;
  calMsg: string;
}) {
  const s = t(analysis.lang);
  const { money } = analysis;
  const [typed, setTyped] = useState("");
  const byId = (id: string) => analysis.clauses.find((c) => c.id === id);

  // 12-month cost bars. First month carries the deposit, so it's taller.
  const monthly = money.monthly ?? 0;
  const deposit = money.oneTime.find((o) => o.amount != null)?.amount ?? 0;
  const max = monthly + deposit || 1;
  const locale = analysis.lang === "de" ? "de-DE" : "en-GB";
  const months = Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(2026, 9 + i, 1)),
  );
  const suggestions = SUGGESTIONS[analysis.lang] ?? SUGGESTIONS.en;

  const findings = analysis.findings.map((id, i) => ({ c: byId(id)!, n: i + 1 })).filter((x) => x.c);

  return (
    <section className="screen shell wide" aria-labelledby="ov-h">
      <div className="overview-head">
        <div>
          <h1 className="section-h" id="ov-h">
            {s.glanceHeading}
          </h1>
          <p className="section-sub" style={{ marginBottom: 0 }}>
            {filename} · {s.fileMeta(14)}
          </p>
        </div>
        <div>
          <div className="pane-label" style={{ marginBottom: 6 }}>
            {s.explanationLevel}
          </div>
          <div className="seg" role="group" aria-label={s.explanationLevel}>
            {DEPTHS.map((d) => (
              <button key={d} className={depth === d ? "on" : ""} aria-pressed={depth === d} onClick={() => setDepth(d)}>
                {s.depth[d]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <dl className="glance">
        {analysis.glance.map((g) => (
          <div key={g.key}>
            <dt>{g.key}</dt>
            <dd>
              {g.value} {g.derived && <span className="derived">({analysis.lang === "de" ? "abgeleitet" : "derived"})</span>}
            </dd>
          </div>
        ))}
      </dl>

      {/* Findings */}
      <div className="card block">
        <h2 className="section-h" style={{ fontSize: 22 }}>
          {s.findingsHeading(findings.length)}
        </h2>
        <p className="section-sub">{s.findingsSub}</p>
        <ol className="findings">
          {findings.map(({ c, n }) => (
            <li key={c.id}>
              <button className={"finding" + (c.verified ? "" : " unverified")} onClick={() => onOpenClause(c.id)}>
                <span className="finding-n" aria-hidden="true">
                  {n}
                </span>
                <span className="finding-body">
                  <span className="finding-title">{c.title}</span>
                  <span className="finding-meta">
                    <Severity level={c.level} lang={analysis.lang} />
                    <span className="finding-ref">{c.ref}</span>
                  </span>
                </span>
                <span className="finding-caret" aria-hidden="true">
                  ›
                </span>
              </button>
            </li>
          ))}
        </ol>
        <p className="section-sub" style={{ marginTop: 14, marginBottom: 0, fontSize: 14 }}>
          {s.levelLegend}
        </p>
      </div>

      {/* Money */}
      <h2 className="section-h block" style={{ fontSize: 22 }}>
        {s.costHeading}
      </h2>
      <p className="section-sub">{s.costSub}</p>
      <div className="money">
        <div className="card">
          <div className="money-label">{s.everyMonth}</div>
          <div className="money-big">{monthly ? euro(monthly, analysis.lang, money.currency) : s.notMentioned}</div>
          <div className="money-year">
            {s.overYear}: {money.yearly ? euro(money.yearly, analysis.lang, money.currency) : "—"}
          </div>
        </div>
        <div className="card">
          <div className="money-label">{s.oneTimeHeading}</div>
          {money.oneTime.map((o) => (
            <div className="money-row" key={o.label}>
              <span>
                {o.label} {o.ref && <span className="finding-ref">· {o.ref}</span>}
              </span>
              {o.amount != null ? <strong>{euro(o.amount, analysis.lang, money.currency)}</strong> : <span className="na">{s.notMentioned}</span>}
            </div>
          ))}
          {money.variable.map((v) => (
            <div className="money-row" key={v.label}>
              <span>
                <div>{s.possibleAddl}</div>
                <div style={{ fontWeight: 600 }}>{v.label}</div>
                <div className="finding-ref">{v.note}</div>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card block">
        <div className="overview-head" style={{ alignItems: "center" }}>
          <h3 style={{ fontSize: 18 }}>{s.first12}</h3>
          <span className="finding-ref">{s.firstMonthHigher}</span>
        </div>
        <div
          className="chart"
          role="img"
          aria-label={
            analysis.lang === "de"
              ? `Balkendiagramm: erster Monat ${euro(max, analysis.lang, money.currency)} inklusive Kaution, danach je ${euro(monthly, analysis.lang, money.currency)}.`
              : `Bar chart: first month ${euro(max, analysis.lang, money.currency)} including the deposit, each following month ${euro(monthly, analysis.lang, money.currency)}.`
          }
        >
          {months.map((m, i) => {
            const value = i === 0 ? monthly + deposit : monthly;
            return (
              <div className="bar-col" key={i}>
                <span className="bar-amt">{new Intl.NumberFormat(locale).format(value)}</span>
                <div className={"bar" + (i === 0 ? " first" : "")} style={{ height: `${(value / max) * 100}%` }} />
                <span className="bar-m">{m}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dates */}
      <h2 className="section-h block" style={{ fontSize: 22 }}>
        {s.datesHeading}
      </h2>
      <p className="section-sub">{s.datesSub}</p>
      <ol className="timeline">
        {analysis.dates.map((d, i) => (
          <li className="tl" data-tone={d.tone} key={i}>
            <div className="tl-rail">
              <span className="tl-dot" aria-hidden="true" />
              <span className="tl-line" aria-hidden="true" style={i === analysis.dates.length - 1 ? { minHeight: 0 } : undefined} />
            </div>
            <div className="tl-card">
              <div className="tl-date">{d.date}</div>
              <div className="tl-title">{d.title}</div>
              <div className="tl-body">{d.body}</div>
            </div>
          </li>
        ))}
      </ol>
      <button className="btn" onClick={onAddCalendar}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h16v14H4z" />
          <path d="M8 3v4M16 3v4M4 11h16" />
        </svg>
        {s.addCalendar}
      </button>
      {calMsg && (
        <div className="banner-warn" style={{ marginTop: 12 }}>
          <div className="banner-in">{calMsg}</div>
        </div>
      )}

      {/* Rights / duties */}
      <div className="two block">
        <div className="card">
          <h2 style={{ fontSize: 20 }}>{s.rightsHeading}</h2>
          <p className="section-sub" style={{ marginBottom: 0 }}>
            {s.rightsSub}
          </p>
          <ul className="rd-list">
            {analysis.rights.map((r) => (
              <li className="rd-item" key={r.clauseId}>
                <span className="rd-mark right" aria-hidden="true">
                  ✓
                </span>
                <span className="rd-text">
                  {r.text}
                  <div>
                    <button className="link-btn" onClick={() => onOpenClause(r.clauseId)}>
                      {s.showClause}
                    </button>
                  </div>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2 style={{ fontSize: 20 }}>{s.dutiesHeading}</h2>
          <p className="section-sub" style={{ marginBottom: 0 }}>
            {s.dutiesSub}
          </p>
          <ul className="rd-list">
            {analysis.duties.map((d) => (
              <li className="rd-item" key={d.clauseId}>
                <span className="rd-mark duty" aria-hidden="true">
                  •
                </span>
                <span className="rd-text">
                  {d.text}
                  <div>
                    <button className="link-btn" onClick={() => onOpenClause(d.clauseId)}>
                      {s.showClause}
                    </button>
                  </div>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Ask */}
      <div className="card block">
        <h2 style={{ fontSize: 20 }}>{s.askHeading}</h2>
        <p className="section-sub" style={{ marginBottom: 0 }}>
          {s.askSub}
        </p>
        <div className="ask-chips">
          {suggestions.map((q) => (
            <button key={q} className="chip" onClick={() => onAsk(q)} disabled={asking}>
              {q}
            </button>
          ))}
        </div>
        {answer && (
          <div className="answer" aria-live="polite">
            <div className="answer-label">{s.askExplanation}</div>
            <p style={{ marginTop: 6 }}>{answer.text}</p>
            {answer.clauseId && (
              <button className="link-btn" onClick={() => onOpenClause(answer.clauseId!)}>
                {s.askShowClause}
              </button>
            )}
          </div>
        )}
        <form
          className="ask-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (typed.trim()) {
              onAsk(typed.trim());
              setTyped("");
            }
          }}
        >
          <input aria-label={s.askHeading} placeholder={s.askPlaceholder} value={typed} onChange={(e) => setTyped(e.target.value)} />
          <button className="btn btn-primary" type="submit" disabled={asking}>
            {s.askBtn}
          </button>
        </form>
      </div>

      <div className="overview-foot">
        <button className="btn" onClick={onOriginal}>
          {s.viewOriginal}
        </button>
        <button className="btn btn-primary" onClick={onDecision}>
          {s.beforeSign}
        </button>
      </div>
      <p className="disclaimer">{s.disclaimer}</p>
    </section>
  );
}
