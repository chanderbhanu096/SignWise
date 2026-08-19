// Minimal .ics for the cancellation-deadline reminder. Hardcoded to the sample's
// 30 Jun 2027 deadline; when the model drives real dates this reads analysis.dates.
export function downloadDeadlineIcs(summary: string, isoDate: string) {
  const dt = isoDate.replace(/-/g, "");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SignWise//DE",
    "BEGIN:VEVENT",
    `UID:${dt}-signwise@local`,
    `DTSTART;VALUE=DATE:${dt}`,
    `SUMMARY:${summary}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "signwise-frist.ics";
  a.click();
  URL.revokeObjectURL(url);
}
