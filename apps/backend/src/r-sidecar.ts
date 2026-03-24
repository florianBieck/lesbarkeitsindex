const R_SIDECAR_URL = process.env.R_SIDECAR_URL ?? "http://r-sidecar:8787";
const TIMEOUT_MS = 30_000;

export type TextAnalysis = {
  readonly sentences: readonly string[];
  readonly words: readonly string[];
  readonly syllablesPerWord: readonly number[];
  readonly posTags: readonly string[];
};

export async function analyzeText(text: string): Promise<TextAnalysis> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${R_SIDECAR_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
  } catch (error) {
    throw new Error(
      `R sidecar unreachable at ${R_SIDECAR_URL}: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(
      `R sidecar returned status ${response.status}: ${await response.text()}`
    );
  }

  const data = await response.json();

  if (
    !Array.isArray(data.sentences) ||
    !Array.isArray(data.words) ||
    !Array.isArray(data.syllablesPerWord) ||
    !Array.isArray(data.posTags)
  ) {
    throw new Error(
      "R sidecar response missing required fields: sentences, words, syllablesPerWord, posTags"
    );
  }

  if (data.words.length !== data.syllablesPerWord.length) {
    throw new Error(
      `R sidecar response mismatch: ${data.words.length} words but ${data.syllablesPerWord.length} syllable counts`
    );
  }

  if (data.words.length !== data.posTags.length) {
    throw new Error(
      `R sidecar response mismatch: ${data.words.length} words but ${data.posTags.length} POS tags`
    );
  }

  return {
    sentences: data.sentences,
    words: data.words,
    syllablesPerWord: data.syllablesPerWord,
    posTags: data.posTags,
  };
}
