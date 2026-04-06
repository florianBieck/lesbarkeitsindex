import { Injectable } from '@nestjs/common';

const TIMEOUT_MS = 30_000;

export type TextAnalysis = {
  readonly sentences: readonly string[];
  readonly words: readonly string[];
  readonly syllablesPerWord: readonly number[];
  readonly posTags: readonly string[];
};

@Injectable()
export class RSidecarService {
  private readonly url: string;

  constructor() {
    const url = process.env['R_SIDECAR_URL'];
    if (!url) {
      throw new Error(
        'R_SIDECAR_URL environment variable is required. See apps/backend/.env.example',
      );
    }
    this.url = url;
  }

  async analyzeText(text: string): Promise<TextAnalysis> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${this.url}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
    } catch (error) {
      throw new Error(
        `R sidecar unreachable at ${this.url}: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(`R sidecar returned status ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();

    if (
      !Array.isArray(data.sentences) ||
      !Array.isArray(data.words) ||
      !Array.isArray(data.syllablesPerWord) ||
      !Array.isArray(data.posTags)
    ) {
      throw new Error(
        'R sidecar response missing required fields: sentences, words, syllablesPerWord, posTags',
      );
    }

    if (data.words.length !== data.syllablesPerWord.length) {
      throw new Error(
        `R sidecar response mismatch: ${data.words.length} words but ${data.syllablesPerWord.length} syllable counts`,
      );
    }

    if (data.words.length !== data.posTags.length) {
      throw new Error(
        `R sidecar response mismatch: ${data.words.length} words but ${data.posTags.length} POS tags`,
      );
    }

    if (data.sentences.length === 0) {
      throw new Error('R sidecar returned empty sentences array');
    }

    if (!data.sentences.every((s: unknown) => typeof s === 'string')) {
      throw new Error('R sidecar response: sentences must all be strings');
    }

    if (!data.words.every((w: unknown) => typeof w === 'string')) {
      throw new Error('R sidecar response: words must all be strings');
    }

    if (!data.syllablesPerWord.every((n: unknown) => typeof n === 'number' && !Number.isNaN(n))) {
      throw new Error('R sidecar response: syllablesPerWord must all be numbers');
    }

    if (!data.posTags.every((t: unknown) => typeof t === 'string')) {
      throw new Error('R sidecar response: posTags must all be strings');
    }

    return {
      sentences: data.sentences,
      words: data.words,
      syllablesPerWord: data.syllablesPerWord,
      posTags: data.posTags,
    };
  }
}
