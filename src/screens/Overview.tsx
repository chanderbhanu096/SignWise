import { useState, useMemo } from "react";
import type { Analysis, Level } from "../types";
import { LEVELS } from "../types";
import { t } from "../i18n";
import { euro } from "../format";
import { isIsoCalendarDate } from "../ics";
import { lawChecks } from "../lawcheck";
import type { LawHit } from "../lawcheck";
import { getContractCategory, getFinancialCopy, getContractSuggestions, getMoneyState } from "../contract";
import { derivedPayFor } from "../pay";
import { chartPlan } from "../chart";
import { Severity, MARK } from "../components/Severity";
import { Section } from "../components/Section";

export function Overview({
  analysis,
  filename,
  pages,
  onOpenClause,
  onOriginal,
  onDecision,
  onAsk,
  answer,
  asking,
  disabled = false,
  onAddCalendar,
  calMsg,
}: {
  analysis: Analysis;
  filename: string;
  pages: number | null;
  onOpenClause: (id: string) => void;
  onOriginal: () => void;
  onDecision: () => void;
  onAsk: (q: string) => void;
  answer: { text: string; clauseId: string | null; question?: string; error?: boolean } | null;
  asking: boolean;
  disabled?: boolean;
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

  const items = money.oneTime; // one-time costs (expense) or additional pay (income)
  const stated = getMoneyState(money);
  // A contract paid by the hour states its income as plainly as a salaried one —
  // it just leaves the multiplication to the reader. Without this the whole money
  // panel of a working-student or hourly contract was one card of prose and no
  // figure at all, and the 12-month chart never drew, because both hang off a
  // monthly number the contract technically never writes down.
  const derivedPay = derivedPayFor(analysis);
  const hoursLabel = derivedPay ? `${derivedPay.hours}${derivedPay.hoursMax != null ? `–${derivedPay.hoursMax}` : ""}` : "";
  const moneyState = derivedPay
    ? { ...stated, headline: { amount: derivedPay.monthly, period: "monthly" as const }, hasAnything: true }
    : stated;
  const monthly = money.monthly ?? derivedPay?.monthly ?? 0;

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

  // Twelve identical bars are a picture of nothing. What makes a year of this
  // contract worth drawing is the month that differs — the deposit, the bonus,
  // the holiday payment — so a one-time amount is drawn on top of the month it
  // falls in. Month numbers, never calendar months: the response does not anchor
  // payment timing to a start date, and "Oct, Nov, Dec" would be an invention.
  const months = Array.from({ length: 12 }, (_, i) => `${analysis.lang === "de" ? "Monat" : "Month"} ${i + 1}`);
  // Which bar a one-off lands on is a claim about the reader's money, so it is
  // decided in one tested place rather than inline here. A payment the contract
  // never timed is not drawn at all: the old code put it on month one and then
  // captioned it as a deposit, which was two inventions in one sentence.
  const { bump, note: bumpNote, unplaced } = chartPlan(items, income);
  const bars = months.map((label, i) => ({ label, base: monthly, extra: bump[i], value: monthly + bump[i] }));
  const maxBar = Math.max(...bars.map((b) => b.value), 1);
  // A deposit can be several times the rent. Drawn to a literal scale it flattens
  // the other eleven months into stubs, so past ~1.8x the recurring amount the
  // axis is compressed: the recurring months keep a readable share and the tall
  // month is clearly taller without being tall in proportion. Every bar still
  // carries its real figure, and the compression is disclosed under the chart.
  const RECUR_SHARE = 0.58;
  const compressed = monthly > 0 && maxBar > monthly * 1.8;
  const barPct = (v: number) =>
    !compressed
      ? (v / maxBar) * 100
      : v <= monthly
        ? (v / monthly) * RECUR_SHARE * 100
        : (RECUR_SHARE + ((v - monthly) / (maxBar - monthly)) * (1 - RECUR_SHARE)) * 100;
  const yearTotal = bars.reduce((a, b) => a + b.value, 0);
  const showChart = !neutral && monthly > 0;
  const chartNote = bumpNote == null ? ""
    : bumpNote.kind === "bonus" ? s.bonusBump
    : s.depositBumpIn(months[bumpNote.month]);
  const unplacedNote = unplaced.length ? s.chartUnplaced(unplaced.map((it) => it.label).join(", ")) : "";
  const chartExclusions = analysis.lang === "de"
    ? "Gezeigt wird der monatliche Grundbetrag, unverändert über 12 Monate, plus einmalige Zahlungen in dem Monat, in dem sie anfallen. Variable Zahlungen ohne festen Betrag sind nicht enthalten; sie stehen separat oben. Die Monatsnummern sind Vertragsmonate, keine Kalendermonate."
    : "The monthly base amount is shown held constant over 12 months, plus any one-off payment in the month it falls due. Variable payments with no fixed amount are excluded and listed separately above. The month numbers are contract months, not calendar months.";

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

  // Attention triage over the *whole* analysis, not just the five headline findings.
  // Counting only the findings made a contract whose top five all happen to be
  // important read as "5 important, 0 of anything else", which says nothing about
  // the contract and everything about the cut-off. The default list still shows the
  // headline findings; picking a level opens up every clause at that level.
  const counts = Object.fromEntries(
    LEVELS.map((l) => [l, analysis.clauses.filter((c) => c.level === l).length]),
  ) as Record<Level, number>;
  // A filtered list is every clause at one level, in document order — not a ranking.
  // Numbering it 1..n invented a second, conflicting set of numbers for clauses that
  // already have one (their finding number, shown in the contract-text view). The
  // rank badge belongs to the ranked list only.
  const shown = filter ? analysis.clauses.filter((c) => c.level === filter).map((c) => ({ c, n: 0 })) : findings;

  // Calendar: the first warning-tone (or first available) date with a machine date.
  // One pass over the benchmarks for the whole list; lawChecksFor would re-run every
  // rule for every row.
  const lawByClause = useMemo(() => {
    const byClause = new Map<string, LawHit[]>();
    for (const hit of lawChecks(analysis)) byClause.set(hit.clauseId, [...(byClause.get(hit.clauseId) ?? []), hit]);
    return byClause;
  }, [analysis]);

  const deadline = analysis.dates.find((d) => d.tone === "warning" && isIsoCalendarDate(d.iso)) ?? analysis.dates.find((d) => isIsoCalendarDate(d.iso));
  const hasUrgentDate = analysis.dates.some((d) => d.tone === "warning");
  const rdCount = analysis.rights.length + analysis.duties.length;

  const sourceLink = (clauseId: string | undefined, label: string) => clauseId && byId(clauseId) ? (
    <button
      className="link-btn money-source"
      type="button"
      aria-label={`${s.showClause}: ${label}`}
      onClick={() => onOpenClause(clauseId)}
    >
      {s.showClause}
    </button>
  ) : null;

  const itemRow = (label: string, amount: number | null, ref?: string, freq?: string, key?: string, clauseId?: string) => (
    <div className="money-row" key={key ?? label}>
      <span>
        {label}
        {freqNote(freq) && <span className="finding-ref">{freqNote(freq)}</span>}
        {ref && <span className="finding-ref"> · {ref}</span>}
        {sourceLink(clauseId, label)}
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
          <p className="section-sub overview-sub">
            {filename} · {s.fileMeta(pages)}
          </p>
        </div>
      </div>

      <dl className="glance">
        {analysis.glance.map((g) => (
          <div key={g.key}>
            <dt>{g.key}</dt>
            <dd>
              {g.value} {g.derived && <span className="derived">({analysis.lang === "de" ? "abgeleitet" : "derived"})</span>}
              {sourceLink(g.clauseId, g.key)}
            </dd>
          </div>
        ))}
      </dl>

      {/* Findings — always open, with the attention triage as its header */}
      <div className="card block">
        <h2 className="section-h">
          {s.findingsHeading(findings.length)}
        </h2>
        <p className="section-sub">{s.findingsSub}</p>

        <div className="attn">
          <div className="attn-top">
            <span className="attn-label">{s.attentionHeading}</span>
          </div>
          <div className="attn-chips" role="group" aria-label={s.attentionHeading}>
            {/* Clearing the filter used to be a text link in the corner of the
                header — the one control nobody could find once they had filtered,
                and the only one that was not in the row it undoes. It is a chip
                now: same shape, same row, and visibly on when nothing is filtered,
                so the four states read as one control instead of three plus an
                escape hatch. No count on it, because the unfiltered list is the
                ranked shortlist and not every clause — the line below says so. */}
            <button
              className={"attn-chip" + (filter === null ? " on" : "")}
              aria-pressed={filter === null}
              onClick={() => setFilter(null)}
            >
              {s.filterAll}
            </button>
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
          <p className="attn-scope">{s.attentionScope(analysis.clauses.length, findings.length)}</p>
          {/* The colours mean attention, never legal validity. Said out loud, not implied. */}
          <details className="attn-note">
            <summary>{s.attentionNoteToggle}</summary>
            <p>{s.attentionNote}</p>
            <p>{s.levelLegend}</p>
          </details>
        </div>

        <p className="sr-only" role="status">
          {s.filterShowing(shown.length, analysis.clauses.length)}
        </p>
        <ol className={"findings" + (filter ? " unranked" : "")}>
          {shown.map(({ c, n }) => (
            <li key={c.id}>
              <button
                className={"finding" + (c.verified ? "" : " unverified")}
                data-level={c.level}
                onClick={() => onOpenClause(c.id)}
              >
                {n > 0 && (
                  <span className="finding-n" aria-hidden="true">
                    {n}
                  </span>
                )}
                <span className="finding-body">
                  <span className="finding-title">{c.title}</span>
                  <span className="finding-meta">
                    <Severity level={c.level} lang={analysis.lang} />
                    <span className="finding-ref">{c.ref}</span>
                    {/* The statutory benchmark used to live two clicks away, inside
                        this clause's panel. A reader who never opened the panel never
                        learned that their contract and the statute say different
                        things — which is the most useful sentence this app has. The
                        citation rides along on the row that is already on screen. */}
                    {(lawByClause.get(c.id) ?? []).map((hit) => (
                      <span className="finding-law" key={hit.id} title={`${s.lawPanelLabel}: ${hit.rule}`}>
                        {hit.cite}
                      </span>
                    ))}
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

      {/* Money before the question box: the reader's second question after "what
          is wrong with this" is "what does it cost me", and both are facts read
          off the document. The Q&A is a tool, and tools come after the reading. */}
      {/* Financial — heading, labels and chart adapt to the contract category.
          Nothing stated? A single line, not a card full of dashes. */}
      {moneyState.hasAnything ? (
        // A plain card, not the collapsible <Section> used below for dates and
        // rights/duties. That component's chevron-and-summary chrome reads as
        // "optional, tuck away if you like" — exactly wrong for the one section
        // holding the figure the reader came for, and it let an accidental tap
        // hide it entirely. Same non-collapsible treatment as the findings card
        // above it, so the two read as equally primary rather than one looking
        // skippable next to the other.
        <div className="card block">
          <h2 className="section-h">
            {fin.heading}
          </h2>
          <p className="section-sub">{fin.subheading}</p>
          {/* The one number the reader came for gets the width of the page, not a
              third of it. It used to sit in the leftmost of three equal cards,
              the same size as "other possible payments" — so the salary and a
              footnote about overtime carried identical weight on screen. */}
          {moneyState.headline && (
            <div className="pay-hero">
              <div className="pay-hero-main">
                <div className="money-label">{moneyState.headline.period === "monthly" ? fin.monthly : fin.yearly}</div>
                {/* A contract that can demand more hours pays more in those months, so
                    a single figure would have to pick a week and call it the answer.
                    The range is the contract's own answer. */}
                <div className="pay-amount">
                  {fmt(moneyState.headline.amount)}
                  {derivedPay?.monthlyMax != null && <span className="pay-range"> – {fmt(derivedPay.monthlyMax)}</span>}
                </div>
                {derivedPay ? (
                  <>
                    {/* Arithmetic the reader can redo. A figure the contract does not
                        state has to show its working, or it is indistinguishable from
                        one the contract does state. */}
                    <div className="pay-basis">
                      {s.payBasis(fmt(derivedPay.hourly), hoursLabel)} · <span className="derived">{s.payDerivedTag}</span>
                    </div>
                    {sourceLink(derivedPay.clauseId, fin.monthly)}
                  </>
                ) : (
                  sourceLink(moneyState.headline.period === "monthly" ? money.monthlyClauseId : money.yearlyClauseId,
                    moneyState.headline.period === "monthly" ? fin.monthly : fin.yearly)
                )}
              </div>
              <div className="pay-aside">
                {moneyState.headline.period === "monthly" && money.yearly != null && (
                  <div className="pay-stat">
                    <span>{fin.yearly}</span>
                    <b>{fmt(money.yearly)}</b>
                    {money.yearlyClauseId !== money.monthlyClauseId && sourceLink(money.yearlyClauseId, fin.yearly)}
                  </div>
                )}
                {derivedPay && (
                  <div className="pay-stat">
                    <span>{fin.yearly}</span>
                    <b>
                      {fmt(derivedPay.monthly * 12)}
                      {derivedPay.monthlyMax != null && <span className="pay-range"> – {fmt(derivedPay.monthlyMax * 12)}</span>}
                    </b>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="money">
            {items.length > 0 &&
              (mixed ? (
                <div className="card">
                  <div className="money-label">{fin.receiveHeading}</div>
                  {items
                    .filter((it) => ["salary", "bonus", "holiday_pay", "variable"].includes(it.kind ?? ""))
                    .map((it, i) => itemRow(it.label, it.amount, it.ref, it.freq, "r" + i, it.clauseId))}
                  <div className="money-label" style={{ marginTop: 14 }}>
                    {fin.payHeading}
                  </div>
                  {items
                    .filter((it) => ["rent", "deposit", "fee", "other"].includes(it.kind ?? "other"))
                    .map((it, i) => itemRow(it.label, it.amount, it.ref, it.freq, "p" + i, it.clauseId))}
                </div>
              ) : (
                <div className="card">
                  <div className="money-label">{fin.extrasHeading}</div>
                  {items.map((it, i) => itemRow(it.label, it.amount, it.ref, it.freq, "it" + i, it.clauseId))}
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
                      {sourceLink(v.clauseId, v.label)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {showChart && (
            // Not a card: this already sits inside the money card. A box in a box
            // is the nesting the rest of this pass removed, and on a phone its two
            // paddings cost the chart 36px — about one month of the twelve.
            <div className="chart-block">
              <div className="overview-head chart-head">
                <h3 className="chart-title">{fin.chartTitle || (analysis.lang === "de" ? "Monatlicher Grundbetrag über 12 Monate" : "Monthly base amount over 12 months")}</h3>
                <span className="chart-total">{s.chartYearTotal(fmt(yearTotal))}</span>
              </div>
              {chartNote && <p className="chart-note">{chartNote}</p>}
              <div
                className="chart"
                role="img"
                tabIndex={0}
                aria-label={
                  analysis.lang === "de"
                    ? `Hochrechnung über 12 Monate: Grundbetrag je ${fmt(monthly)}${chartNote ? "; " + chartNote : ""} Zusammen ${fmt(yearTotal)}. ${chartExclusions}${unplacedNote ? " " + unplacedNote : ""}`
                    : `Projection over 12 months: base amount ${fmt(monthly)} each${chartNote ? "; " + chartNote : ""} Total ${fmt(yearTotal)}. ${chartExclusions}${unplacedNote ? " " + unplacedNote : ""}`
                }
              >
                {bars.map((b) => (
                  <div className={"bar-col" + (b.extra > 0 ? " tall" : "")} key={b.label} aria-hidden="true">
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
              {/* The chart holds today's amounts flat for a year. On a contract that
                  allows an increase — and one of the findings on this very page may
                  say so — that is a projection, not a forecast. Said, not implied. */}
              {unplacedNote && <p className="chart-note">{unplacedNote}</p>}
              {compressed && <p className="chart-scale-note">{s.chartScaleNote}</p>}
              <p className="chart-scale-note">{s.chartProjectionNote}</p>
              <p className="chart-scale-note">{chartExclusions}</p>

            </div>
          )}
        </div>
      ) : (
        // Absence is itself worth stating when the contract type implies money.
        !neutral && <p className="sec-empty block">{s.noAmounts}</p>
      )}

      {/* Ask — never collapsed: it is the proof the analysis is about *this* document */}
      <div className="card block ask-card">
        <h2 className="overview-card-title">{s.askHeading}</h2>
        <p className="section-sub overview-sub">
          {s.askSub}
        </p>
        <div className="ask-chips">
          {suggestions.map((q) => (
            <button key={q} className="chip" onClick={() => {
              if (asking || disabled) return;
              setTyped(q);
              onAsk(q);
            }} disabled={asking || disabled}>
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
          <div className="answer" role={answer.error ? "alert" : "status"}>
            {answer.question && (
              <p style={{ marginBottom: 12 }}>
                <strong>{analysis.lang === "de" ? "Ihre Frage:" : "Your question:"}</strong> {answer.question}
              </p>
            )}
            <div className="answer-label">{answer.error
              ? analysis.lang === "de" ? "Antwort gerade nicht verfügbar" : "Answer unavailable right now"
              : s.askExplanation}</div>
            <p style={{ marginTop: 6 }}>{answer.text}</p>
            {!answer.error && answer.clauseId && byId(answer.clauseId) && (
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
            if (!asking && !disabled && typed.trim() && typed.trim().length <= 2000) {
              onAsk(typed.trim());
            }
          }}
        >
          <input aria-label={s.askHeading} placeholder={s.askPlaceholder} maxLength={2000} value={typed} disabled={disabled} onChange={(e) => setTyped(e.target.value)} />
          <button className="btn btn-primary" type="submit" disabled={asking || disabled || !typed.trim()}>
            {s.askBtn}
          </button>
        </form>
      </div>

      {/* Dates — open when one of them is a deadline that can cost the reader */}
      {analysis.dates.length > 0 && (
        <Section title={s.datesHeading} sub={s.datesSub} count={s.sectionCount(analysis.dates.length)} defaultOpen={hasUrgentDate}>
          <ol className="timeline">
            {analysis.dates.map((d, i) => (
              <li className="tl" data-tone={d.tone} key={i}>
                <div className="tl-rail">
                  <span className="tl-dot" aria-hidden="true" />
                  <span className="tl-line" aria-hidden="true" />
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
              {s.addCalendar(deadline.date)}
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
                <h3 className="overview-card-title">{s.rightsHeading}</h3>
                <p className="section-sub overview-sub">
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
                <h3 className="overview-card-title">{s.dutiesHeading}</h3>
                <p className="section-sub overview-sub">
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
