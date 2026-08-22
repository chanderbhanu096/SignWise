import { useEffect, useState } from "react";
import type { Lang } from "../types";
import { t } from "../i18n";

// The three phases the app can actually observe: text extraction in the browser,
// the model call, and the quote check afterwards. Nothing here is on a script —
// a step only completes when that work really finished.
export type Phase = "read" | "model" | "verify";

// The model does clause finding and cost/deadline checking in one pass, so both
// of those rows are live during it.
const ACTIVE: Record<Phase, number[]> = { read: [0], model: [1, 2], verify: [3] };

function clock(ms: number) {
  const secs = Math.floor(ms / 1000);
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}

export function Analyzing({
  lang,
  phase,
  filename,
  onCancel,
}: {
  lang: Lang;
  phase: Phase;
  filename: string;
  onCancel: () => void;
}) {
  const s = t(lang);
  const [ms, setMs] = useState(0);
  const [phaseMs, setPhaseMs] = useState(0);

  useEffect(() => {
    const from = Date.now();
    const id = setInterval(() => setMs(Date.now() - from), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const from = Date.now();
    setPhaseMs(0);
    const id = setInterval(() => setPhaseMs(Date.now() - from), 250);
    return () => clearInterval(id);
  }, [phase]);

  const done = (i: number) => ACTIVE[phase][0] > i;
  const state = (i: number) => (ACTIVE[phase].includes(i) ? "active" : done(i) ? "done" : "todo");
  const mark = (i: number) => (state(i) === "done" ? "✓" : state(i) === "active" ? "◍" : "○");

  // Creeps towards a ceiling it never reaches, so the bar keeps moving however long
  // the model takes without ever claiming to be finished.
  const pct =
    phase === "read"
      ? 6 + Math.min(12, phaseMs / 250)
      : phase === "verify"
        ? 96
        : 18 + 74 * (1 - Math.exp(-phaseMs / 22000));

  const patience = ms >= 40000 ? s.analyzingPatience[1] : ms >= 15000 ? s.analyzingPatience[0] : "";

  return (
    <section className="screen shell" style={{ maxWidth: 640 }} aria-labelledby="an-h">
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0f5f6b" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 3v5h5" />
          <path d="M6 3h8l5 5v13H6z" />
        </svg>
        <span style={{ fontWeight: 600, wordBreak: "break-all" }}>{filename}</span>
      </div>

      <h1 className="section-h" id="an-h" style={{ fontSize: 24 }}>
        {s.analyzingTitle}
      </h1>
      <p className="section-sub">{s.analyzingSub}</p>

      <ol className="steps" aria-live="polite">
        {s.steps.map((label, i) => (
          <li key={i} className="step" data-state={state(i)}>
            <span className="step-dot" aria-hidden="true">
              {mark(i)}
            </span>
            <span className="step-text">{label}</span>
          </li>
        ))}
      </ol>

      <div className="progress" aria-hidden="true">
        <i className="progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="analyzing-meta">
        {/* Ticking text is not announced — it would talk over everything else. */}
        <span className="analyzing-clock" aria-hidden="true">
          {ms >= 3000 && s.analyzingElapsed(clock(ms))}
        </span>
        {ms >= 15000 && (
          <button className="link-btn" onClick={onCancel}>
            {s.cancelAnalysis}
          </button>
        )}
      </div>

      <p className="analyzing-patience" role="status">
        {patience}
      </p>
    </section>
  );
}
