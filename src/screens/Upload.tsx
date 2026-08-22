import { useRef, useState } from "react";
import type { Lang } from "../types";
import { t } from "../i18n";
import { validateContractFile, type UploadValidationError } from "../upload";

export function Upload({
  lang,
  onUpload,
  onExample,
  onEmploymentExample,
  error,
}: {
  lang: Lang;
  onUpload: (file: File) => void;
  onExample: () => void;
  onEmploymentExample: () => void;
  error: string | null;
}) {
  const s = t(lang);
  const [over, setOver] = useState(false);
  const [localErr, setLocalErr] = useState<UploadValidationError | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const take = (file: File | undefined) => {
    if (!file) return;
    const issue = validateContractFile(file);
    setLocalErr(issue);
    if (!issue) onUpload(file);
  };

  const localErrorCopy =
    localErr === "unsupported_type"
      ? lang === "de"
        ? "Bitte verwenden Sie eine PDF-, JPG-, PNG- oder WebP-Datei."
        : "Please use a PDF, JPG, PNG or WebP file."
      : localErr === "too_large"
        ? lang === "de"
          ? "Die Datei ist zu groß (max. 4 MB)."
          : "The file is too large (max 4 MB)."
        : null;
  const shownErr = localErrorCopy ?? error;

  return (
    <section className="screen shell upload-screen" aria-labelledby="hero-h">
      <div className="upload-main-grid">
        <div className="upload-intro">
          <span className="upload-eyebrow">{s.uploadEyebrow}</span>
          <h1 className="upload-hero" id="hero-h">
            {s.hero}
          </h1>
          <p className="upload-hero-sub">{s.heroSub}</p>
        </div>

        <div className="upload-card" aria-labelledby="upload-h">
          <div className="upload-card-head">
            <div>
              <h2 id="upload-h">{s.uploadHeading}</h2>
              <p>{s.uploadSub}</p>
            </div>
            <span className="upload-time">
              <span aria-hidden="true">◷</span> {s.uploadTime}
            </span>
          </div>

          {shownErr && (
            <div className="upload-error" role="alert" tabIndex={-1}>
              <span aria-hidden="true">!</span>
              <p>
                <strong>{s.errorTitle}.</strong> {shownErr}
              </p>
            </div>
          )}

          <button
            className={`drop${over ? " over" : ""}`}
            type="button"
            aria-label={s.uploadBtn}
            aria-describedby="upload-types upload-handling"
            onClick={() => inputRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault();
              setOver(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setOver(true);
            }}
            onDragLeave={(event) => {
              const next = event.relatedTarget;
              if (!(next instanceof Node) || !event.currentTarget.contains(next)) setOver(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setOver(false);
              take(event.dataTransfer.files[0]);
            }}
          >
            <span className="drop-icon">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 3v5h5" />
                <path d="M6 3h8l5 5v13H6z" />
                <path d="M12 17v-6" />
                <path d="m9.5 13.5 2.5-2.5 2.5 2.5" />
              </svg>
            </span>
            <span className="drop-title">{s.dragText}</span>
            <span className="drop-types" id="upload-types">
              {s.fileTypes}
            </span>
            <span className="drop-cta">
              {s.uploadBtn}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 19V5" />
                <path d="m6 11 6-6 6 6" />
              </svg>
            </span>
          </button>

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            hidden
            onChange={(event) => {
              take(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />

          <div className="upload-handling" id="upload-handling">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5" />
              <path d="M12 8h.01" />
            </svg>
            <p>{s.privacy}</p>
          </div>
        </div>

        <section className="upload-benefits" aria-labelledby="benefits-h">
          <h2 className="upload-benefits-label" id="benefits-h">
            {s.benefitLabel}
          </h2>
          <ul>
            {s.uploadBenefits.map((benefit) => (
              <li key={benefit}>
                <span aria-hidden="true">✓</span>
                {benefit}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="example-strip" aria-labelledby="example-h">
        <div className="example-copy">
          <span className="example-eyebrow">{s.exampleEyebrow}</span>
          <h2 id="example-h">{s.exampleHeading}</h2>
          <p>{s.exampleSub}</p>
        </div>

        <div className="example-actions">
          <button className="rental-example" type="button" onClick={onExample}>
            <span className="example-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18" />
                <path d="M5 21V8l7-5 7 5v13" />
                <path d="M9 21v-6h6v6" />
              </svg>
            </span>
            <span className="example-button-copy">
              <strong>{s.exampleBtn}</strong>
              <small>{s.exampleNote}</small>
            </span>
            <span className="example-arrow" aria-hidden="true">→</span>
          </button>

          <button className="employment-example" type="button" onClick={onEmploymentExample}>
            <span>{s.employmentBtn}</span>
            <small>{s.employmentNote}</small>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      <p className="disclaimer upload-disclaimer">{s.disclaimer}</p>
    </section>
  );
}
