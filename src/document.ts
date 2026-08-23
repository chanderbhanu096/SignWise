// Turning the extracted contract text into the "original contract" pane.
//
// The pane used to render the model's quotes and nothing else, which meant the
// screen called "Original contract" was a list of excerpts: where the model quoted
// two sections at once (§§ 12-13) the text between them was simply absent, and any
// section it did not quote never appeared at all. This module keeps the document
// whole — every word of the extracted text is rendered — and marks up the parts a
// finding came from.
//
// What it deliberately leaves out is everything that is not a contract term: the
// party block at the top (names, addresses, dates of birth) and the signature block
// at the bottom. Those carry the most sensitive personal data in the file and say
// nothing about what the reader is agreeing to, so the pane has no reason to put
// them on screen. Every numbered section is kept whole.

export type DocBlock = { text: string; clauseId: string | null };

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

// A section heading — "§ 12 Betreten der Mieträume" — starts a new block. Two
// guards keep citations from being mistaken for one: the heading must follow the
// end of the previous sentence (a citation sits mid-sentence, as in "im Sinne des
// § 2 Betriebskostenverordnung"), and the capital after the number must be followed
// by a lower-case letter ("§ 558 BGB", "§§ 573, 573c BGB" are not headings).
const HEADING = /(?<=(?:^|[.:!?)\n])\s*)(?=§\s?\d+[a-z]?\s+[A-ZÄÖÜ][a-zäöüß])/g;
const IS_HEADING = /^§\s?\d+[a-z]?\s+[A-ZÄÖÜ][a-zäöüß]/;

// The signature block: a run of underscores to sign on, usually preceded by "Ort,
// den <date>", and nothing of substance after it. Cutting from the place-and-date
// (when it sits right before the rule) removes the whole footer in one go.
const SIGNATURE = /(?:[A-ZÄÖÜ][^.\n]{0,40},\s*den\s+\d{1,2}\.\d{1,2}\.\d{2,4}\s*)?_{3,}[\s\S]*$/;

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

  const blocks = docText
    .replace(SIGNATURE, "")
    .split(HEADING)
    .map((raw) => raw.replace(PARAGRAPH, "\n$1 ").trim())
    .filter((text) => text.length > 0);

  // Everything before the first section heading is the party block. Dropped only
  // when there is a heading to drop it in favour of — a document we could not find
  // any sections in is shown as it came, rather than emptied.
  const firstSection = blocks.findIndex((text) => IS_HEADING.test(text));
  const sections = firstSection > 0 ? blocks.slice(firstSection) : blocks;

  return sections.map((text) => {
    const n = norm(text);
    const hit = quotes.find((c) => n.includes(c.q)) ?? quotes.find((c) => sharesRun(n, c.q));
    return { text, clauseId: hit?.id ?? null };
  });
}

// A finding's "ref" is a label the model writes; its "quote" is verified against the
// document. When the two disagree the label is the one that is wrong — and it
// disagreed in a specific, repeatable way: a quote taken entirely from one section
// was labelled with a range ("§§ 12-13", "§§ 15-16", "§§ 18-19"). The reader then
// sees a finding that claims two sections while only the first is highlighted, and
// the second sits there in grey looking broken.
//
// So the range is narrowed to what the quote can actually support. A quote that
// genuinely runs into the next section carries that section's heading with it —
// that is how the extracted text reads — so requiring the marker to be present is a
// check rather than a guess.
const REF_RANGE = /§§\s*(\d+)([a-z]?)\s*[-–—]\s*(\d+)([a-z]?)/;

export function narrowRef(ref: string, quote: string): string {
  const m = ref.match(REF_RANGE);
  if (!m) return ref;
  const from = Number(m[1]);
  const to = Number(m[3]);
  if (!(to > from)) return ref;
  for (let n = from + 1; n <= to; n++) {
    if (new RegExp(`§\\s?${n}\\b`).test(quote)) return ref; // the quote really does reach that far
  }
  return ref.replace(REF_RANGE, `§ ${m[1]}${m[2]}`);
}
