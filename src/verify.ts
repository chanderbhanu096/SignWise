// Pure quote-verification, kept separate from pdf.ts so it has no browser/Vite
// dependency and can run under `node --test`.
const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

// A quote is verified if its normalised text appears in the document. Legal quotes
// are copied verbatim, so a whitespace-tolerant substring match is enough; we fall
// back to the first sentence so a slightly over-long quote still verifies.
export function verifyQuote(docText: string, quote: string): boolean {
  const hay = norm(docText);
  const q = norm(quote);
  if (q.length < 8) return false;
  if (hay.includes(q)) return true;
  const firstSentence = q.split(".")[0];
  return firstSentence.length >= 12 && hay.includes(firstSentence);
}
