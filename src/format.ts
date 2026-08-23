import type { Lang } from "./types";

const locale = (lang: Lang) =>
  ({ de: "de-DE", en: "en-GB", tr: "tr-TR", uk: "uk-UA", ar: "ar" })[lang] ?? "de-DE";

// €1,240 in EN, 1.240 € in DE — the mockup hardcoded one form; Intl does both.
export function euro(amount: number, lang: Lang, currency = "EUR"): string {
  return new Intl.NumberFormat(locale(lang), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

// The model writes amounts into its prose the way the contract does — "1.480,00 EUR",
// "bis 150,00 EUR je Reparatur". The app writes them with Intl — "1.480 €". Both are
// correct German; side by side in one card they read as two different figures, and on
// the decision screen the deposit appeared once as "3.540,00 EUR" and once as "3.540 €".
//
// One notation wins, and it is the app's, because that is the one on the headline
// numbers. This rewrites the currency word in model-authored *display* text only —
// never in a quote, which must stay exactly as the contract wrote it.
const CURRENCY_WORD: Record<string, string> = { EUR: "\u20ac", CHF: "CHF", GBP: "\u00a3", USD: "$" };

// Keys whose value is not prose and must survive untouched: a quote is verbatim
// contract text, a ref is matched back to the document, and the rest are machine
// values. Everything else the model writes is prose a reader sees.
const VERBATIM = new Set(["quote", "ref", "id", "clauseId", "monthlyClauseId", "yearlyClauseId", "currency", "lang", "docLanguage", "law", "section", "iso", "level", "tone", "kind", "freq", "tags", "warnings"]);

// Where the symbol goes is a property of the locale, not of us: de-DE writes
// "1.480 \u20ac", en-GB writes "\u20ac1,480". Ask Intl rather than hardcoding, so a
// rewritten amount sits the same way round as one the app formatted itself.
function symbolLeads(lang: Lang, currency: string): boolean {
  try {
    // "1,00 \u20ac" (de) starts with a digit; "\u20ac1.00" (en) does not.
    return !/^\d/.test(new Intl.NumberFormat(locale(lang), { style: "currency", currency }).format(1).trimStart());
  } catch {
    return false;
  }
}

export function currencyStyle(text: string, currency = "EUR", lang: Lang = "de"): string {
  const symbol = CURRENCY_WORD[currency.toUpperCase()];
  if (!symbol || symbol === currency) return text;
  const c = currency.replace(/[^A-Z]/gi, "");
  const lead = symbolLeads(lang, currency);
  // The lookbehind stops a match starting in the middle of a number: without it
  // "12.50 EUR" matched from the "2" and came out as "1\u20ac2.50".
  const AMOUNT = `(?<![\\d.,])(\\d{1,3}(?:[.,\\s]\\d{3})*(?:[.,]\\d{1,2})?)`;
  return text
    // Zero cents go, because the app's own formatter drops them. Real cents stay.
    .replace(new RegExp(`${AMOUNT.replace("(?:[.,]\\d{1,2})?", "")}[.,]00(?=\\s*${c}\\b)`, "g"), "$1")
    .replace(new RegExp(`${AMOUNT}\\s*${c}\\b`, "gi"), lead ? `${symbol}$1` : `$1\u00a0${symbol}`);
}

// Walk an analysis and put every amount the model wrote in prose into the same
// notation the app uses for the amounts it formats itself.
export function styleCurrencyDeep<T>(value: T, currency: string, lang: Lang = "de"): T {
  if (typeof value === "string") return currencyStyle(value, currency, lang) as T;
  if (Array.isArray(value)) return value.map((v) => styleCurrencyDeep(v, currency, lang)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, VERBATIM.has(k) ? v : styleCurrencyDeep(v, currency, lang)]),
    ) as T;
  }
  return value;
}
