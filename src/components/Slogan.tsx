import { useEffect, useState } from "react";

// Typewriter effect
const TYPE_MS = 45;
const WORD_PAUSE_MS = 35;
const PUNCTUATION_PAUSE_MS = 90;
const ERASE_MS = 28;
const HOLD_MS = 2800;
const GAP_MS = 220;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

function typeDelay(text: string, characterIndex: number) {
  const character = text[characterIndex] ?? "";
  if (/[.,;:!?]/.test(character)) return TYPE_MS + PUNCTUATION_PAUSE_MS;
  if (/\s/.test(character)) return TYPE_MS + WORD_PAUSE_MS;
  return TYPE_MS;
}

export function Slogan({
  slogans,
  label,
}: {
  slogans: string[];
  label: string;
}) {
  const reduced = prefersReducedMotion();
  const [{ i, n, erasing }, set] = useState({ i: 0, n: 0, erasing: false });

  useEffect(() => {
    if (reduced || slogans.length === 0) return;
    const text = slogans[i] ?? "";
    const [delay, next] =
      !erasing && n < text.length
        ? [typeDelay(text, n), { i, n: n + 1, erasing }]
        : !erasing
          ? [HOLD_MS, { i, n, erasing: true }]
          : n > 0
            ? [ERASE_MS, { i, n: n - 1, erasing }]
            : [GAP_MS, { i: (i + 1) % slogans.length, n: 0, erasing: false }];
    const id = setTimeout(() => set(next), delay);
    return () => clearTimeout(id);
  }, [i, n, erasing, reduced, slogans]);

  const current = slogans[i] ?? "";
  const phase: "typing" | "holding" | "erasing" | "gap" = erasing
    ? n > 0
      ? "erasing"
      : "gap"
    : n < current.length
      ? "typing"
      : "holding";
  const idle = phase === "holding" || phase === "gap";
  return (
    <span className="slogan">
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className={`slogan-text is-${phase}`}>
        {reduced ? current : current.slice(0, n)}
        {!reduced && <i className={"slogan-caret" + (idle ? " idle" : "")} />}
      </span>
    </span>
  );
}
