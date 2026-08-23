import type { Level } from "../types";
import { t } from "../i18n";

// One mark vocabulary across every screen: ! = important, △ = worth checking,
// ✓ = clear / standard. "?" is reserved for a question to put to the other party,
// which only the decision brief has — it used to double as "worth checking" here,
// so the same glyph meant two different things on two screens.
export const MARK: Record<Level, string> = { important: "!", check: "△", standard: "✓" };

// Icon + text, never colour alone (WCAG). Colours come from CSS via data-level.
export function Severity({ level, lang }: { level: Level; lang: string }) {
  return (
    <span className="sev" data-level={level}>
      <span className="sev-mark" aria-hidden="true">
        {MARK[level]}
      </span>
      {t(lang).levelName[level]}
    </span>
  );
}
