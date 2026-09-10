import { test } from "node:test";
import assert from "node:assert/strict";
import { createDeadlineIcs, isIsoCalendarDate } from "../src/ics";

test("calendar export rejects impossible or malformed dates", () => {
  for (const value of [undefined, "", "2026-02-29", "2026-04-31", "2026-13-01", "2026-1-01", "tomorrow", "2026-09-10\nSUMMARY:Wrong"]) {
    assert.equal(isIsoCalendarDate(value), false, value);
  }
  assert.equal(isIsoCalendarDate("2028-02-29"), true);
  assert.equal(createDeadlineIcs("Invalid date", "2026-02-29"), null);
});

test("calendar exports an all-day event with required identity and timestamp", () => {
  const out = createDeadlineIcs("Notice deadline", "2027-06-30", new Date("2026-09-10T12:30:45Z"), "event-one")!;
  assert.ok(out.includes("UID:event-one@signwise.local\r\n"));
  assert.ok(out.includes("DTSTAMP:20260910T123045Z\r\n"));
  assert.ok(out.includes("DTSTART;VALUE=DATE:20270630\r\nDURATION:P1D\r\n"));
  assert.ok(out.endsWith("END:VCALENDAR\r\n"));
});

test("summary punctuation and newlines remain text, never calendar properties", () => {
  const out = createDeadlineIcs("Notice, rent; check \\ source\nBEGIN:VEVENT", "2027-06-30")!;
  assert.ok(out.includes("SUMMARY:Notice\\, rent\\; check \\\\ source\\nBEGIN:VEVENT"));
  assert.equal(out.split("\r\n").filter((line) => line === "BEGIN:VEVENT").length, 1);
});

test("long multilingual summaries fold without losing or splitting characters", () => {
  const summary = "Kündigungsfrist prüfen 🗓️ ".repeat(15);
  const out = createDeadlineIcs(summary, "2027-06-30")!;
  for (const line of out.split("\r\n")) assert.ok(Buffer.byteLength(line, "utf8") <= 75);
  assert.ok(out.replace(/\r\n /g, "").includes(`SUMMARY:${summary}\r\n`));
});

test("different exports cannot replace each other's events on the same date", () => {
  const first = createDeadlineIcs("Rent deadline", "2027-06-30")!;
  const second = createDeadlineIcs("Employment deadline", "2027-06-30")!;
  assert.notEqual(first.match(/^UID:(.+)$/m)?.[1], second.match(/^UID:(.+)$/m)?.[1]);
});
