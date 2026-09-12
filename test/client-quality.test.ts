import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { analyze, ask, translate, ApiError } from "../src/api.ts";
import { ContractSession } from "../src/session.ts";
import { sampleAnalysis } from "../src/sample.ts";
import { contractMimeType, validateContractFile } from "../src/upload.ts";

const syntheticFile = (name = "Synthetic-Person-private-contract.PDF", type = "") =>
  new File(["Synthetic test document only"], name, { type });
const jsonResponse = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { "content-type": "application/json" },
});

// Each mock is restored even when an assertion fails. These tests never contact
// a model service or use a real document.
async function withFetchMock(mock: typeof fetch, run: () => Promise<void>) {
  const original = globalThis.fetch;
  globalThis.fetch = mock;
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
}

test("a new contract clears both translations and invalidates the previous request", () => {
  const session = new ContractSession();
  const oldTicket = session.ticket();
  session.translations.set("de", sampleAnalysis("de"));
  session.translations.set("en", sampleAnalysis("en"));

  session.reset();

  assert.equal(session.translations.size, 0);
  assert.equal(oldTicket.signal.aborted, true);
  assert.equal(oldTicket.isCurrent(), false);
  assert.equal(session.ticket().isCurrent(), true);
  assert.notEqual(session.ticket().signal, oldTicket.signal);
});

test("cancel invalidates every ticket for the current contract until a fresh session starts", () => {
  const session = new ContractSession();
  const ticket = session.ticket();
  session.translations.set("en", sampleAnalysis("en"));

  session.cancel();

  assert.equal(ticket.isCurrent(), false);
  assert.equal(ticket.signal.aborted, true);
  assert.equal(session.ticket().isCurrent(), false);
  assert.equal(session.translations.size, 0);
  session.reset();
  assert.equal(session.ticket().isCurrent(), true);
  assert.equal(ticket.isCurrent(), false, "starting another contract must not revive old work");
});

test("empty uploads stop before processing and fallback MIME agrees with accepted extensions", () => {
  assert.equal(validateContractFile(new File([], "empty.pdf", { type: "application/pdf" })), "empty_file");
  for (const [name, expected] of [
    ["contract.PDF", "application/pdf"],
    ["scan.JPG", "image/jpeg"],
    ["scan.jpeg", "image/jpeg"],
    ["scan.png", "image/png"],
    ["scan.webp", "image/webp"],
  ]) {
    for (const type of ["", "application/octet-stream"]) {
      const file = syntheticFile(name, type);
      assert.equal(validateContractFile(file), null);
      assert.equal(contractMimeType(file), expected);
    }
  }
  assert.equal(validateContractFile(syntheticFile("disguised.pdf", "text/plain")), "unsupported_type");
});

