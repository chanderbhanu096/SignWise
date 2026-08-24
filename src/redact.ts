// Data minimisation before the contract text leaves the browser (Art. 5 Abs. 1 lit. c
// DSGVO).
//
// A tenancy agreement carries the landlord's bank details, the flat's address and
// contact data. None of it is needed to explain what the contract says, but all of
// it used to be posted to the model verbatim. This replaces the structured
// identifiers with stable placeholders before the request and puts the originals
// back into the response in the browser, so the plain values never reach the model
// host at all — the pseudonymisation the EuGH described in C-413/23 P (EDSB/SRB),
// where data that the recipient cannot re-identify is not personal data for them.
//
// Names are deliberately NOT redacted: recognising them needs a model, and getting
// it wrong either leaves them in anyway or destroys a clause the analysis depends on.
// Documented rather than half-done. Image uploads (scanned contracts) are sent as
// pixels and cannot be filtered at all — src/screens/Upload.tsx says so.

export type Redaction = {
  text: string;
  /** Put the originals back. Pass `jsonEscape` when substituting into raw JSON. */
  restore: (s: string, escape?: (value: string) => string) => string;
};

/** Escapes a value for insertion inside a JSON string literal. */
export const jsonEscape = (value: string) => JSON.stringify(value).slice(1, -1);

const PATTERNS: Array<[string, RegExp]> = [
  // IBAN: 2 letters, 2 check digits, then up to 30 alphanumerics in optional groups.
  ["IBAN", /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,4})?\b/g],
  ["BIC", /\b[A-Z]{4}(?:DE|AT|CH|GB|FR|IT|ES|NL|BE|LU|PL)[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/g],
  ["E-MAIL", /\b[\w.+-]+@[\w-]+\.[\w.-]{2,}\b/g],
  // German tax identification number, 11 digits, often spaced or slashed.
  ["STEUER-ID", /\b(?:Steuer-?(?:ID|identifikationsnummer)|St-?Nr\.?|Steuernummer)[:\s]*([\d\s/]{9,16})/gi],
  // Phone: an explicit label, or a +49/0 number with a separator. Kept narrow so a
  // section number or a sum of money is never mistaken for one.
  ["TELEFON", /(?:Tel\.?|Telefon|Mobil|Fax)[:\s]*\+?[\d\s()/-]{7,20}|\+49[\d\s()/-]{6,18}/gi],
  // Street plus house number, with the postal code and town when they follow. Two
  // shapes, because German street names come glued ("Schwanthalerstraße 91") or
  // separated ("Ismaninger Straße 61"), and one case-insensitive pattern for both
  // makes the capitalisation anchor meaningless and matches neither reliably.
  ["ADRESSE", /\b[A-ZÄÖÜ][a-zäöüß-]{2,}(?:stra(?:ß|ss)e|weg|platz|allee|gasse|ring|damm|ufer)\s+\d{1,4}[a-z]?\b(?:\s*,?\s*\d{5}\s+[A-ZÄÖÜ][a-zäöüß-]+)?/g],
  ["ADRESSE", /\b[A-ZÄÖÜ][a-zäöüß-]{2,}(?:[ -][A-ZÄÖÜ][a-zäöüß-]+)?\s+(?:Stra(?:ß|ss)e|Str\.|Weg|Platz|Allee|Gasse|Ring|Damm|Ufer)\s+\d{1,4}[a-z]?\b(?:\s*,?\s*\d{5}\s+[A-ZÄÖÜ][a-zäöüß-]+)?/g],
];

/** Replace direct identifiers with placeholders, and give back the inverse. */
export function redact(text: string): Redaction {
  const map = new Map<string, string>(); // placeholder -> original
  const counts = new Map<string, number>();
  let out = text;

  for (const [kind, re] of PATTERNS) {
    out = out.replace(re, (match: string, ...rest: unknown[]) => {
      // For patterns with a capture group the label ("Steuernummer:") stays put and
      // only the value is replaced, so the sentence still reads. Without a group the
      // next argument is the match offset, hence the typeof guard.
      const captured = typeof rest[0] === "string" ? rest[0] : undefined;
      const value = captured ?? match;
      if (!value || !value.trim()) return match;
      let token = [...map].find(([, v]) => v === value)?.[0];
      if (!token) {
        const n = (counts.get(kind) ?? 0) + 1;
        counts.set(kind, n);
        token = `[${kind}-${n}]`;
        map.set(token, value);
      }
      return captured ? match.replace(captured, token) : token;
    });
  }

  const restore = (s: string, escape: (value: string) => string = (v) => v) => {
    let r = s;
    for (const [token, value] of map) r = r.split(token).join(escape(value));
    return r;
  };
  return { text: out, restore };
}

/** What was replaced, for the privacy note the upload screen shows. */
export function redactionCount(text: string): number {
  const { text: out } = redact(text);
  return (out.match(/\[(?:IBAN|BIC|E-MAIL|STEUER-ID|TELEFON|ADRESSE)-\d+\]/g) ?? []).length;
}
