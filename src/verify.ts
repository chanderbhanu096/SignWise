// Pure quote-verification, kept separate from pdf.ts so it has no browser/Vite
// dependency and can run under `node --test`.
const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

// Every word of a quote must occur together in the document. Matching only its
// first sentence would approve invented amounts or obligations appended after it.
export function verifyQuote(docText: string, quote: string): boolean {
  const hay = norm(docText);
  const q = norm(quote);
  return q.length >= 8 && hay.includes(q);
}
