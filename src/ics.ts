// Calendar dates are all-day dates, never parsed in the browser's local timezone.
export function isIsoCalendarDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const escapeText = (text: string) => text
  .replace(/\\/g, "\\\\")
  .replace(/\r\n|\r|\n/g, "\\n")
  .replace(/;/g, "\\;")
  .replace(/,/g, "\\,");

// RFC 5545 limits a physical content line to 75 UTF-8 octets. Count code points
// so folding German text or emoji cannot split a multi-byte character.
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const width = encoder.encode(char).length;
    if (bytes + width > 75) {
      lines.push(current);
      current = " ";
      bytes = 1;
    }
    current += char;
    bytes += width;
  }
  lines.push(current);
  return lines.join("\r\n");
}

export function createDeadlineIcs(
  summary: string,
  isoDate: string,
  now = new Date(),
  uid: string = crypto.randomUUID(),
): string | null {
  if (!isIsoCalendarDate(isoDate) || !summary.trim()) return null;
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SignWise//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid.replace(/[^a-zA-Z0-9-]/g, "")}@signwise.local`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${isoDate.replace(/-/g, "")}`,
    "DURATION:P1D",
    `SUMMARY:${escapeText(summary)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].map(foldLine).join("\r\n");
}

export function downloadDeadlineIcs(summary: string, isoDate: string): boolean {
  const ics = createDeadlineIcs(summary, isoDate);
  if (!ics) return false;
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "signwise-frist.ics";
  a.hidden = true;
  document.body.append(a);
  a.click();
  a.remove();
  // Give the browser time to start reading the download before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
