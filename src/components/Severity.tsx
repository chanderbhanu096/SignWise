import type { Level } from "../types";
import { t } from "../i18n";

const MARK: Record<Level, string> = { important: "!", check: "?", standard: "✓" };

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
