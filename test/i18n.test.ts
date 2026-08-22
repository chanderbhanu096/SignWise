import { test } from "node:test";
import assert from "node:assert/strict";
import { t } from "../src/i18n.ts";

test("both languages ship their own slogans", () => {
  const de = t("de").slogans;
  const en = t("en").slogans;
  assert.ok(de.length > 0 && en.length > 0);
  // No slogan may leak across languages when switching.
  for (const line of de) assert.ok(!en.includes(line), `shared slogan: ${line}`);
  // The slogans are the one place the German copy uses "du" — chosen deliberately.
  // Everything else in the German UI stays formal, so guard that instead.
  const de_ui = t("de");
  for (const line of [de_ui.hero, de_ui.heroSub, de_ui.privacy, de_ui.disclaimer, de_ui.disclaimerLong]) {
    assert.ok(!/\bDein|\bDeinen|\bDu\b/.test(line), `informal address: ${line}`);
  }
});

test("unknown languages fall back to the English chrome, slogans included", () => {
  assert.deepEqual(t("tr").slogans, t("en").slogans);
});
