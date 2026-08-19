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
