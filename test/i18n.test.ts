import { test } from "node:test";
import assert from "node:assert/strict";
import { t } from "../src/i18n.ts";

test("both languages ship their own slogans", () => {
  const de = t("de").slogans;
  const en = t("en").slogans;
  assert.ok(de.length > 0 && en.length > 0);
  // No slogan may leak across languages when switching.
  for (const line of de) assert.ok(!en.includes(line), `shared slogan: ${line}`);
  // German UI addresses the reader formally; the slogans must not switch to "du".
  for (const line of de) assert.ok(!/\bDein|\bDeinen|\bDu\b/.test(line), `informal address: ${line}`);
});

test("unknown languages fall back to the English chrome, slogans included", () => {
  assert.deepEqual(t("tr").slogans, t("en").slogans);
});
