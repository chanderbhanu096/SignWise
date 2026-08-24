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
const TYPE_MS = 78;
// Erasing walks the caret a whole advance width per step whatever the glide does, so
// its smoothness is just its step length: 26ms was under one painted frame and moved
// the caret ~15px between them. Two thirds of a keystroke still reads as a quicker
// rewind than the typing, without being the one jolt left on the page.
const ERASE_MS = 52;
const HOLD_MS = 2600;
const GAP_MS = 420;
// Both glides are expressed as a multiple of the step that triggered them, so
// everything moves at a constant speed however fast the typing is set.
//
// The line is given more than one step: it never has to arrive on time, and the extra
// slack absorbs a keystroke whose timer fires late instead of turning it into a stop.
// The caret is given exactly one, because its glide is what it costs to be late — it
// trails the end of the text by however far it has left to travel, and more than one
// step of that would leave it sitting inside the last letter rather than after it.
const LINE_GLIDE = 1.4;
const CARET_GLIDE = 1;
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

// Hold `el` `back` pixels from where layout just put it, then let it travel there over
// `ms`. Any glide still in flight is folded into the hold, so interrupting one mid-way
// changes its speed rather than restarting it from a standstill.
function glide(el: HTMLElement | null, back: number, ms: number) {
  if (!el) return;
  const hold = translateX(el) + back;
  el.style.transition = "none";
  if (Math.abs(hold) > GLIDE_MAX_PX) {
    el.style.transform = "";
    return;
  }
  el.style.transform = `translateX(${hold}px)`;
  void el.offsetWidth; // flush, so the next assignment animates from here
  el.style.transition = `transform ${Math.round(ms)}ms linear`;
  el.style.transform = "translateX(0px)";
}

// Dropping the inline transform once a glide lands leaves the element as plain text
// again, rather than parked on a compositing layer where Chrome turns subpixel
// antialiasing off and the type looks thinner than it does at rest.
//
// transitionend bubbles, and the caret glides inside the line — so without the target
// check the caret finishing its travel cleared the *line's* transform half way through
// the line's own glide, snapping it sideways by whatever was left. That is the one
// thing this whole file exists to prevent.
function clearGlide(e: { target: EventTarget | null; currentTarget: HTMLElement }) {
  if (e.target !== e.currentTarget) return;
  e.currentTarget.style.transition = "";
  e.currentTarget.style.transform = "";
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

// `upto` characters are visible; the rest hold their space invisibly. The caret is
// out of flow (see the stylesheet), so it can sit at the split without moving anything.
//
// It is always the last child rather than spliced in at the split: untyped characters
// are `display: none` and generate no box, so appending it puts it in exactly the same
// place — and it is then the one element React never has to move, which would otherwise
// cancel the glide running on it on every single keystroke.
//
// `newest` is the index of the character that appeared on this tick, which gets the
// fade-in class. It is -1 while erasing: there the last visible index walks backwards
// through characters that were already on screen, and re-fading them read as flicker.
function chars(line: string, upto?: number, caret?: "solid" | "blink", newest = -1) {
  const letters = Array.from(line);
  const cut = upto ?? letters.length;
  const out = letters.map((ch, i) => (
    <span className={i >= cut ? "slogan-ch off" : i === newest ? "slogan-ch new" : "slogan-ch"} key={i}>
      {ch}
    </span>
  ));
  if (caret) {
    out.push(
      <i
        className={caret === "solid" ? "slogan-caret solid" : "slogan-caret"}
        key="caret"
        onTransitionEnd={clearGlide}
      />,
    );
  }
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
  // but before the frame is painted, translate it back by the half-width it just lost,
  // then let a transition carry it to zero. The layout jump becomes continuous motion.
  // Width is read off the box rather than the character because the same arithmetic
  // then covers erasing and the switch to the next slogan.
  //
  // The caret needs the opposite correction, and needs it for the same reason. Holding
  // the line's left edge still means its right edge has to absorb the whole character,
  // so the caret was teleporting a full advance width — measured on the deployed build
  // at 21 to 31px — and then being dragged backwards ~3px a frame by the line's own
  // glide until the next keystroke threw it forward again. Its net travel was right;
  // its distribution was a lurch. Held back by the full width and released over one
  // step, it crosses that distance at a constant speed instead, arriving at the end of
  // the text just as the next character lands.
  useLayoutEffect(() => {
    const el = lineRef.current;
    if (!el || reduced) return;
    const width = el.getBoundingClientRect().width; // translateX does not affect width
    const grew = width - lastWidth.current;
    lastWidth.current = width;
    if (!grew) return;
    const step = erasing ? ERASE_MS : TYPE_MS;
    glide(el, grew / 2, step * LINE_GLIDE);
    glide(el.querySelector<HTMLElement>(".slogan-caret"), -grew, step * CARET_GLIDE);
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
        onTransitionEnd={clearGlide}
      >
        {/* zero-width space keeps the line box at full height before the first character */}
        {"​"}
        {reduced ? chars(current) : chars(current, n, atRest ? "blink" : "solid", erasing ? -1 : n - 1)}
      </span>
    </span>
  );
}
