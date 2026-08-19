import { useRef, useState } from "react";
import type { Lang } from "../types";
import { t } from "../i18n";

const OK = /pdf|wordprocessingml|png|jpe?g|webp/;
const MAX = 4 * 1024 * 1024;

export function Upload({
  lang,
  onUpload,
  onExample,
  error,
}: {
  lang: Lang;
  onUpload: (file: File) => void;
  onExample: () => void;
  error: string | null;
}) {
  const s = t(lang);
  const [over, setOver] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const take = (file: File | undefined) => {
    setLocalErr(null);
    if (!file) return;
    if (!OK.test(file.type)) return setLocalErr(lang === "de" ? "Bitte PDF, DOCX oder Bild." : "Please use PDF, DOCX or an image.");
    if (file.size > MAX) return setLocalErr(lang === "de" ? "Datei zu groß (max. 4 MB)." : "File too large (max 4 MB).");
    onUpload(file);
  };

  const shownErr = error ?? localErr;

  return (
    <section className="screen shell narrow" aria-labelledby="hero-h">
      <h1 className="hero" id="hero-h">
        {s.hero}
      </h1>
      <p className="hero-sub">{s.heroSub}</p>

      {shownErr && (
        <div className="banner banner-error" style={{ padding: "16px 0 0", margin: 0 }}>
          <div className="banner-in" role="alert">
            <span aria-hidden="true">⚠</span>
            <span>
              <strong>{s.errorTitle}.</strong> {shownErr}
            </span>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 24, padding: 10 }}>
        <div
          className={"drop" + (over ? " over" : "")}
          role="button"
          tabIndex={0}
          aria-label={s.uploadBtn}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            take(e.dataTransfer.files[0]);
          }}
        >
          <div className="drop-icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#1552cf" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 3v5h5" />
              <path d="M6 3h8l5 5v13H6z" />
              <path d="M9 13h6" />
              <path d="M9 17h4" />
            </svg>
          </div>
          <div>
            <div className="drop-title">{s.dragText}</div>
            <div className="drop-types">{s.fileTypes}</div>
          </div>
          <span className="drop-cta">{s.uploadBtn}</span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,image/*"
          hidden
          onChange={(e) => take(e.target.files?.[0])}
        />
        <div className="privacy">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a6d4a" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" style={{ flex: "none", marginTop: 2 }}>
            <path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <p>{s.privacy}</p>
        </div>
      </div>

      <div style={{ marginTop: 22, display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
        <button className="btn btn-primary" onClick={onExample}>
          {s.exampleBtn}
        </button>
        <span style={{ fontSize: 14, color: "var(--muted-2)" }}>{s.exampleNote}</span>
      </div>

      <p className="disclaimer">{s.disclaimer}</p>
    </section>
  );
}
