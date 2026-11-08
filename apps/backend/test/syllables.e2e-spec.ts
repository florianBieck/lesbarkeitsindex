import { beforeAll, describe, expect, test } from 'vitest';

/**
 * Golden-syllable e2e spec for the R sidecar (issue #25).
 *
 * The sidecar must count syllables via German hyphenation patterns
 * (sylly + sylly.de). The English method (CMU dict + English vowel
 * rules) undercounts German words, e.g. "Radioaktivität" -> 4 instead of 7.
 *
 * HTTP contract under test (must stay stable):
 *   POST /analyze {text} -> {sentences, words, syllablesPerWord, posTags}
 */

const BASE = process.env['R_SIDECAR_URL'] ?? 'http://localhost:8787';

interface AnalyzeResponse {
  readonly sentences: readonly string[];
  readonly words: readonly string[];
  readonly syllablesPerWord: readonly number[];
  readonly posTags: readonly string[];
}

interface SyllableCase {
  readonly word: string;
  readonly expected: number;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isNumberArray(value: unknown): value is readonly number[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'number');
}

function parseAnalyzeResponse(payload: unknown, text: string): AnalyzeResponse {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error(`POST ${BASE}/analyze returned a non-object body for "${text}"`);
  }
  const record = payload as Record<string, unknown>;
  const { sentences, words, syllablesPerWord, posTags } = record;
  if (
    !isStringArray(sentences) ||
    !isStringArray(words) ||
    !isNumberArray(syllablesPerWord) ||
    !isStringArray(posTags)
  ) {
    throw new Error(
      `POST ${BASE}/analyze response violates the contract ` +
        `{sentences: string[], words: string[], syllablesPerWord: number[], posTags: string[]} ` +
        `for "${text}": ${JSON.stringify(payload)}`,
    );
  }
  if (words.length !== syllablesPerWord.length || words.length !== posTags.length) {
    throw new Error(
      `POST ${BASE}/analyze returned misaligned arrays for "${text}": ` +
        `words=${words.length}, syllablesPerWord=${syllablesPerWord.length}, posTags=${posTags.length}`,
    );
  }
  return { sentences, words, syllablesPerWord, posTags };
}

