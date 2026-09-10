import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "../src/api.ts";
import { sampleAnalysis } from "../src/sample.ts";
import { parseAnalyzeInput } from "../api/_validation.ts";

const pageImage = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]).toString("base64")}`;

test("readable PDF requests pseudonymise extracted text and do not disclose the original filename", async (t) => {
  let sent: Record<string, unknown> | undefined;
  t.mock.method(globalThis, "fetch", async (_url: unknown, options: RequestInit) => {
    sent = JSON.parse(String(options.body));
    return new Response(JSON.stringify(sampleAnalysis("en")));
  });
  const file = new File(["synthetic PDF bytes"], "PRIVATE_NAME_test.person@example.com.pdf", { type: "application/pdf" });
  await analyze(file, "en", "Monthly rent EUR 1200. Contact: test.person@example.com.");
  assert.ok(sent && typeof sent.text === "string");
  assert.equal(sent.text.includes("test.person@example.com"), false);
  assert.equal("filename" in sent, false);
  assert.equal("dataB64" in sent, false);
  assert.equal("images" in sent, false);
  assert.equal(parseAnalyzeInput(sent).text, sent.text);
});

test("scanned and mixed PDF requests send ordered page images accepted by the API, never PDF bytes or partial text", async (t) => {
  let sent: Record<string, unknown> | undefined;
  t.mock.method(globalThis, "fetch", async (_url: unknown, options: RequestInit) => {
    sent = JSON.parse(String(options.body));
    return new Response(JSON.stringify(sampleAnalysis("en")));
  });
  // Browser MIME omission must still work through the deliberate extension fallback.
  const file = new File(["RAW_PRIVATE_PDF_BYTES"], "PRIVATE_NAME.pdf", { type: "" });
  const pages = [pageImage, pageImage];
  await analyze(file, "en", "Partial readable text that must not suppress a scanned page", undefined, pages);
  assert.ok(sent);
  assert.equal(sent.mime, "application/pdf");
  assert.deepEqual(sent.images, pages);
  assert.equal("text" in sent, false);
  assert.equal("filename" in sent, false);
  assert.equal("dataB64" in sent, false);
  assert.equal(JSON.stringify(sent).includes("RAW_PRIVATE_PDF_BYTES"), false);
  assert.deepEqual(parseAnalyzeInput(sent).images, pages);
});

test("image-file uploads with an omitted MIME type use the actual supported extension", async (t) => {
  let sent: Record<string, unknown> | undefined;
  t.mock.method(globalThis, "fetch", async (_url: unknown, options: RequestInit) => {
    sent = JSON.parse(String(options.body));
    return new Response(JSON.stringify(sampleAnalysis("en")));
  });
  const file = new File([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0])], "PRIVATE_NAME.JPG", { type: "" });
  await analyze(file, "en", null);
  assert.ok(sent);
  assert.equal(sent.mime, "image/jpeg");
  assert.equal(parseAnalyzeInput(sent).dataB64, pageImage.split(",")[1]);
});

test("cancelled uploads pass an already-aborted signal to the transport", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url: unknown, options: RequestInit) => {
    assert.equal(options.signal?.aborted, true);
    throw options.signal?.reason;
  });
  const controller = new AbortController();
  controller.abort();
  const file = new File(["synthetic"], "contract.pdf", { type: "application/pdf" });
  await assert.rejects(analyze(file, "en", "A readable contract.", controller.signal), { name: "AbortError" });
});
