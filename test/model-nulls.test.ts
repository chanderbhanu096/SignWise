import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AnalysisSchema } from "../src/types.ts";
import { sampleAnalysis } from "../src/sample.ts";

// The allow-list in api/_model.ts must stay in step with the schema. If someone adds
// a .nullable() field and forgets the list, that field's null gets stripped and the
// analysis is rejected as "Required" — in production, on a live upload, silently.
test("the null allow-list matches every .nullable() field in the schema", () => {
  const model = readFileSync(new URL("../api/_model.ts", import.meta.url), "utf8");
  const types = readFileSync(new URL("../src/types.ts", import.meta.url), "utf8");

  const listed = new Set(
    [...(model.match(/NULL_IS_MEANINGFUL = new Set\(\[([^\]]*)\]/s)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]),
  );
  const nullable = new Set(
    [...types.matchAll(/(\w+):\s*z\.[^,\n]*?\.nullable\(\)/g)].map((m) => m[1]),
  );
  assert.deepEqual([...listed].sort(), [...nullable].sort());
});

test("a null in an optional field is dropped, not rejected", async () => {
  const good = JSON.parse(JSON.stringify(sampleAnalysis("de")));
  // exactly what the live model sent: null for "no statute applies"
  good.clauses[0].legal = null;
  good.decisionSummary.commitments[0].value = null;
  assert.throws(() => AnalysisSchema.parse(good), "raw null must still be invalid");

  const { extractJsonForTest } = await import("../api/_model.ts");
  const cleaned = extractJsonForTest(JSON.stringify(good));
  assert.doesNotThrow(() => AnalysisSchema.parse(cleaned));
});

test("a null that means 'not stated' survives", async () => {
  const { extractJsonForTest } = await import("../api/_model.ts");
  const cleaned: any = extractJsonForTest(JSON.stringify({ money: { monthly: null, yearly: null }, x: { amount: null, legal: null } }));
  assert.equal(cleaned.money.monthly, null, "monthly null is meaningful");
  assert.equal(cleaned.x.amount, null, "amount null is meaningful — never render as 0");
  assert.ok(!("legal" in cleaned.x), "legal null is dropped");
});
