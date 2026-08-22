import { useEffect, useState } from "react";

// Typewriter that cycles the localized slogans, one at a time, as the upload
// screen's headline.
//
// The line must not move while it types. Two things hold it still: a hidden copy
// of every slogan stacked in the same grid cell, so the box is always as wide and
// as tall as the largest one, and the untyped remainder of the current slogan kept
// in the flow but invisible, so the typed part never re-wraps between keystrokes.
//
// The animated text is aria-hidden; a stable headline is announced instead, so a
// screen reader never re-reads the line character by character. Reduced motion gets
// the first slogan, printed once, with no caret.
const TYPE_MS = 55;
const ERASE_MS = 26;
const HOLD_MS = 2800;
const GAP_MS = 420;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

export function Slogan({ slogans, label }: { slogans: string[]; label: string }) {
  const reduced = prefersReducedMotion();
  const [{ i, n, erasing }, set] = useState({ i: 0, n: 0, erasing: false });

  useEffect(() => {
    if (reduced || slogans.length === 0) return;
    const text = slogans[i] ?? "";
    const [delay, next] = !erasing && n < text.length
      ? [TYPE_MS, { i, n: n + 1, erasing }]
      : !erasing
        ? [HOLD_MS, { i, n, erasing: true }]
        : n > 0
          ? [ERASE_MS, { i, n: n - 1, erasing }]
          : [GAP_MS, { i: (i + 1) % slogans.length, n: 0, erasing: false }];
    const id = setTimeout(() => set(next), delay);
    return () => clearTimeout(id);
  }, [i, n, erasing, reduced, slogans]);

  const current = slogans[i] ?? "";
  return (
    <span className="slogan">
      <span className="sr-only">{label}</span>
      {slogans.map((line) => (
        <span className="slogan-sizer" aria-hidden="true" key={line}>
          {line}
        </span>
      ))}
      <span className="slogan-line" aria-hidden="true">
        {/* zero-width space keeps the line box at full height before the first character */}
        {"​"}
        {reduced ? current : current.slice(0, n)}
        {!reduced && (
          <>
            <i className="slogan-caret" />
            <span className="slogan-rest">{current.slice(n)}</span>
          </>
        )}
      </span>
    </span>
  );
}