test("client API boundaries", { concurrency: false }, async (suite) => {
  await suite.test("text analysis excludes the filename, pseudonymises identifiers, and restores quotes exactly", async () => {
    const file = syntheticFile();
    const contract = '§ 1 Kontakt. Rückfragen an "Testpostfach" unter tenant@example.test. Zahlung auf IBAN DE89 3704 0044 0532 0130 00. Die Miete beträgt 1.240 EUR.';
    await withFetchMock(async (path, options) => {
      assert.equal(path, "/api/analyze");
      assert.equal(options?.method, "POST");
      const sent = JSON.parse(String(options?.body));
      assert.equal(sent.mime, "application/pdf");
      assert.equal(sent.lang, "de");
      assert.equal("filename" in sent, false);
      assert.equal("dataB64" in sent, false);
      assert.equal("images" in sent, false);
      assert.ok(!String(options?.body).includes("Synthetic-Person"));
      assert.ok(!sent.text.includes("tenant@example.test"));
      assert.ok(!sent.text.includes("DE89 3704 0044 0532 0130 00"));
      assert.match(sent.text, /\[E-MAIL-1\]/);
      assert.match(sent.text, /1\.240 EUR/);
      const result = sampleAnalysis("de");
      result.clauses[0].quote = sent.text;
      return jsonResponse(result);
    }, async () => {
      const result = await analyze(file, "de", contract);
      assert.equal(result.clauses[0].quote, contract, "quote restoration must preserve punctuation and JSON escaping");
    });
  });

  await suite.test("image uploads use the normalized image type and send the original bytes without a filename", async () => {
    const file = syntheticFile("Synthetic-Person-scan.PNG", "application/octet-stream");
    await withFetchMock(async (_path, options) => {
      const sent = JSON.parse(String(options?.body));
      assert.equal(sent.mime, "image/png");
      assert.equal(atob(sent.dataB64), "Synthetic test document only");
      assert.equal("filename" in sent, false);
      assert.ok(!String(options?.body).includes("Synthetic-Person"));
      return jsonResponse(sampleAnalysis("de"));
    }, async () => {
      await analyze(file, "de", null);
    });
  });

  await suite.test("rendered PDF pages are sent as images instead of raw PDF bytes or incomplete text", async () => {
    const pages = ["data:image/jpeg;base64,c3ludGhldGljLXBvaW50cw=="];
    await withFetchMock(async (_path, options) => {
      const sent = JSON.parse(String(options?.body));
      assert.deepEqual(sent.images, pages);
      assert.equal("dataB64" in sent, false);
      assert.equal("text" in sent, false);
      assert.equal("filename" in sent, false);
      return jsonResponse(sampleAnalysis("de"));
    }, async () => {
      await analyze(syntheticFile(), "de", "incomplete text layer", undefined, pages);
    });
  });

  await suite.test("follow-up questions and translated analyses receive the same reversible identifier protection", async () => {
    const analysis = sampleAnalysis("de");
    const quote = "Rückfragen an tenant@example.test. Die Miete beträgt 1.240 EUR.";
    analysis.clauses[0].quote = quote;
    const question = "Can I contact tenant@example.test?";
    await withFetchMock(async (path, options) => {
      const sent = JSON.parse(String(options?.body));
      assert.ok(!String(options?.body).includes("tenant@example.test"));
      assert.match(sent.analysis.clauses[0].quote, /\[E-MAIL-1\]/);
      if (path === "/api/ask") {
        assert.match(sent.question, /\[E-MAIL-1\]/);
        return jsonResponse({ answer: "Contact [E-MAIL-1].", clauseId: analysis.clauses[0].id });
      }
      assert.equal(path, "/api/translate");
      assert.equal(sent.target, "en");
      sent.analysis.lang = "en";
      return jsonResponse(sent.analysis);
    }, async () => {
      assert.equal((await ask(question, analysis)).answer, "Contact tenant@example.test.");
      const translated = await translate(analysis, "en");
      assert.equal(translated.lang, "en");
      assert.equal(translated.clauses[0].quote, quote);
    });
  });

  for (const endpoint of ["analyze", "ask", "translate"] as const) {
    await suite.test(`${endpoint} forwards cancellation to its fetch request`, async () => {
      const controller = new AbortController();
      let requestSignal: AbortSignal | null | undefined;
      const analysis = sampleAnalysis("de");
      await withFetchMock(async (_path, options) => {
        requestSignal = options?.signal;
        assert.ok(requestSignal, "fetch must have a cancellation signal");
        return new Promise<Response>((_resolve, reject) => {
          requestSignal!.addEventListener("abort", () => reject(new DOMException("Cancelled", "AbortError")), { once: true });
        });
      }, async () => {
        const request = endpoint === "analyze"
          ? analyze(syntheticFile(), "de", "§ 1 Miete. 1.240 EUR.", controller.signal)
          : endpoint === "ask"
            ? ask("What is the rent?", analysis, controller.signal)
            : translate(analysis, "en", controller.signal);
        const rejection = assert.rejects(request, (error: unknown) => error instanceof Error && error.name === "AbortError");
        controller.abort();
        await rejection;
        assert.equal(requestSignal?.aborted, true);
      });
    });
  }

  await suite.test("a request started with an already cancelled ticket cannot proceed", async () => {
    const controller = new AbortController();
    controller.abort();
    await withFetchMock(async (_path, options) => {
      assert.equal(options?.signal?.aborted, true);
      throw new DOMException("Cancelled", "AbortError");
    }, async () => {
      await assert.rejects(ask("What is the rent?", sampleAnalysis("de"), controller.signal), { name: "AbortError" });
    });
  });

  await suite.test("completed requests remove their parent cancellation listener", async () => {
    const controller = new AbortController();
    let requestSignal: AbortSignal | null | undefined;
    await withFetchMock(async (_path, options) => {
      requestSignal = options?.signal;
      return jsonResponse({ answer: "The contract does not say.", clauseId: null });
    }, async () => {
      await ask("Is there a pool?", sampleAnalysis("de"), controller.signal);
      controller.abort();
      assert.equal(requestSignal?.aborted, false, "finished requests must not keep a listener on their old contract");
    });
  });

  for (const abandon of ["reset", "cancel"] as const) {
    await suite.test(`an analysis resolving after ${abandon} cannot replace the current contract or populate its cache`, async () => {
      const session = new ContractSession();
      const ticket = session.ticket();
      let release!: (response: Response) => void;
      let shown = "Current contract";
      // Deliberately emulate a response already in flight that ignores abort.
      // The session ticket must protect the UI even when cancellation is late.
      await withFetchMock(async () => new Promise<Response>((resolve) => { release = resolve; }), async () => {
        const request = analyze(syntheticFile(), "de", "§ 1 Miete.", ticket.signal).then((result) => {
          if (!ticket.isCurrent()) return;
          shown = result.contractType;
          session.translations.set(result.lang, result);
        });
        session[abandon]();
        const stale = sampleAnalysis("de");
        stale.contractType = "Abandoned contract";
        release(jsonResponse(stale));
        await request;
        assert.equal(shown, "Current contract");
        assert.equal(session.translations.size, 0);
      });
    });
  }

  await suite.test("Q&A rejects malformed responses and missing or invented source references", async () => {
    const invalid = [
      null,
      { answer: 42, clauseId: null },
      { answer: "   ", clauseId: null },
      { answer: "An answer without a source field" },
      { answer: "An invented citation", clauseId: "not-a-real-clause" },
    ];
    for (const result of invalid) {
      await withFetchMock(async () => jsonResponse(result), async () => {
        await assert.rejects(ask("What is the rent?", sampleAnalysis("de")),
          (error: unknown) => error instanceof ApiError && error.code === "ask_failed");
      });
    }
  });

  await suite.test("Q&A accepts a real clause and an explicitly unsupported question without inventing a source", async () => {
    const analysis = sampleAnalysis("de");
    for (const result of [
      { answer: "The rent is stated in the contract.", clauseId: analysis.clauses[0].id },
      { answer: "The contract does not contain that information.", clauseId: null },
    ]) {
      await withFetchMock(async () => jsonResponse(result), async () => {
        assert.deepEqual(await ask("What does the contract say?", analysis), result);
      });
    }
  });

  await suite.test("server failures remain actionable API errors rather than fabricated answers", async () => {
    await withFetchMock(async () => jsonResponse({ error: "model_unavailable" }, 503), async () => {
      await assert.rejects(ask("What is the rent?", sampleAnalysis("de")),
        (error: unknown) => error instanceof ApiError && error.code === "model_unavailable");
    });
    await withFetchMock(async () => new Response("Unavailable", { status: 503 }), async () => {
      await assert.rejects(translate(sampleAnalysis("de"), "en"),
        (error: unknown) => error instanceof ApiError && error.code === "http_503");
    });
  });
});

