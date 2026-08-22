import { useState } from "react";
import type { Analysis, Depth, Level } from "../types";
import { DEPTHS, LEVELS } from "../types";
import { t } from "../i18n";
import { euro } from "../format";
import { getContractCategory, getFinancialCopy, getContractSuggestions, getMoneyState } from "../contract";
import { Severity, MARK } from "../components/Severity";
import { Section } from "../components/Section";

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
  onAddCalendar: (summary: string, iso: string) => void;
  calMsg: string;
}) {
  const s = t(analysis.lang);
  const { money } = analysis;
  const [typed, setTyped] = useState("");
  const [filter, setFilter] = useState<Level | null>(null);
  const byId = (id: string) => analysis.clauses.find((c) => c.id === id);
  const locale = analysis.lang === "de" ? "de-DE" : "en-GB";
  const cur = money.currency;
  const fmt = (n: number) => euro(n, analysis.lang, cur);

  // Contract-type-aware financial framing.
  const category = getContractCategory(analysis);
  const fin = getFinancialCopy(category, analysis.lang);
  const income = category === "income";
  const mixed = category === "mixed";
  const neutral = category === "neutral";

  const monthly = money.monthly ?? 0;
  const items = money.oneTime; // one-time costs (expense) or additional pay (income)
  const moneyState = getMoneyState(money);

  // Freq note appended to a line item, e.g. "/ year".
  const freqNote = (freq?: string) =>
    freq === "annual"
      ? analysis.lang === "de"
        ? " / Jahr"
        : " / year"
      : freq === "monthly"
        ? analysis.lang === "de"
          ? " / Monat"
          : " / month"
        : "";

  // Chart overlays: a base monthly amount, plus any extra placed in a known month.
  const placed = items
    .filter((it) => it.amount != null && it.timingMonth != null)
    .map((it) => ({ it, m: it.timingMonth as number }));
  // Legacy/expense fallback: a deposit-like one-time cost lands in the first month.
  let overlay = placed;
  if (overlay.length === 0 && category === "expense") {
    const dep = items.find((it) => it.amount != null && it.freq !== "annual" && it.freq !== "monthly");
    if (dep) overlay = [{ it: dep, m: 0 }];
  }
  const bumpByMonth = Array(12).fill(0);
  for (const o of overlay) if (o.m >= 0 && o.m < 12) bumpByMonth[o.m] += o.it.amount as number;

  const months = Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(2026, 9 + i, 1)),
  );
  const bars = months.map((m, i) => ({ label: m, base: monthly, extra: bumpByMonth[i], value: monthly + bumpByMonth[i] }));
  const maxBar = Math.max(...bars.map((b) => b.value), 1);
  // A deposit can be several times the rent. Drawn to a literal scale that flattens
  // the other eleven months into stubs, so past ~1.8x the recurring amount the axis
  // is compressed: the recurring months keep a readable share and the tall month is
  // clearly taller without being tall in proportion. Every bar is still labelled
  // with its real figure, and the compression is disclosed under the chart.
  const RECUR_SHARE = 0.58;
  const compressed = monthly > 0 && maxBar > monthly * 1.8;
  const barPct = (v: number) =>
    !compressed
      ? (v / maxBar) * 100
      : v <= monthly
        ? (v / monthly) * RECUR_SHARE * 100
        : (RECUR_SHARE + ((v - monthly) / (maxBar - monthly)) * (1 - RECUR_SHARE)) * 100;
  const showChart = !neutral && monthly > 0;

  const depositOverlay = overlay.find((o) => o.it.kind === "deposit") || (category === "expense" ? overlay.find((o) => o.m === 0) : undefined);
  const chartNote = income && overlay.length ? s.bonusBump : depositOverlay ? s.depositBump : "";

  // Amounts we could not confidently place in a month.
  const unplaced = items.filter(
    (it) => it.amount != null && it.timingMonth == null && it.freq !== "monthly" && !overlay.some((o) => o.it === it),
  );

  // Income total (only when the document clearly adds an annual amount on top).
  const annualExtras = items.filter((it) => it.freq === "annual" && it.amount != null);
  const showTotal = income && money.yearly != null && annualExtras.length > 0;
  const totalAnnual = (money.yearly ?? 0) + annualExtras.reduce((a, it) => a + (it.amount ?? 0), 0);

  // "Possible additional costs" only reads right for expenses; income/mixed get a neutral label.
  const variableHeading =
    income || mixed
      ? analysis.lang === "de"
        ? "Weitere mögliche Zahlungen"
        : "Other possible payments"
      : s.possibleAddl;

  const suggestions = getContractSuggestions(analysis.contractType, analysis.lang);
  const findings = analysis.findings.map((id, i) => ({ c: byId(id)!, n: i + 1 })).filter((x) => x.c);

  // Attention triage. The counts are over the findings the reader can actually see,
  // so a filter never claims more than the list holds.
  const counts = Object.fromEntries(LEVELS.map((l) => [l, findings.filter((f) => f.c.level === l).length])) as Record<Level, number>;
  const shown = filter ? findings.filter((f) => f.c.level === filter) : findings;

  // Calendar: the first warning-tone (or first available) date with a machine date.
  const deadline = analysis.dates.find((d) => d.tone === "warning" && d.iso) ?? analysis.dates.find((d) => d.iso);
  const hasUrgentDate = analysis.dates.some((d) => d.tone === "warning");
  const rdCount = analysis.rights.length + analysis.duties.length;

  const itemRow = (label: string, amount: number | null, ref?: string, freq?: string, key?: string) => (
    <div className="money-row" key={key ?? label}>
      <span>
        {label}
        {freqNote(freq) && <span className="finding-ref">{freqNote(freq)}</span>}
        {ref && <span className="finding-ref"> · {ref}</span>}
      </span>
      {amount != null ? <strong>{fmt(amount)}</strong> : <span className="na">{s.notMentioned}</span>}
    </div>
  );

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

      {/* Findings — always open, with the attention triage as its header */}
      <div className="card block">
        <h2 className="section-h" style={{ fontSize: 22 }}>
          {s.findingsHeading(findings.length)}
        </h2>
        <p className="section-sub">{s.findingsSub}</p>

        <div className="attn">
          <div className="attn-top">
            <span className="attn-label">{s.attentionHeading}</span>
            {filter && (
              <button className="link-btn" onClick={() => setFilter(null)}>
                {s.filterAll}
              </button>
            )}
          </div>
          <div className="attn-chips" role="group" aria-label={s.attentionHeading}>
            {LEVELS.map((lv) => (
              <button
                key={lv}
                className={"attn-chip" + (filter === lv ? " on" : "")}
                data-level={lv}
                aria-pressed={filter === lv}
                disabled={counts[lv] === 0}
                onClick={() => setFilter(filter === lv ? null : lv)}
              >
                <span className="attn-mark" aria-hidden="true">
                  {MARK[lv]}
                </span>
                <span>{s.levelName[lv]}</span>
                <span className="attn-n">{counts[lv]}</span>
              </button>
            ))}
          </div>
          {/* The colours mean attention, never legal validity. Said out loud, not implied. */}
          <details className="attn-note">
            <summary>{s.attentionNoteToggle}</summary>
            <p>{s.attentionNote}</p>
            <p>{s.levelLegend}</p>
          </details>
        </div>

        <p className="sr-only" role="status">
          {s.filterShowing(shown.length, findings.length)}
        </p>
        <ol className="findings">
          {shown.map(({ c, n }) => (
            <li key={c.id}>
              <button
                className={"finding" + (c.verified ? "" : " unverified")}
                data-level={c.level}
                onClick={() => onOpenClause(c.id)}
              >
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
      </div>

      {/* Ask — never collapsed: it is the proof the analysis is about *this* document */}
      <div className="card block ask-card">
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
        {/* The model can take a while; without this the card looks inert and people
            press the button again. */}
        {asking && (
          <div className="ask-thinking" role="status">
            <span className="ask-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            {s.askThinking}
          </div>
        )}
        {answer && !asking && (
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

      {/* Financial — heading, labels and chart adapt to the contract category.
          Nothing stated? A single line, not a card full of dashes. */}
      {moneyState.hasAnything ? (
        <Section title={fin.heading} sub={fin.subheading} defaultOpen>
          <div className="money">
            {moneyState.headline && (
              <div className="card">
                <div className="money-label">{moneyState.headline.period === "monthly" ? fin.monthly : fin.yearly}</div>
                <div className="money-big">{fmt(moneyState.headline.amount)}</div>
                {moneyState.headline.period === "monthly" && money.yearly != null && (
                  <div className="money-year">
                    {fin.yearly}: {fmt(money.yearly)}
                  </div>
                )}
              </div>
            )}

            {moneyState.hasDetail &&
              (mixed ? (
                <div className="card">
                  <div className="money-label">{fin.receiveHeading}</div>
                  {items
                    .filter((it) => ["salary", "bonus", "holiday_pay", "variable"].includes(it.kind ?? ""))
                    .map((it, i) => itemRow(it.label, it.amount, it.ref, it.freq, "r" + i))}
                  <div className="money-label" style={{ marginTop: 14 }}>
                    {fin.payHeading}
                  </div>
                  {items
                    .filter((it) => ["rent", "deposit", "fee", "other"].includes(it.kind ?? "other"))
                    .map((it, i) => itemRow(it.label, it.amount, it.ref, it.freq, "p" + i))}
                </div>
              ) : (
                <div className="card">
                  <div className="money-label">{fin.extrasHeading}</div>
                  {items.map((it, i) => itemRow(it.label, it.amount, it.ref, it.freq, "it" + i))}
                  {showTotal && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                      <div className="money-row">
                        <span>{s.baseAnnual}</span>
                        <strong>{fmt(money.yearly as number)}</strong>
                      </div>
                      <div className="money-row">
                        <span>{s.additionalAnnual}</span>
                        <strong>{fmt(totalAnnual - (money.yearly as number))}</strong>
                      </div>
                      <div className="money-row">
                        <span style={{ fontWeight: 700 }}>{s.totalAnnual}</span>
                        <strong>{fmt(totalAnnual)}</strong>
                      </div>
                    </div>
                  )}
                </div>
              ))}

            {/* Amounts the contract never fixes have no figure to put in the right
                column, so they get their own card instead of sitting in rows that
                are aligned around a number they do not have. */}
            {money.variable.length > 0 && (
              <div className="card">
                <div className="money-label">{variableHeading}</div>
                <ul className="money-notes">
                  {money.variable.map((v) => (
                    <li key={v.label}>
                      <strong>{v.label}</strong>
                      <p>{v.note}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {showChart && (
            <div className="card block">
              <div className="overview-head" style={{ alignItems: "center" }}>
                <h3 style={{ fontSize: 18 }}>{fin.chartTitle}</h3>
                {chartNote && <span className="finding-ref">{chartNote}</span>}
              </div>
              <div
                className="chart"
                role="img"
                tabIndex={0}
                aria-label={
                  analysis.lang === "de"
                    ? `Balkendiagramm über 12 Monate: Grundbetrag je ${fmt(monthly)}; hervorgehobene Monate enthalten eine zusätzliche Zahlung.`
                    : `Bar chart over 12 months: base amount ${fmt(monthly)} each; highlighted months include an extra payment.`
                }
              >
                {bars.map((b, i) => (
                  <div className="bar-col" key={i}>
                    <span className="bar-amt">{new Intl.NumberFormat(locale).format(b.value)}</span>
                    {/* The track is the grid's only flexible row, so a percentage height
                        on the bar resolves against the space the bars actually have. */}
                    <div className="bar-track">
                      <div className="bar" style={{ height: `${barPct(b.value)}%` }}>
                        {b.extra > 0 && (
                          <div
                            className="bar-extra"
                            style={{ height: `${((barPct(b.value) - barPct(b.base)) / barPct(b.value)) * 100}%` }}
                          />
                        )}
                      </div>
                    </div>
                    <span className="bar-m">{b.label}</span>
                  </div>
                ))}
              </div>
              {compressed && <p className="chart-scale-note">{s.chartScaleNote}</p>}
              {unplaced.length > 0 && (
                <ul className="rd-list" style={{ marginTop: 14 }}>
                  {unplaced.map((it, i) => (
                    <li className="rd-item" key={"u" + i}>
                      <span className="rd-mark duty" aria-hidden="true">
                        •
                      </span>
                      <span className="rd-text">
                        {s.timingUnspecified}: {it.label}
                        {it.amount != null && <> — {fmt(it.amount)}</>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Section>
      ) : (
        // Absence is itself worth stating when the contract type implies money.
        !neutral && <p className="sec-empty block">{s.noAmounts}</p>
      )}

      {/* Dates — open when one of them is a deadline that can cost the reader */}
      {analysis.dates.length > 0 && (
        <Section title={s.datesHeading} sub={s.datesSub} count={s.sectionCount(analysis.dates.length)} defaultOpen={hasUrgentDate}>
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
          {deadline && (
            <button className="btn" onClick={() => onAddCalendar(deadline.title, deadline.iso as string)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M4 6h16v14H4z" />
                <path d="M8 3v4M16 3v4M4 11h16" />
              </svg>
              {s.addCalendar}
            </button>
          )}
          {calMsg && (
            <div className="banner-warn" style={{ marginTop: 12 }}>
              <div className="banner-in">{calMsg}</div>
            </div>
          )}
        </Section>
      )}

      {/* Rights / duties — detail, one click away */}
      {rdCount > 0 && (
        <Section title={s.rightsDutiesHeading} count={s.sectionCount(rdCount)}>
          <div className="two">
            {analysis.rights.length > 0 && (
              <div className="card">
                <h3 style={{ fontSize: 20 }}>{s.rightsHeading}</h3>
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
            )}
            {analysis.duties.length > 0 && (
              <div className="card">
                <h3 style={{ fontSize: 20 }}>{s.dutiesHeading}</h3>
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
            )}
          </div>
        </Section>
      )}

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
