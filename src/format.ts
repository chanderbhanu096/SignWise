import type { Lang } from "./types";
import { canonical } from "./depth";

const locale = (lang: Lang) =>
  ({ de: "de-DE", en: "en-GB", tr: "tr-TR", uk: "uk-UA", ar: "ar" })[lang] ?? "de-DE";

// €1,240 in EN, 1.240 € in DE — the mockup hardcoded one form; Intl does both.
export function euro(amount: number, lang: Lang, currency = "EUR"): string {
  try {
    return new Intl.NumberFormat(locale(lang), {
      style: "currency",
      currency,
      // Omit empty cents without rounding away a real contractual amount. Keep the
      // currency's own precision (including three-decimal currencies such as KWD).
      minimumFractionDigits: Number.isInteger(amount) ? 0 : undefined,
    }).format(amount);
  } catch {
    // The model sometimes returns a symbol or name instead of an ISO code. Show
    // that supplied label without inventing a currency or crashing the result.
    const value = new Intl.NumberFormat(locale(lang), { maximumFractionDigits: 20 }).format(amount);
    return currency.trim() ? `${value}\u00a0${currency.trim()}` : value;
  }
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


export function currencyStyle(text: string, currency = "EUR", lang: Lang = "de"): string {
  const symbol = CURRENCY_WORD[currency.toUpperCase()];
  if (!symbol || symbol === currency) return text;
  const c = currency.replace(/[^A-Z]/gi, "");
  // Parse the amount and re-emit it through the app's own formatter, rather than
  // swapping the currency word and leaving the digits as the model typed them.
  // Swapping alone left a hole exactly where it shows most: the pattern needed a
  // thousands separator, so "1.240,00 EUR" became "1.240 €" and "1240 EUR" stayed
  // "1240 EUR" — on the same screen, for the same rent.
  //
  // The lookarounds stop a match starting or ending inside a longer number: without
  // the first one "12.50 EUR" matched from the "2" and came out as "1€2.50".
  const AMOUNT = String.raw`\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d{1,2})?|\d{1,9}(?:[.,]\d{1,2})?`;
  const written = new RegExp(String.raw`(?<![\d.,])(${AMOUNT})\s*${c}\b|\b${c}\s*(${AMOUNT})(?![\d.,])`, "gi");
  return text.replace(written, (match, before, after) => {
    const value = canonical(before ?? after);
    return value == null ? match : euro(Number(value), lang, currency);
  });
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
