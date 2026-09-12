import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { sampleAnalysis } from "../src/sample.ts";

// Exercise the real Azure SDK and model adapter against a local fake endpoint.
// No credentials, contract data or requests leave this test process/machine.
test("model adapter validates responses and has bounded, cancellable provider calls", async (t) => {
  const queue: Array<{ status?: number; value?: unknown; hold?: boolean; finishReason?: "stop" | "length" }> = [];
  const requests: any[] = [];
  const server = createServer(async (req, res) => {
    const parts = [];
    for await (const part of req) parts.push(part);
    requests.push(JSON.parse(Buffer.concat(parts).toString("utf8")));
    const reply = queue.shift();
    server.emit("model-request");
    if (reply?.hold) return;
    res.setHeader("content-type", "application/json");
    res.statusCode = reply?.status ?? 200;
    res.end(JSON.stringify(res.statusCode === 200 ? {
      choices: [{ finish_reason: reply?.finishReason ?? "stop", message: { content: JSON.stringify(reply?.value ?? {}) } }],
    } : { error: { message: "synthetic provider failure", type: "test" } }));
  }).listen(0, "127.0.0.1");
  t.after(() => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()); }));
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  process.env.AZURE_OPENAI_ENDPOINT = `http://127.0.0.1:${address.port}`;
  process.env.AZURE_OPENAI_API_KEY = "synthetic-test-key";
  process.env.AZURE_OPENAI_DEPLOYMENT = "synthetic-test-model";
  const model = await import("../api/_model.ts");
  const a = sampleAnalysis("de");

  await t.test("analysis retries schema drift, clears model verification, and forwards each scanned PDF page", async () => {
    queue.push({ value: { bad: true } }, { value: { ...a, clauses: a.clauses.map((c) => ({ ...c, verified: true })) } });
    const images = ["data:image/jpeg;base64,/9j/4AAA", "data:image/jpeg;base64,/9j/4AAA"];
    const result = await model.analyzeContract({ lang: "de", filename: "synthetic.pdf", mime: "application/pdf", images });
    assert.ok(result.clauses.every((c) => !c.verified));
    assert.equal(requests.length, 2);
    assert.deepEqual(requests[0].messages[1].content.slice(1).map((part: any) => part.image_url.url), images);
  });

  await t.test("Q&A retries a fabricated source before returning a valid answer", async () => {
    queue.push({ value: { answer: "Invalid source", clauseId: "missing" } }, { value: { answer: "A grounded answer.", clauseId: a.clauses[0].id } });
    assert.deepEqual(await model.askContract("What do I pay?", a), { answer: "A grounded answer.", clauseId: a.clauses[0].id });
  });

  await t.test("analysis recovers from a truncated response instead of stopping before output validation", async () => {
    const count = requests.length;
    queue.push({ finishReason: "length", value: { incomplete: true } }, { value: a });
    try {
      const result = await model.analyzeContract({ lang: "de", filename: "synthetic.pdf", mime: "text/plain", text: "Synthetic local contract: rent is EUR 1200 per month." });
      assert.equal(result.lang, "de");
      assert.equal(requests.length, count + 2, "a truncated model response must receive one bounded recovery attempt");
    } finally {
      queue.length = 0;
    }
  });

  await t.test("translation retries a changed financial amount", async () => {
    const translated = { ...structuredClone(a), lang: "en" };
    queue.push({ value: { ...translated, money: { ...translated.money, monthly: 1 } } }, { value: translated });
    const result = await model.translateAnalysis(a, "en");
    assert.equal(result.money.monthly, a.money.monthly);
  });

  // A rate limit is a transport failure and comes back in milliseconds, so the SDK
  // retries it — a single 429 on a small deployment quota must not become a hard
  // "service limit reached" for the user. What must not happen is the adapter
  // retrying on top of that: 3 adapter attempts x 3 SDK attempts is 9 requests at a
  // provider that is already saying stop.
  await t.test("a rate limit is retried by the SDK only, never multiplied by the adapter", async () => {
    const count = requests.length;
    queue.push({ status: 429 }, { status: 429 }, { status: 429 });
    await assert.rejects(model.askContract("What do I pay?", a));
    assert.equal(requests.length, count + 3);
  });

  await t.test("cancellation reaches the SDK without another model attempt", async () => {
    const count = requests.length;
    queue.push({ hold: true });
    const controller = new AbortController();
    const received = once(server, "model-request");
    const completion = model.askContract("What do I pay?", a, controller.signal);
    const rejected = assert.rejects(completion, /abort/i);
    await received;
    controller.abort();
    await rejected;
    assert.equal(requests.length, count + 1);
  });
});

