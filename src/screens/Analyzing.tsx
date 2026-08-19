import type { Lang } from "../types";
import { t } from "../i18n";

export function Analyzing({ lang, step, filename, onSkip }: { lang: Lang; step: number; filename: string; onSkip: () => void }) {
  const s = t(lang);
  const state = (i: number) => (i < step ? "done" : i === step ? "active" : "todo");
  const mark = (i: number) => (i < step ? "✓" : i === step ? "◍" : "○");

  return (
    <section className="screen shell" style={{ maxWidth: 640 }} aria-labelledby="an-h">
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1552cf" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
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
        <i style={{ width: `${Math.min(100, step * 25 + 6)}%` }} />
      </div>

      <button className="link-btn" style={{ marginTop: 20 }} onClick={onSkip}>
        {s.skip}
      </button>
    </section>
  );
}
