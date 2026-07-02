import { Injectable } from '@nestjs/common';
import { z } from 'zod';

const TIMEOUT_MS = 30_000;

// Formvertrag der Sidecar-Antwort: nichtleere Satzliste plus drei wortparallele
// Arrays — words, syllablesPerWord und posTags müssen gleich lang sein.
// z.number() lehnt NaN bereits ab (invalid_type).
const TextAnalysisSchema = z
  .object({
    sentences: z.array(z.string()).min(1),
    words: z.array(z.string()),
    syllablesPerWord: z.array(z.number()),
    posTags: z.array(z.string()),
  })
  .refine(
    (d) => d.words.length === d.syllablesPerWord.length && d.words.length === d.posTags.length,
    { message: 'words, syllablesPerWord and posTags must have equal length' },
  );

export type TextAnalysis = z.infer<typeof TextAnalysisSchema>;

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

    const parsed = TextAnalysisSchema.safeParse(await response.json());
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('; ');
      // Präfix "R sidecar" beibehalten — calculate.service.ts mappt solche
      // Fehler auf 503 (Service Unavailable).
      throw new Error(`R sidecar response invalid: ${issues}`);
    }

    return parsed.data;
  }
}