async function analyze(text: string): Promise<AnalyzeResponse> {
  const response = await fetch(`${BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) {
    throw new Error(`POST ${BASE}/analyze failed with HTTP ${response.status} for "${text}"`);
  }
  const payload: unknown = await response.json();
  return parseAnalyzeResponse(payload, text);
}

/**
 * Counts the syllables of a single word. The word is sent as a complete
 * sentence ("<word>.") because the sidecar expects sentence-terminated text.
 */
async function syllableCountOf(word: string): Promise<number> {
  const result = await analyze(`${word}.`);
  const index = result.words.indexOf(word);
  if (index === -1) {
    throw new Error(
      `Token "${word}" not found in tokenizer output: ${JSON.stringify(result.words)}`,
    );
  }
  const count = result.syllablesPerWord.at(index);
  if (count === undefined) {
    throw new Error(`No syllable count at index ${index} for "${word}"`);
  }
  return count;
}

function expectSyllables(cases: readonly SyllableCase[]): void {
  test.each(cases)('counts $word as $expected syllables', async ({ word, expected }) => {
    await expect(syllableCountOf(word)).resolves.toBe(expected);
  });
}

beforeAll(async () => {
  let healthy = false;
  try {
    const response = await fetch(`${BASE}/health`);
    healthy = response.ok;
  } catch {
    healthy = false;
  }
  if (!healthy) {
    throw new Error(
      `R-Sidecar nicht erreichbar unter ${BASE} — Stack starten: docker compose up -d`,
    );
  }
});

describe('POST /analyze contract', () => {
  test('returns aligned sentences/words/syllablesPerWord/posTags arrays', async () => {
    const result = await analyze('Die Sonne scheint hell.');
    expect(result.sentences).toHaveLength(1);
    expect(result.words.length).toBeGreaterThan(0);
    expect(result.words).toContain('Sonne');
    expect(result.syllablesPerWord).toHaveLength(result.words.length);
    expect(result.posTags).toHaveLength(result.words.length);
  });
});

describe('German golden words', () => {
  expectSyllables([
    { word: 'Universität', expected: 5 },
    { word: 'Familie', expected: 4 },
    { word: 'Eier', expected: 2 },
    { word: 'Sonne', expected: 2 },
    { word: 'Radioaktivität', expected: 7 },
    { word: 'Lehrerin', expected: 3 },
    { word: 'Marie', expected: 2 },
    { word: 'Curie', expected: 2 },
  ]);
});

describe('umlauts', () => {
  expectSyllables([
    { word: 'Häuser', expected: 2 },
    { word: 'Bäume', expected: 2 },
    { word: 'Tür', expected: 1 },
  ]);
});

describe('word-final -e (spoken schwa, never silent)', () => {
  expectSyllables([
    { word: 'Lampe', expected: 2 },
    { word: 'Katze', expected: 2 },
  ]);
});

describe('diphthongs and vowel digraphs', () => {
  describe('ei', () => {
    expectSyllables([
      { word: 'Wein', expected: 1 },
      { word: 'Eier', expected: 2 },
    ]);
  });

  describe('ie', () => {
    expectSyllables([
      { word: 'Wiese', expected: 2 },
      { word: 'Liebe', expected: 2 },
    ]);
  });

  describe('eu', () => {
    expectSyllables([
      { word: 'Leute', expected: 2 },
      { word: 'Feuer', expected: 2 },
    ]);
  });

  describe('äu', () => {
    expectSyllables([
      { word: 'Häuser', expected: 2 },
      { word: 'Räuber', expected: 2 },
    ]);
  });

  describe('au', () => {
    expectSyllables([
      { word: 'Haus', expected: 1 },
      { word: 'Auto', expected: 2 },
    ]);
  });
});

describe('word-initial single-vowel syllable (patterns never split after the first letter)', () => {
  expectSyllables([
    { word: 'Aber', expected: 2 },
    { word: 'aber', expected: 2 },
    { word: 'Abend', expected: 2 },
    { word: 'oben', expected: 2 },
    { word: 'über', expected: 2 },
    { word: 'oder', expected: 2 },
    { word: 'Igel', expected: 2 },
    { word: 'Ofen', expected: 2 },
    { word: 'Übung', expected: 2 },
    { word: 'Ameise', expected: 3 },
  ]);

  describe('words the patterns split right after the second letter are kept as-is', () => {
    expectSyllables([
      { word: 'uralt', expected: 2 },
      { word: 'unendlich', expected: 3 },
      { word: 'erinnern', expected: 3 },
      { word: 'umarmen', expected: 3 },
      { word: 'Energie', expected: 3 },
    ]);
  });

  describe('diphthong onsets are not lone vowels', () => {
    expectSyllables([
      { word: 'einige', expected: 3 },
      { word: 'Eimer', expected: 2 },
    ]);
  });
});

describe('word-final -ie spoken as -i-e (lexical corrections)', () => {
  expectSyllables([
    { word: 'Linie', expected: 3 },
    { word: 'Serie', expected: 3 },
    { word: 'Folie', expected: 3 },
    { word: 'Studie', expected: 3 },
    { word: 'Aktie', expected: 3 },
    { word: 'Materie', expected: 4 },
    { word: 'Komödie', expected: 4 },
    { word: 'Tragödie', expected: 4 },
  ]);

  describe('inflected -ien forms hyphenate correctly without correction', () => {
    expectSyllables([
      { word: 'Linien', expected: 3 },
      { word: 'Familien', expected: 4 },
    ]);
  });
});

describe('corrections match case-insensitively', () => {
  expectSyllables([
    { word: 'familie', expected: 4 },
    { word: 'linie', expected: 3 },
    { word: 'radioaktivität', expected: 7 },
  ]);
});

describe('hyphenated compounds', () => {
  test('keeps "Carl-Heinrich" as a single token with a summed syllable count of 3', async () => {
    const result = await analyze('Carl-Heinrich Becquerel forschte.');
    expect(result.words).toContain('Carl-Heinrich');
    expect(result.words).not.toContain('Carl');
    expect(result.words).not.toContain('Heinrich');
    const index = result.words.indexOf('Carl-Heinrich');
    expect(result.syllablesPerWord.at(index)).toBe(3);
  });
});
