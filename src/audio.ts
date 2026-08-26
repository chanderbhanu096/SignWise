import type { Analysis } from "./types";

export type BriefingTurn = { text: string; speaker: "host" | "guide" };

// This deliberately composes only text already shown in the analysis. It does
// not make a second legal judgement or send the original contract to ElevenLabs.
export function audioBriefingTurns(analysis: Analysis, language: "de" | "en"): BriefingTurn[] {
  const de = language === "de";
  const clauses = analysis.findings
    .map((id) => analysis.clauses.find((clause) => clause.id === id))
    .filter((clause): clause is Analysis["clauses"][number] => !!clause)
    .slice(0, 3);
  const intro = de
    ? `Willkommen bei Ihrer kurzen Erklärung zum ${analysis.contractType}. Wir fassen die wichtigsten Punkte zusammen.`
    : `Welcome to your short ${analysis.contractType} briefing. We will cover the most important points.`;
  const turns: BriefingTurn[] = [{ speaker: "host", text: intro }];
  for (const clause of clauses) {
    turns.push({ speaker: "guide", text: `${clause.title}. ${clause.means}`.slice(0, 600) });
  }
  const deadline = analysis.dates.find((date) => date.tone === "warning") ?? analysis.dates[0];
  if (deadline) {
    turns.push({
      speaker: "host",
      text: de ? `Ein wichtiger Termin: ${deadline.date}. ${deadline.title}.` : `One important date: ${deadline.date}. ${deadline.title}.`,
    });
  }
  turns.push({
    speaker: "guide",
    text: de ? "Prüfen Sie die genannten Punkte noch einmal im Originalvertrag, bevor Sie eine Entscheidung treffen." : "Review these points in the original contract again before making a decision.",
  });
  // ElevenLabs recommends keeping a dialogue request below 2,000 characters.
  let used = 0;
  return turns.filter((turn) => {
    used += turn.text.length;
    return used <= 1_800;
  });
}
