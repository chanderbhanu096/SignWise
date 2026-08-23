import { DEPTHS, type Depth, type Lang } from "../types";
import { t } from "../i18n";

// The explanation-level switch, rendered next to the text it rewrites. It used to
// sit in the overview header, where nothing on the screen responds to it — pressing
// it there looked like a broken control, because the only text it changes lives in
// the clause panel and the original view.
export function DepthPicker({ depth, setDepth, lang }: { depth: Depth; setDepth: (d: Depth) => void; lang: Lang }) {
  const s = t(lang);
  return (
    <div className="seg seg-sm" role="group" aria-label={s.explanationLevel}>
      {DEPTHS.map((d) => (
        <button key={d} className={depth === d ? "on" : ""} aria-pressed={depth === d} onClick={() => setDepth(d)}>
          {s.depth[d]}
        </button>
      ))}
    </div>
  );
}
