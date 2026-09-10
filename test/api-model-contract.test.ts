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

  await t.test("provider failures are not multiplied by adapter or SDK retries", async () => {
    const count = requests.length;
    queue.push({ status: 429 });
    await assert.rejects(model.askContract("What do I pay?", a));
    assert.equal(requests.length, count + 1);
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
