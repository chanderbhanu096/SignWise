// Turning the extracted contract text into the "original contract" pane.
//
// The pane used to render the model's quotes and nothing else, which meant the
// screen called "Original contract" was a list of excerpts: where the model quoted
// two sections at once (§§ 12-13) the text between them was simply absent, and any
// section it did not quote never appeared at all. This module keeps the document
// whole — every word of the extracted text is rendered — and marks up the parts a
// finding came from.

export type DocBlock = { text: string; clauseId: string | null };

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

// A section heading — "§ 12 Betreten der Mieträume" — starts a new block. Two
// guards keep citations from being mistaken for one: the heading must follow the
// end of the previous sentence (a citation sits mid-sentence, as in "im Sinne des
// § 2 Betriebskostenverordnung"), and the capital after the number must be followed
// by a lower-case letter ("§ 558 BGB", "§§ 573, 573c BGB" are not headings).
const HEADING = /(?<=(?:^|[.:!?)])\s*)(?=§\s?\d+[a-z]?\s+[A-ZÄÖÜ][a-zäöüß])/g;

// Numbered paragraphs run together on one line once a PDF is flattened to text.
const PARAGRAPH = / (\(\d{1,2}\)) /g;

// How a block is recognised inside a quote. Exact containment is tried first, but
// a quote and a section rarely line up at both ends: the model quotes from after
// the section heading, and a quote covering several sections runs on past the end
// of the first one. A run of consecutive words shared with the quote survives both,
// and eight words of legal German is long enough not to collide by chance.
const WINDOW = 8;
function sharesRun(blockNorm: string, quote: string): boolean {
  const words = blockNorm.split(" ");
  for (let i = 0; i + WINDOW <= words.length; i++) {
    if (quote.includes(words.slice(i, i + WINDOW).join(" "))) return true;
  }
  return false;
}

/**
 * Split the document into readable blocks and attach the clause each one belongs to.
 * A block belongs to a clause when it contains the clause's quote, or when it shares
 * a run of words with it — the second case is how a quote covering several sections
 * still marks every section it covers.
 */
export function splitDocument(
  docText: string,
  clauses: { id: string; quote: string }[],
): DocBlock[] {
  const quotes = clauses.map((c) => ({ id: c.id, q: norm(c.quote) })).filter((c) => c.q.length >= 8);

  return docText
    .split(HEADING)
    .map((raw) => raw.replace(PARAGRAPH, "\n$1 ").trim())
    .filter((text) => text.length > 0)
    .map((text) => {
      const n = norm(text);
      const hit = quotes.find((c) => n.includes(c.q)) ?? quotes.find((c) => sharesRun(n, c.q));
      return { text, clauseId: hit?.id ?? null };
    });
}
