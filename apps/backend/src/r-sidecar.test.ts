import { test, expect, describe, mock, afterEach } from "bun:test";

describe("analyzeText", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("returns parsed response on success", async () => {
    const mockResponse = {
      sentences: ["Der Hund läuft."],
      words: ["Der", "Hund", "läuft"],
      syllablesPerWord: [1, 1, 1],
    };

    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify(mockResponse), { status: 200 }))
    ) as typeof fetch;

    const { analyzeText } = await import("./r-sidecar");
    const result = await analyzeText("Der Hund läuft.");

    expect(result.sentences).toEqual(["Der Hund läuft."]);
    expect(result.words).toEqual(["Der", "Hund", "läuft"]);
    expect(result.syllablesPerWord).toEqual([1, 1, 1]);
  });

  test("throws on mismatched array lengths", async () => {
    const badResponse = {
      sentences: ["Test."],
      words: ["Test"],
      syllablesPerWord: [1, 2],
    };

    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify(badResponse), { status: 200 }))
    ) as typeof fetch;

    const { analyzeText } = await import("./r-sidecar");
    expect(analyzeText("Test.")).rejects.toThrow();
  });

  test("throws on sidecar unreachable", async () => {
    globalThis.fetch = mock(() =>
      Promise.reject(new Error("Connection refused"))
    ) as typeof fetch;

    const { analyzeText } = await import("./r-sidecar");
    expect(analyzeText("Test.")).rejects.toThrow();
  });

  test("throws on non-200 response", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("Internal Server Error", { status: 500 }))
    ) as typeof fetch;

    const { analyzeText } = await import("./r-sidecar");
    expect(analyzeText("Test.")).rejects.toThrow();
  });

  test("throws on missing fields in response", async () => {
    const incomplete = { sentences: ["Test."], words: ["Test"] };

    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify(incomplete), { status: 200 }))
    ) as typeof fetch;

    const { analyzeText } = await import("./r-sidecar");
    expect(analyzeText("Test.")).rejects.toThrow();
  });
});
