import { test } from "node:test";
import assert from "node:assert/strict";
import { sectionExists, lawIndexed } from "../src/lawindex";
import { getOfficialLawUrl } from "../src/contract";

test("real sections resolve to their official page", () => {
  assert.equal(getOfficialLawUrl("BGB", "§ 551"), "https://www.gesetze-im-internet.de/bgb/__551.html");
  assert.equal(getOfficialLawUrl("BGB", "§ 312g"), "https://www.gesetze-im-internet.de/bgb/__312g.html");
  assert.equal(getOfficialLawUrl("BUrlG", "§ 3"), "https://www.gesetze-im-internet.de/burlg/__3.html");
});

// The reason this index exists: a citation the model invented used to become a 404
// presented to the reader as an official source.
test("a section that does not exist never becomes a link", () => {
  assert.equal(getOfficialLawUrl("BGB", "§ 9999"), null);
  assert.equal(getOfficialLawUrl("BUrlG", "§ 812"), null); // real BGB section, not in BUrlG
  assert.equal(sectionExists("bgb", "9999"), false);
});

test("every law the app can link has an index behind it", () => {
  for (const law of ["bgb", "burlg", "kschg", "tkg", "vvg", "betrkv", "milog"]) {
    assert.ok(lawIndexed(law), `${law} has no section index`);
  }
});

test("an unknown law stays plain text rather than guessing a slug", () => {
  assert.equal(getOfficialLawUrl("XYZG", "§ 1"), null);
});
