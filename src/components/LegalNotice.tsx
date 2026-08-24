import { useEffect, useRef } from "react";
import type { Lang } from "../types";
import { t } from "../i18n";

// The three legal questions a jury — or a regulator — asks a tool like this, on one
// screen: what it is not allowed to do (RDG), what happens to the uploaded document
// (Art. 13 DSGVO), and that the explanation is machine-generated (Art. 50 KI-VO).
// Kept as a dialog rather than a separate route so it stays reachable from every
// screen without the reader losing the contract they are in the middle of reading.
export function LegalNotice({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const s = t(lang);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <aside className="panel legal-panel" role="dialog" aria-modal="true" aria-labelledby="legal-h">
        <div className="panel-head">
          <h2 className="panel-title" id="legal-h">
            {s.legalNoticeTitle}
          </h2>
          <button className="panel-close" ref={closeRef} onClick={onClose} aria-label={s.close}>
            ✕
          </button>
        </div>
        <div className="panel-body">
          {s.legalNoticeSections.map((section) => (
            <section key={section.heading}>
              <h3 className="legal-h3">{section.heading}</h3>
              <ul className="legal-list">
                {section.items.map((item) => (
                  <li key={item.term}>
                    <strong>{item.term}</strong> {item.text}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className="legal-note">{s.legalNoticeFoot}</p>
        </div>
      </aside>
    </>
  );
}
