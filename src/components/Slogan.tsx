import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

// Typewriter that cycles the localized slogans, one at a time, as the upload
// screen's headline.
//
// The line must not move while it types. Every slogan is rendered hidden in the same
// grid cell, so the box is always as wide and as tall as the largest one, and the
// current slogan is always rendered in full — the untyped characters are hidden, not
// absent, so nothing re-wraps between keystrokes.
//
// Each character is its own inline box. That is what keeps the line still: the
// browser snaps every inline box boundary to the pixel grid, so a line split into
// [typed text][remainder] changes width by up to 1.6px depending on where the split
// falls, and a centred line shifts by half of that on every keystroke. With one box
// per character the boundaries never move and the width is constant.
//
// The animated text is aria-hidden; a stable headline is announced instead, so a
// screen reader never re-reads the line character by character. Reduced motion gets
// the first slogan, printed once, with no caret.
const TYPE_MS = 60;
// 26ms was under one frame, so erasing moved the line ~9px per painted frame no
// matter how it was smoothed — the fastest thing on the page once typing glided.
// At 34ms it is still visibly quicker than typing but stays inside the glide.
const ERASE_MS = 34;
const HOLD_MS = 2800;
const GAP_MS = 420;
// Longer than one keystroke on purpose: each glide is still running when the next
// character lands, so the line drifts at a near-constant speed instead of settling
// and starting again. Linear for the same reason — an ease would decelerate into a
// stop that the next keystroke interrupts, which is the stutter being removed.
const GLIDE_MS = 150;
// Above this, the width change is not a keystroke — a resize, a font swap, a language
// switch. Gliding those would drag the headline across the page, so they just snap.
const GLIDE_MAX_PX = 120;

function translateX(el: HTMLElement): number {
  const t = getComputedStyle(el).transform;
  if (!t || t === "none") return 0;
  try {
    return new DOMMatrixReadOnly(t).m41;
  } catch {
    return 0;
  }
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

// `upto` characters are visible; the rest hold their space invisibly. The caret is
// out of flow (see the stylesheet), so it can sit at the split without moving anything.
//
// `newest` is the index of the character that appeared on this tick, which gets the
// fade-in class. It is -1 while erasing: there the last visible index walks backwards
// through characters that were already on screen, and re-fading them read as flicker.
function chars(line: string, upto?: number, caret?: "solid" | "blink", newest = -1) {
  const out = [];
  const letters = Array.from(line);
  const cut = upto ?? letters.length;
  const bar = () => <i className={caret === "solid" ? "slogan-caret solid" : "slogan-caret"} key="caret" />;
  for (let i = 0; i < letters.length; i++) {
    if (caret && i === cut) out.push(bar());
    out.push(
      <span className={i >= cut ? "slogan-ch off" : i === newest ? "slogan-ch new" : "slogan-ch"} key={i}>
        {letters[i]}
      </span>,
    );
  }
  if (caret && cut >= letters.length) out.push(bar());
  return out;
}

export function Slogan({ slogans, label }: { slogans: string[]; label: string }) {
  const reduced = prefersReducedMotion();
  const [{ i, n, erasing }, set] = useState({ i: 0, n: 0, erasing: false });
  const lineRef = useRef<HTMLSpanElement>(null);
  const lastWidth = useRef(0);

  // The headline is centred and shrink-wraps, so revealing a character does not just
  // add it on the right — it moves the whole line left by half that character's width.
  // Measured on the deployed build that was a median 10.8px and up to 15.7px, jumped
  // 18 times a second. The characters were never the bumpy part; the word they sit in
  // was hopping under them.
  //
  // So the line is held where it was and released: after the DOM has the new character
  // but before the frame is painted, translate the line back by the half-width it just
  // lost (plus whatever is left of the previous glide), then let a transition carry it
  // to zero. The layout jump becomes continuous motion. Width is read off the box
  // rather than the character because the same arithmetic then covers erasing and the
  // switch to the next slogan.
  useLayoutEffect(() => {
    const el = lineRef.current;
    if (!el || reduced) return;
    const width = el.getBoundingClientRect().width; // translateX does not affect width
    const grew = width - lastWidth.current;
    lastWidth.current = width;
    if (!grew) return;
    const hold = translateX(el) + grew / 2;
    el.style.transition = "none";
    if (Math.abs(hold) > GLIDE_MAX_PX) {
      el.style.transform = "";
      return;
    }
    el.style.transform = `translateX(${hold}px)`;
    void el.offsetWidth; // flush, so the next assignment animates from here
    el.style.transition = `transform ${GLIDE_MS}ms linear`;
    el.style.transform = "translateX(0px)";
  });

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
  // The caret only blinks when the line is at rest — fully typed and holding, or empty
  // and waiting for the next slogan. Through the keystrokes it stays lit.
  const atRest = erasing ? n === 0 : n >= current.length;
  // The sizers never change; without this they were reconciled on every keystroke
  // alongside the line itself (131 spans instead of 45 at the default three slogans).
  const sizers = useMemo(
    () =>
      slogans.map((line) => (
        <span className="slogan-sizer" aria-hidden="true" key={line}>
          {chars(line)}
        </span>
      )),
    [slogans],
  );
  return (
    <span className="slogan">
      <span className="sr-only">{label}</span>
      {sizers}
      <span
        className="slogan-line"
        aria-hidden="true"
        ref={lineRef}
        // Dropping the inline transform once the glide lands leaves the resting
        // headline as plain text again, rather than parked on a compositing layer
        // where Chrome turns subpixel antialiasing off and the type looks thinner.
        onTransitionEnd={(e) => {
          const el = e.currentTarget;
          el.style.transition = "";
          el.style.transform = "";
        }}
      >
        {/* zero-width space keeps the line box at full height before the first character */}
        {"​"}
        {reduced ? chars(current) : chars(current, n, atRest ? "blink" : "solid", erasing ? -1 : n - 1)}
      </span>
    </span>
  );
}
