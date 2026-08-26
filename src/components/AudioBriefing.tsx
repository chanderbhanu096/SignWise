import { useEffect, useState } from "react";
import type { Lang } from "../types";
import { audioAvailable } from "../api";

export function AudioBriefing({
  appLang,
  onGenerate,
}: {
  appLang: Lang;
  onGenerate: (language: "de" | "en") => Promise<Blob>;
}) {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<"de" | "en">(appLang === "de" ? "de" : "en");
  const [generating, setGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState(false);
  const de = appLang === "de";

  // Asked once per mount, and it starts false: on a deployment with no ElevenLabs
  // credentials the card never appears at all, rather than flashing in and then
  // failing the first time somebody presses it.
  useEffect(() => {
    let live = true;
    audioAvailable().then((ok) => live && setAvailable(ok));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const audio = await onGenerate(language);
      setAudioUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(audio);
      });
      setOpen(false);
    } catch {
      setError(de ? "Die Audio-Zusammenfassung konnte gerade nicht erstellt werden." : "The audio briefing could not be created right now.");
    } finally {
      setGenerating(false);
    }
  }

  if (!available) return null;

  return (
    <div className="audio-briefing">
      <div>
        <span className="audio-briefing-kicker">{de ? "AUDIO-ZUSAMMENFASSUNG" : "AUDIO BRIEFING"}</span>
        <h2>{de ? "Lieber zuhören?" : "Prefer to listen?"}</h2>
        <p>{de ? "Zwei Stimmen erklären die wichtigsten Punkte in etwa zwei Minuten." : "Two voices explain the most important points in about two minutes."}</p>
      </div>
      <button className="btn" onClick={() => setOpen(true)}>
        <span aria-hidden="true">▶</span>
        {de ? "Audio erstellen" : "Create audio"}
      </button>

      {audioUrl && (
        <div className="audio-player" aria-label={de ? "Ihre Audio-Zusammenfassung" : "Your audio briefing"}>
          <audio controls src={audioUrl} />
          <a className="link-btn" href={audioUrl} download="signwise-audio-briefing.mp3">
            {de ? "MP3 herunterladen" : "Download MP3"}
          </a>
        </div>
      )}
      {error && <p className="audio-error" role="alert">{error}</p>}

      {open && (
        <dialog className="confirm audio-dialog" open aria-labelledby="audio-dialog-h" onCancel={() => !generating && setOpen(false)}>
          <h2 id="audio-dialog-h">{de ? "Audio-Zusammenfassung erstellen" : "Create audio briefing"}</h2>
          <p>{de ? "Wählen Sie die Sprache für die Erklärung." : "Choose the language for the explanation."}</p>
          <div className="audio-language" role="group" aria-label={de ? "Sprache der Audio-Zusammenfassung" : "Audio briefing language"}>
            <button className={"pill" + (language === "de" ? " on" : "")} aria-pressed={language === "de"} onClick={() => setLanguage("de")}>Deutsch</button>
            <button className={"pill" + (language === "en" ? " on" : "")} aria-pressed={language === "en"} onClick={() => setLanguage("en")}>English</button>
          </div>
          <p className="audio-privacy">{de ? "Die kurze, KI-erstellte Zusammenfassung wird zur Spracherzeugung an ElevenLabs gesendet. Nicht der vollständige Vertrag." : "The short AI-generated summary is sent to ElevenLabs to create speech. Not the full contract."}</p>
          <div className="confirm-actions">
            <button className="btn" disabled={generating} onClick={() => setOpen(false)}>{de ? "Abbrechen" : "Cancel"}</button>
            <button className="btn btn-primary" disabled={generating} onClick={generate}>
              {generating && <span className="spinner" aria-hidden="true" />}
              {generating ? (de ? "Wird erstellt…" : "Creating…") : (de ? "Audio erstellen" : "Create audio")}
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