// Every refusal the server can send has to arrive as a sentence the person can act
// on. The rate limiter shipped without one, so a caller who hit it would have been
// told "Verbindung fehlgeschlagen" — which points at their network and is wrong.
test("every failure the API can return has a message written for the reader", () => {
  const source = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const files = ["api/_http.ts", "api/_validation.ts", "api/_model.ts", "api/analyze.ts", "api/ask.ts",
                 "api/translate.ts", "src/pdf.ts", "src/upload.ts"];
  const thrown = new Set(
    files.flatMap((f) => [...source(f).matchAll(/new (?:ApiFailure|UploadError)\("([a-z_]+)"/g)].map((m) => m[1])),
  );
  const app = source("src/App.tsx");
  const described = new Set([...app.matchAll(/^\s{8}([a-z_]+):\s*"/gm)].map((m) => m[1]));

  // Codes the UI cannot reach: the request shape is the app's own, the question box
  // caps its own length and disables itself when empty, and an abort is the person
  // pressing cancel. If one of these ever shows up on screen it is a bug in the
  // client, and a friendly sentence would hide it.
  const unreachable = new Set(["bad_analysis", "empty_question", "invalid_json", "invalid_language",
                               "invalid_request", "question_too_long", "request_aborted"]);

  const silent = [...thrown].filter((code) => !described.has(code) && !unreachable.has(code));
  assert.deepEqual(silent, [], `no message for: ${silent.join(", ")}`);

  // And the validation codes the upload screen raises before any request.
  for (const code of ["unsupported_type", "too_large", "empty_file"]) {
    assert.ok(described.has(code), `no message for ${code}`);
  }
});