// Measured against a real upload: the model answered "duty" where the schema says
// "responsibility", and the whole analysis was rejected two minutes into the
// request. A chip label is not worth a failed upload.
test("a model's own word for a tag does not throw the analysis away", async () => {
  // _model.ts reads credentials at module scope, so it is imported the same way the
  // suite above does it — after the environment is set, never at file load.
  const { extractJsonForTest } = await import("../api/_model.ts");
  const json = (tags: unknown) => JSON.stringify({ clauses: [{ id: "c1", tags }] });
  const tagsOf = (raw: string) => (extractJsonForTest(raw) as any).clauses[0].tags;
  assert.deepEqual(tagsOf(json(["duty", "money"])), ["responsibility", "money"]);
  assert.deepEqual(tagsOf(json(["Duties"])), ["responsibility"]);
  assert.deepEqual(tagsOf(json(["obligation", "risk"])), ["risk"]); // unknown dropped, not fatal
  assert.deepEqual(tagsOf(json(["duty", "responsibility"])), ["responsibility"]); // no duplicate chip
  assert.deepEqual(tagsOf(json(["money", "deadline"])), ["money", "deadline"]);
});

// Measured over 15 live responses: 10 were rejected by the schema and every one was
// a good analysis with a bad edge. These are the edges, and each repair uses only
// what the same response already says.
test("an analysis is repaired at the edges instead of being thrown away", async () => {
  const { parseAnalysisForTest } = await import("../api/_model.ts");
  const base = () => JSON.parse(JSON.stringify(sampleAnalysis("de")));
  const parse = (a: unknown) => parseAnalysisForTest(JSON.stringify(a), "de");

  // The model answers with the label it prints rather than the id it assigned.
  const named = base();
  const first = named.clauses[0];
  named.glance[0] = { key: "Miete", value: "1.240 €", clauseId: first.ref };
  named.rights[0] = { clauseId: first.title, text: "Sie dürfen die Wohnung nutzen." };
  named.findings[0] = first.ref;
  const fixed = parse(named);
  assert.equal(fixed.glance[0].clauseId, first.id, "a ref was not resolved to its clause");
  assert.equal(fixed.rights[0].clauseId, first.id, "a title was not resolved to its clause");
  assert.equal(fixed.findings[0], first.id);

  // A name that matches nothing is removed, never guessed at.
  const invented = base();
  invented.glance[0] = { key: "Miete", value: "1.240 €", clauseId: "§ 99 Erfundenes" };
  const cleaned = parse(invented);
  assert.equal(cleaned.glance[0].clauseId, undefined, "an invented source must not survive");
  const ids = new Set(cleaned.clauses.map((c) => c.id));
  for (const id of JSON.stringify(cleaned).match(/"clauseId":"(.*?)"/g) ?? []) {
    assert.ok(ids.has(id.slice(12, -1)), `dangling link ${id}`);
  }

  // An entry that lost a field it cannot be shown without goes; the rest stay.
  const holed = base();
  const dates = holed.dates.length;
  holed.dates.push({ date: null, title: "Ohne Datum", body: "x", tone: "normal" });
  assert.equal(parse(holed).dates.length, dates, "a date with no date must not reach the screen");

  // And a clause is never invented to satisfy a link.
  assert.equal(parse(base()).clauses.length, base().clauses.length);
});
