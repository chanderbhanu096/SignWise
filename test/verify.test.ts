import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyQuote } from "../src/verify";

test("a verified quote contains every sentence from the document", () => {
  const doc = "The monthly rent is EUR 1,240. The deposit is EUR 3,000.";
  assert.equal(verifyQuote(doc, doc), true);
  assert.equal(verifyQuote(doc, "The monthly rent is EUR 1,240. The deposit is EUR 9,000."), false);
  assert.equal(verifyQuote(doc, "The monthly rent is EUR 1,240. You waive all rights."), false);
});

test("quote verification tolerates PDF whitespace but not changed terms", () => {
  assert.equal(verifyQuote("The rent\n is  EUR 1,240.", "The rent is EUR 1,240."), true);
  assert.equal(verifyQuote("The rent is EUR 1,240.", "The rent is EUR 1,420."), false);
  assert.equal(verifyQuote("The rent is EUR 1,240.", ""), false);
});
