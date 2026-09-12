// Pure quote-verification, kept separate from pdf.ts so it has no browser/Vite
// dependency and can run under `node --test`.
const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

// An ellipsis the model wrote to stand for the words it left out — "…" or "...".
// Not a full stop: a run of three or more dots, or the single character.
const ELISION = /\s*(?:…|\.{3,})\s*/;

// Every word of a quote must occur in the document. Matching only its first
// sentence would approve invented amounts or obligations appended after it.
//
// A quote the model abbreviated is still a real passage. Asked for a long clause in
// English it answers "Die regelmäßige Arbeitszeit beträgt…20 Stunden pro Woche", and
// a plain substring test then marks the passage as not found — on a live run that
// happened to three clauses of twelve, one of them the clause carrying the contract's
// worst term. The reader was told the app could not find words that are on the page.
//
// So an elided quote is checked in the parts the model kept: each one must appear,
// and each one after the one before it, which is a stronger claim than any single
// part matching somewhere. Each part must also be long enough to mean something —
// otherwise "…" around a stray number would verify against any page holding that
// number, and the ellipsis would become a way to assert anything.
const MIN_PART = 12;

export function verifyQuote(docText: string, quote: string): boolean {
  const hay = norm(docText);
  const q = norm(quote);
  if (q.length < 8) return false;
  if (hay.includes(q)) return true;
  if (!ELISION.test(q)) return false;

  const parts = q.split(ELISION).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2 || parts.some((p) => p.length < MIN_PART)) return false;
  let from = 0;
  for (const part of parts) {
    const at = hay.indexOf(part, from);
    if (at < 0) return false;
    from = at + part.length;
  }
  return true;
}
