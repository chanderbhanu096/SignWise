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

export function currencyStyle(text: string, currency = "EUR"): string {
  const symbol = CURRENCY_WORD[currency.toUpperCase()];
  if (!symbol || symbol === currency) return text;
  const c = currency.replace(/[^A-Z]/gi, "");
  // "1.480,00 EUR" -> "1.480 \u20ac", "1,180.00 EUR" -> "1,180 \u20ac". Zero cents only:
  // a real 12,50 EUR keeps them.
  return text
    .replace(new RegExp(`(\\d(?:[.,\\s]?\\d{3})*)[.,]00(?=\\s*${c}\\b)`, "gi"), "$1")
    .replace(new RegExp(`(\\d)\\s*${c}\\b`, "gi"), `$1\u00a0${symbol}`);
}

// Walk an analysis and put every amount the model wrote in prose into the same
// notation the app uses for the amounts it formats itself.
export function styleCurrencyDeep<T>(value: T, currency: string): T {
  if (typeof value === "string") return currencyStyle(value, currency) as T;
  if (Array.isArray(value)) return value.map((v) => styleCurrencyDeep(v, currency)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, VERBATIM.has(k) ? v : styleCurrencyDeep(v, currency)]),
    ) as T;
  }
  return value;
}
