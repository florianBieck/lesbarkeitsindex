# R Sidecar for RATTE-Compatible Text Analysis — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an R/Plumber sidecar service that provides RATTE-compatible sentence detection (OpenNLP), word tokenization (OpenNLP), and syllable counting (quanteda.textstats), then refactor the backend to consume it.

**Architecture:** A Plumber HTTP service running in Docker exposes `POST /analyze` which accepts raw text and returns sentences, words, and syllable counts. The Elysia backend calls this sidecar during `/calculate` requests and uses the returned arrays for all readability metric calculations. The sidecar is internal-only on the Docker network.

**Tech Stack:** R, Plumber, openNLP, openNLPmodels.de, quanteda, quanteda.textstats, Docker, Bun, Elysia, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-12-r-sidecar-text-analysis-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `r-sidecar/api.R` | Plumber API: `/analyze` and `/health` endpoints |
| Create | `r-sidecar/start.R` | Entry point: loads plumber, starts server on 0.0.0.0:8787 |
| Create | `Dockerfile.r-sidecar` | Multi-stage Docker build for the R sidecar |
| Create | `apps/backend/src/r-sidecar.ts` | HTTP client for calling the R sidecar |
| Create | `apps/backend/src/r-sidecar.test.ts` | Tests for sidecar client (mocked HTTP) |
| Create | `apps/backend/src/result.test.ts` | Tests for refactored metric functions |
| Modify | `apps/backend/src/result.ts` | Refactor all metric functions to accept pre-computed arrays |
| Modify | `apps/backend/src/index.ts` | Update `/calculate` route to handle sidecar errors (503) |
| Modify | `docker-compose.yml` | Add r-sidecar service for dev |
| Modify | `docker-compose-prod.yml` | Add r-sidecar service + backend depends_on |
| Modify | `.github/workflows/build.yml` | Add r-sidecar image build+push |
| Modify | `.github/workflows/deploy.yml` | No changes needed (deploys docker-compose-prod.yml as-is) |

---

## Chunk 1: R Sidecar Service

### Task 1: Create the Plumber API

**Files:**
- Create: `r-sidecar/api.R`
- Create: `r-sidecar/start.R`

- [ ] **Step 1: Create `r-sidecar/start.R`**

```r
library(plumber)

pr <- plumb("api.R")
pr$run(host = "0.0.0.0", port = 8787)
```

- [ ] **Step 2: Create `r-sidecar/api.R` with health endpoint**

```r
library(NLP)
library(openNLP)
library(quanteda)
library(quanteda.textstats)

# Load OpenNLP models once at startup
sent_annotator <- Maxent_Sent_Token_Annotator(language = "de")
word_annotator <- Maxent_Word_Token_Annotator(language = "de")

#* Health check
#* @get /health
function() {
  list(status = "ok")
}

#* Analyze text: sentence detection, word tokenization, syllable counting
#* @post /analyze
#* @serializer json
function(req) {
  body <- jsonlite::fromJSON(req$postBody)
  text <- body$text

  # Handle empty or whitespace-only text
  if (is.null(text) || trimws(text) == "") {
    return(list(
      sentences = list(),
      words = list(),
      syllablesPerWord = list()
    ))
  }

  # Convert to NLP String
  s <- as.String(text)

  # Sentence detection
  sent_annotations <- annotate(s, sent_annotator)
  sentences <- s[sent_annotations]

  # Word tokenization
  word_annotations <- annotate(s, word_annotator, sent_annotations)
  # Filter to word annotations only (not sentence annotations)
  word_annots <- word_annotations[word_annotations$type == "word"]
  words_raw <- s[word_annots]

  # Filter out punctuation tokens
  is_word <- grepl("[[:alnum:]]", words_raw)
  words <- words_raw[is_word]

  # Syllable counting via quanteda.textstats
  if (length(words) == 0) {
    return(list(
      sentences = as.list(as.character(sentences)),
      words = list(),
      syllablesPerWord = list()
    ))
  }

  tok <- tokens(paste(words, collapse = " "), what = "fastestword")
  syllable_counts <- nsyllable(tok)[[1]]

  list(
    sentences = as.list(as.character(sentences)),
    words = as.list(as.character(words)),
    syllablesPerWord = as.list(as.integer(syllable_counts))
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add r-sidecar/api.R r-sidecar/start.R
git commit -m "feat: add R/Plumber sidecar API for text analysis

OpenNLP for sentence detection and word tokenization,
quanteda.textstats for syllable counting. Models loaded
once at startup for performance."
```

---

### Task 2: Create the Dockerfile

**Files:**
- Create: `Dockerfile.r-sidecar`

- [ ] **Step 1: Create `Dockerfile.r-sidecar`**

```dockerfile
# ---------- Base image with R ----------
FROM rocker/r-ver:4.4.0 AS base
WORKDIR /app

# Install system dependencies (Java for OpenNLP, wget for healthcheck)
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends \
    default-jdk \
    libxml2-dev \
    libcurl4-openssl-dev \
    libssl-dev \
    wget \
  && rm -rf /var/lib/apt/lists/*

# Configure R to find Java
RUN R CMD javareconf

# ---------- Install R packages ----------
FROM base AS deps

# Install CRAN packages
RUN R -e "install.packages(c('plumber', 'jsonlite', 'NLP', 'openNLP', 'quanteda', 'quanteda.textstats'), repos='https://cloud.r-project.org/')"

# Install OpenNLP German models
RUN R -e "install.packages('openNLPmodels.de', repos='http://datacube.wu.ac.at/', type='source')"

# ---------- Runtime ----------
FROM deps AS runner
WORKDIR /app

COPY r-sidecar/ .

ENV PORT=8787
EXPOSE 8787

CMD ["Rscript", "start.R"]
```

- [ ] **Step 2: Test the Docker build locally**

Run: `docker build -f Dockerfile.r-sidecar -t r-sidecar:test .`
Expected: Build completes successfully (this may take several minutes on first build due to R package compilation)

- [ ] **Step 3: Test the container starts and responds**

Run:
```bash
docker run -d --name r-sidecar-test -p 8787:8787 r-sidecar:test
sleep 15  # Wait for model loading
curl http://localhost:8787/health
```
Expected: `{"status":"ok"}`

- [ ] **Step 4: Test the `/analyze` endpoint**

Run:
```bash
curl -X POST http://localhost:8787/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Der Hund läuft über die Straße. Die Katze schläft."}'
```
Expected: JSON with 2 sentences, word tokens (no punctuation), and syllable counts matching word count.

- [ ] **Step 5: Clean up test container and commit**

```bash
docker stop r-sidecar-test && docker rm r-sidecar-test
git add Dockerfile.r-sidecar
git commit -m "feat: add Dockerfile for R sidecar service

Multi-stage build with rocker/r-ver:4.4.0, Java JDK for
OpenNLP, and all required R packages pre-installed."
```

---

### Task 3: Add sidecar to Docker Compose

**Files:**
- Modify: `docker-compose.yml`
- Modify: `docker-compose-prod.yml`

- [ ] **Step 1: Add r-sidecar service to `docker-compose.yml` (dev)**

Add the following service after the `postgres` service:

```yaml
  r-sidecar:
    build:
      context: .
      dockerfile: Dockerfile.r-sidecar
    container_name: r-sidecar
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:8787/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    ports:
      - "8787:8787"
```

**Note for local dev:** The backend runs outside Docker (via `bun run dev`), so the sidecar port must be mapped to the host. Set `R_SIDECAR_URL=http://localhost:8787` in your `.env` file or shell environment when running the backend locally.

- [ ] **Step 2: Add r-sidecar service to `docker-compose-prod.yml`**

Add the following service block:

```yaml
  r-sidecar:
    image: ghcr.io/florianbieck/lesbarkeitsindex/r-sidecar:latest
    container_name: r-sidecar
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:8787/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    expose:
      - "8787"
```

Add `depends_on` to the `backend` service:

```yaml
  backend:
    depends_on:
      - postgres
      - r-sidecar
```

Change `depends_on` to use health condition:

```yaml
  backend:
    depends_on:
      postgres:
        condition: service_started
      r-sidecar:
        condition: service_healthy
```

- [ ] **Step 3: Add `R_SIDECAR_URL` environment variable to backend in `docker-compose-prod.yml`**

Add to the backend environment:

```yaml
      - R_SIDECAR_URL=http://r-sidecar:8787
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml docker-compose-prod.yml
git commit -m "feat: add r-sidecar to Docker Compose configs

Dev and prod compose files both include the R sidecar
service. Backend depends_on r-sidecar with service_healthy
condition. Health check uses wget with 60s start_period."
```

---

## Chunk 2: Backend Sidecar Client

### Task 4: Write tests for the sidecar client

**Files:**
- Create: `apps/backend/src/r-sidecar.test.ts`

- [ ] **Step 1: Write failing tests for `analyzeText`**

```ts
import { test, expect, describe, mock, beforeEach, afterEach } from "bun:test";

// We'll test the analyzeText function by mocking global fetch
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
      syllablesPerWord: [1, 2], // length mismatch
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
    // missing syllablesPerWord

    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify(incomplete), { status: 200 }))
    ) as typeof fetch;

    const { analyzeText } = await import("./r-sidecar");
    expect(analyzeText("Test.")).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/backend && bun test src/r-sidecar.test.ts`
Expected: FAIL — `r-sidecar` module does not exist yet.

- [ ] **Step 3: Commit failing tests**

```bash
git add apps/backend/src/r-sidecar.test.ts
git commit -m "test: add failing tests for R sidecar client

Tests cover: success response parsing, array length
validation, unreachable sidecar, non-200 status, and
missing response fields."
```

---

### Task 5: Implement the sidecar client

**Files:**
- Create: `apps/backend/src/r-sidecar.ts`

- [ ] **Step 1: Implement `analyzeText`**

```ts
const R_SIDECAR_URL = process.env.R_SIDECAR_URL ?? "http://r-sidecar:8787";
const TIMEOUT_MS = 30_000;

export type TextAnalysis = {
  readonly sentences: readonly string[];
  readonly words: readonly string[];
  readonly syllablesPerWord: readonly number[];
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
    !Array.isArray(data.syllablesPerWord)
  ) {
    throw new Error(
      "R sidecar response missing required fields: sentences, words, syllablesPerWord"
    );
  }

  if (data.words.length !== data.syllablesPerWord.length) {
    throw new Error(
      `R sidecar response mismatch: ${data.words.length} words but ${data.syllablesPerWord.length} syllable counts`
    );
  }

  return {
    sentences: data.sentences,
    words: data.words,
    syllablesPerWord: data.syllablesPerWord,
  };
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd apps/backend && bun test src/r-sidecar.test.ts`
Expected: All 5 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/r-sidecar.ts
git commit -m "feat: add R sidecar HTTP client

analyzeText() calls POST /analyze with 30s timeout,
validates response shape and array length consistency.
Throws clear errors on failure."
```

---

## Chunk 3: Backend Refactoring

### Task 6: Write tests for refactored metric functions

**Files:**
- Create: `apps/backend/src/result.test.ts`

- [ ] **Step 1: Write tests for metric functions with array inputs**

The tests use pre-computed arrays (as the sidecar would return) instead of raw text:

```ts
import { test, expect, describe } from "bun:test";
import {
  calculateCountWords,
  calculateCountPhrases,
  calculateSyllableComplexity,
  calculateMultiMemberedGraphemes,
  calculateRareGraphemes,
  calculateConsonantClusters,
  calculateAverageWordLength,
  calculateAverageSyllablesPerWord,
  calculateAveragePhraseLength,
  calculateAverageSyllablesPerPhrase,
  calculateProportionOfLongWords,
  calculateLix,
  calculateGsmog,
  calculateFleschKincaid,
  calculateWstf,
} from "./result";

const WORDS = ["Der", "Hund", "läuft", "über", "die", "Straße"];
const SENTENCES = ["Der Hund läuft über die Straße."];
const SYLLABLES = [1, 1, 1, 2, 1, 2];

describe("metric functions with pre-computed arrays", () => {
  test("calculateCountWords returns word count", () => {
    expect(calculateCountWords(WORDS)).toBe(6);
  });

  test("calculateCountWords returns 0 for empty array", () => {
    expect(calculateCountWords([])).toBe(0);
  });

  test("calculateCountPhrases returns sentence count", () => {
    expect(calculateCountPhrases(SENTENCES)).toBe(1);
  });

  test("calculateSyllableComplexity counts words with 3+ syllables", () => {
    // No words have 3+ syllables in our test data
    expect(calculateSyllableComplexity(WORDS, SYLLABLES)).toBe(0);
    // Add a word with 3 syllables
    expect(calculateSyllableComplexity(["Ananas"], [3])).toBe(1);
  });

  test("calculateMultiMemberedGraphemes counts sch, ch, ck, ng", () => {
    expect(calculateMultiMemberedGraphemes(["Schule", "Dach"])).toBe(2);
  });

  test("calculateRareGraphemes counts ä, ö, ü, ß, c, q, x, y", () => {
    expect(calculateRareGraphemes(["Straße", "über"])).toBe(2); // ß from Straße, ü from über
  });

  test("calculateConsonantClusters counts initial clusters", () => {
    expect(calculateConsonantClusters(["Straße", "Sprache"])).toBe(2);
  });

  test("calculateAverageWordLength computes average char length", () => {
    const avg = calculateAverageWordLength(WORDS);
    const expected = (3 + 4 + 5 + 4 + 3 + 6) / 6;
    expect(avg).toBeCloseTo(expected, 5);
  });

  test("calculateAverageWordLength returns 0 for empty array", () => {
    expect(calculateAverageWordLength([])).toBe(0);
  });

  test("calculateAverageSyllablesPerWord computes average", () => {
    const avg = calculateAverageSyllablesPerWord(WORDS, SYLLABLES);
    const expected = (1 + 1 + 1 + 2 + 1 + 2) / 6;
    expect(avg).toBeCloseTo(expected, 5);
  });

  test("calculateAveragePhraseLength computes words per sentence", () => {
    const avg = calculateAveragePhraseLength(WORDS, SENTENCES);
    expect(avg).toBe(6);
  });

  test("calculateAverageSyllablesPerPhrase computes syllables per sentence", () => {
    const avg = calculateAverageSyllablesPerPhrase(SENTENCES, WORDS, SYLLABLES);
    expect(avg).toBeCloseTo(8 / 1, 5); // 8 total syllables / 1 sentence
  });

  test("calculateProportionOfLongWords counts words with 7+ chars", () => {
    // No words have 7+ chars in our test data
    expect(calculateProportionOfLongWords(WORDS)).toBe(0);
    expect(calculateProportionOfLongWords(["Kindergarten", "und"])).toBe(0.5);
  });

  test("calculateLix computes LIX score", () => {
    const lix = calculateLix(WORDS, SENTENCES);
    // LIX = (6/1) + (0 * 100 / 6) = 6.0 (no words > 6 chars in test)
    expect(lix).toBeCloseTo(6.0, 1);
  });

  test("calculateGsmog computes gSmog score", () => {
    const gsmog = calculateGsmog(WORDS, SENTENCES, SYLLABLES);
    // 0 words with 3+ syllables: sqrt(0 * 30 / 1) - 2 = -2
    expect(gsmog).toBeCloseTo(-2, 1);
  });

  test("calculateFleschKincaid computes FK score", () => {
    const fk = calculateFleschKincaid(WORDS, SENTENCES, SYLLABLES);
    // 0.39 * (6/1) + 11.8 * (8/6) - 15.59
    const expected = 0.39 * 6 + 11.8 * (8 / 6) - 15.59;
    expect(fk).toBeCloseTo(expected, 1);
  });

  test("calculateWstf computes WSTF score", () => {
    const wstf = calculateWstf(WORDS, SENTENCES, SYLLABLES);
    // 0.2656 * (6/1) + 0.2744 * (0/6) * 100 - 1.693
    const expected = 0.2656 * 6 + 0.2744 * 0 * 100 - 1.693;
    expect(wstf).toBeCloseTo(expected, 1);
  });

  test("all functions handle empty arrays without crashing", () => {
    expect(calculateCountWords([])).toBe(0);
    expect(calculateCountPhrases([])).toBe(0);
    expect(calculateSyllableComplexity([], [])).toBe(0);
    expect(calculateMultiMemberedGraphemes([])).toBe(0);
    expect(calculateRareGraphemes([])).toBe(0);
    expect(calculateConsonantClusters([])).toBe(0);
    expect(calculateAverageWordLength([])).toBe(0);
    expect(calculateAverageSyllablesPerWord([], [])).toBe(0);
    expect(calculateAveragePhraseLength([], [])).toBe(0);
    expect(calculateAverageSyllablesPerPhrase([], [], [])).toBe(0);
    expect(calculateProportionOfLongWords([])).toBe(0);
    expect(calculateLix([], [])).toBe(0);
    expect(calculateGsmog([], [], [])).toBe(0);
    expect(calculateFleschKincaid([], [], [])).toBe(0);
    expect(calculateWstf([], [], [])).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/backend && bun test src/result.test.ts`
Expected: FAIL — function signatures don't match yet (still expect `text: string`).

- [ ] **Step 3: Commit failing tests**

```bash
git add apps/backend/src/result.test.ts
git commit -m "test: add failing tests for refactored metric functions

Tests use pre-computed arrays (words, sentences,
syllablesPerWord) instead of raw text. Covers all
metric functions plus empty-array edge cases."
```

---

### Task 7: Refactor metric functions in result.ts

**Files:**
- Modify: `apps/backend/src/result.ts`

This is the largest task. Each function signature changes from `(text: string)` to accepting pre-computed arrays. The internal logic simplifies since splitting/syllable-counting is removed.

- [ ] **Step 1: Remove old helper functions and imports**

Delete these functions entirely from `result.ts`:
- `splitIntoWords(text: string)` (lines 11-32)
- `splitIntoPhrases(text: string)` (lines 37-42)
- `splitSentenceIntoWords(sentence: string)` (lines 47-57)
- `splitWordIntoSyllables(word: string)` (lines 62-78)
- `countSyllables(word: string)` (lines 84-90)
- `debugText(text: string)` (lines 550-602) — this function references removed functions and will cause compile errors if left in

Remove the import:
```ts
import {hyphenateSync as hyphenate} from 'hyphen/de';
```

Keep the imports for `Prisma`, `prisma`, and `createHash`.

Add the import:
```ts
import { analyzeText } from './r-sidecar';
```

- [ ] **Step 2: Refactor all metric functions**

Replace each function with its array-based version:

```ts
/*
    Anzahl Wörter
 */
export function calculateCountWords(words: readonly string[]): number {
    return words.length;
}

/*
    Silbenkomplexität (words with 3+ syllables)
 */
export function calculateSyllableComplexity(
    words: readonly string[],
    syllablesPerWord: readonly number[]
): number {
    let count = 0;
    for (let i = 0; i < words.length; i++) {
        if (syllablesPerWord[i] >= 3) {
            count++;
        }
    }
    return count;
}

/*
    mehrgliedrige Grapheme (sch, ch, ck, ng)
 */
export function calculateMultiMemberedGraphemes(words: readonly string[]): number {
    const multiGraphemeRegex = /(sch|ch|ck|ng)/gi;
    let totalCount = 0;

    for (const rawWord of words) {
        const word = rawWord.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
        if (!word) continue;

        const matches = word.match(multiGraphemeRegex);
        if (matches) {
            totalCount += matches.length;
        }
    }

    return totalCount;
}

/*
    seltene Grapheme (ä, ö, ü, ß, c, q, x, y)
 */
export function calculateRareGraphemes(words: readonly string[]): number {
    const rareGraphemeRegex = /[äöüÄÖÜßcqxyCQXY]/g;
    let totalCount = 0;

    for (const rawWord of words) {
        const word = rawWord.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
        if (!word) continue;

        const matches = word.match(rareGraphemeRegex);
        if (matches) {
            totalCount += matches.length;
        }
    }

    return totalCount;
}

/*
    Konsonantencluster (Str-, Spr-, etc.)
 */
export function calculateConsonantClusters(words: readonly string[]): number {
    const consonantClusterRegex = /\b(str|spr|schr|schw|pfl|phr|thr|kn|gn|qu)/gi;
    let totalCount = 0;

    for (const rawWord of words) {
        const word = rawWord.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
        if (!word) continue;

        const matches = word.match(consonantClusterRegex);
        if (matches) {
            totalCount += matches.length;
        }
    }

    return totalCount;
}

/*
    Durchschnittliche Wortlänge
 */
export function calculateAverageWordLength(words: readonly string[]): number {
    if (words.length === 0) return 0;

    let totalLength = 0;
    for (const word of words) {
        totalLength += word.length;
    }

    return totalLength / words.length;
}

/*
    ∅Silben/Wort
 */
export function calculateAverageSyllablesPerWord(
    words: readonly string[],
    syllablesPerWord: readonly number[]
): number {
    if (words.length === 0) return 0;

    let total = 0;
    for (const count of syllablesPerWord) {
        total += count;
    }

    return total / words.length;
}

/*
    Anzahl Sätze
 */
export function calculateCountPhrases(sentences: readonly string[]): number {
    return sentences.length;
}

/*
    Durchschnittliche Satzlänge (words per sentence)
 */
export function calculateAveragePhraseLength(
    words: readonly string[],
    sentences: readonly string[]
): number {
    if (sentences.length === 0) return 0;

    return Math.round(words.length / sentences.length * 100) / 100;
}

/*
    ∅Silben/Satz
 */
export function calculateAverageSyllablesPerPhrase(
    sentences: readonly string[],
    words: readonly string[],
    syllablesPerWord: readonly number[]
): number {
    if (sentences.length === 0) return 0;

    let totalSyllables = 0;
    for (const count of syllablesPerWord) {
        totalSyllables += count;
    }

    return totalSyllables / sentences.length;
}

/*
    Anteil an langen Wörtern
 */
export function calculateProportionOfLongWords(words: readonly string[]): number {
    if (words.length === 0) return 0;

    const LONG_WORD_MIN_LENGTH = 7;
    let longWordCount = 0;

    for (const rawWord of words) {
        const word = rawWord.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
        if (!word) continue;

        if (word.length >= LONG_WORD_MIN_LENGTH) {
            longWordCount++;
        }
    }

    return longWordCount / words.length;
}

/*
    LIX (Läsbarhetsindex)
    Formula: (Words / Sentences) + (Long Words * 100 / Words)
 */
export function calculateLix(
    words: readonly string[],
    sentences: readonly string[]
): number {
    const wordCount = words.length;
    if (wordCount === 0) return 0;

    const sentenceCount = Math.max(1, sentences.length);
    const LONG_WORD_MIN_LENGTH = 6;
    let longWordCount = 0;

    for (const word of words) {
        if (word.length > LONG_WORD_MIN_LENGTH) {
            longWordCount++;
        }
    }

    const lix = (wordCount / sentenceCount) + ((longWordCount * 100) / wordCount);
    return Math.round(lix * 100) / 100;
}

/*
    gSmog (German Simple Measure of Gobbledygook)
    Formula: √((Words with 3+ syllables × 30) / Sentences) - 2
 */
export function calculateGsmog(
    words: readonly string[],
    sentences: readonly string[],
    syllablesPerWord: readonly number[]
): number {
    const sentenceCount = sentences.length;
    if (sentenceCount === 0) return 0;

    let wordsWithThreeOrMoreSyllables = 0;
    for (const count of syllablesPerWord) {
        if (count >= 3) {
            wordsWithThreeOrMoreSyllables++;
        }
    }

    const gsmog = Math.sqrt((wordsWithThreeOrMoreSyllables * 30) / sentenceCount) - 2;
    return Math.round(gsmog * 100) / 100;
}

/*
    Flesch-Kincaid Index
    Formula: 0.39 * (Words / Sentences) + 11.8 * (Syllables / Words) - 15.59
 */
export function calculateFleschKincaid(
    words: readonly string[],
    sentences: readonly string[],
    syllablesPerWord: readonly number[]
): number {
    const wordCount = words.length;
    const sentenceCount = sentences.length;
    if (wordCount === 0 || sentenceCount === 0) return 0;

    let totalSyllables = 0;
    for (const count of syllablesPerWord) {
        totalSyllables += count;
    }

    const fk = 0.39 * (wordCount / sentenceCount) + 11.8 * (totalSyllables / wordCount) - 15.59;
    return Math.round(fk * 100) / 100;
}

/*
    WSTF (Wiener Sachtextformel - 4th Vienna Formula)
    Formula: 0.2656 * (Words / Sentences) + 0.2744 * (Words with 3+ syllables / Words) * 100 - 1.693
 */
export function calculateWstf(
    words: readonly string[],
    sentences: readonly string[],
    syllablesPerWord: readonly number[]
): number {
    const wordCount = words.length;
    const sentenceCount = sentences.length;
    if (wordCount === 0 || sentenceCount === 0) return 0;

    let wordsWithThreeOrMoreSyllables = 0;
    for (const count of syllablesPerWord) {
        if (count >= 3) {
            wordsWithThreeOrMoreSyllables++;
        }
    }

    const wstf = 0.2656 * (wordCount / sentenceCount) + 0.2744 * (wordsWithThreeOrMoreSyllables / wordCount) * 100 - 1.693;
    return Math.round(wstf * 100) / 100;
}
```

- [ ] **Step 3: Refactor `calculateIndex` to use sidecar**

Replace the `calculateIndex` function:

```ts
export async function calculateIndex(text: string, config: Config) {
    const { sentences, words, syllablesPerWord } = await analyzeText(text);

    const countWords = calculateCountWords(words);
    const countPhrases = calculateCountPhrases(sentences);
    const countMultipleWords = countPhrases; // known bug, preserved for schema compat
    const countWordsWithComplexSyllables = calculateSyllableComplexity(words, syllablesPerWord);
    const countWordsWithConsonantClusters = calculateConsonantClusters(words);
    const countWordsWithMultiMemberedGraphemes = calculateMultiMemberedGraphemes(words);
    const countWordsWithRareGraphemes = calculateRareGraphemes(words);
    const averageWordLength = calculateAverageWordLength(words);
    const averageSyllablesPerWord = calculateAverageSyllablesPerWord(words, syllablesPerWord);
    const averagePhraseLength = calculateAveragePhraseLength(words, sentences);
    const averageSyllablesPerPhrase = calculateAverageSyllablesPerPhrase(sentences, words, syllablesPerWord);
    const proportionOfLongWords = calculateProportionOfLongWords(words);
    const proportionOfWordsWithComplexSyllables = countWords > 0 ? countWordsWithComplexSyllables / countWords : 0;
    const proportionOfWordsWithConsonantClusters = countWords > 0 ? countWordsWithConsonantClusters / countWords : 0;
    const proportionOfWordsWithMultiMemberedGraphemes = countWords > 0 ? countWordsWithMultiMemberedGraphemes / countWords : 0;
    const proportionOfWordsWithRareGraphemes = countWords > 0 ? countWordsWithRareGraphemes / countWords : 0;
    const lix = calculateLix(words, sentences);
    const gsmog = calculateGsmog(words, sentences, syllablesPerWord);
    const fleschKincaid = calculateFleschKincaid(words, sentences, syllablesPerWord);
    const wst4 = calculateWstf(words, sentences, syllablesPerWord);

    const llix =
        lix * config.parameterLix.toNumber() +
        proportionOfWordsWithComplexSyllables * config.parameterProportionOfWordsWithComplexSyllables.toNumber() +
        proportionOfWordsWithMultiMemberedGraphemes * config.parameterProportionOfWordsWithMultiMemberedGraphemes.toNumber() +
        proportionOfWordsWithRareGraphemes * config.parameterProportionOfWordsWithRareGraphemes.toNumber() +
        proportionOfWordsWithConsonantClusters * config.parameterProportionOfWordsWithConsonantClusters.toNumber();

    // Derive syllable-count word groupings from sidecar data
    const totalSyllables = syllablesPerWord.reduce((sum, c) => sum + c, 0);
    const wordsWithOneSyllable = words.filter((_, i) => syllablesPerWord[i] === 1);
    const wordsWithTwoSyllables = words.filter((_, i) => syllablesPerWord[i] === 2);
    const wordsWithThreeSyllables = words.filter((_, i) => syllablesPerWord[i] === 3);
    const wordsWithFourSyllables = words.filter((_, i) => syllablesPerWord[i] === 4);
    const wordsWithFiveSyllables = words.filter((_, i) => syllablesPerWord[i] === 5);

    // Generate syllable placeholder array (nsyllable returns counts, not strings)
    const syllablePlaceholders = words.flatMap((word, i) => {
        const count = syllablesPerWord[i];
        return Array.from({ length: count }, () => word);
    });

    return prisma.result.create({
        data: {
            countWords,
            countPhrases,
            countSyllables: totalSyllables,
            countMultipleWords,
            countWordsWithComplexSyllables,
            countWordsWithConsonantClusters,
            countWordsWithMultiMemberedGraphemes,
            countWordsWithRareGraphemes,
            countWordsWithOneSyllable: wordsWithOneSyllable.length,
            countWordsWithTwoSyllable: wordsWithTwoSyllables.length,
            countWordsWithThreeSyllable: wordsWithThreeSyllables.length,
            countWordsWithFourSyllable: wordsWithFourSyllables.length,
            countWordsWithFiveSyllable: wordsWithFiveSyllables.length,
            averageWordLength,
            averageSyllablesPerWord,
            averagePhraseLength,
            averageSyllablesPerPhrase,
            proportionOfLongWords,
            proportionOfWordsWithComplexSyllables,
            proportionOfWordsWithConsonantClusters,
            proportionOfWordsWithMultiMemberedGraphemes,
            proportionOfWordsWithRareGraphemes,
            lix,
            ratte: 0,
            ratteLevel: 0,
            gsmog,
            wst4,
            fleschKincaid,
            score: llix,
            scoreLevel: 0,
            text,
            words: [...words],
            wordsWithOneSyllable,
            wordsWithTwoSyllables,
            wordsWithThreeSyllables,
            wordsWithFourSyllables,
            wordsWithFiveSyllables,
            phrases: [...sentences],
            syllables: syllablePlaceholders,
            hashText: createHash('sha256').update(text, 'utf8').digest('hex'),
            configId: config.id,
        },
        include: {
            config: true
        }
    });
}
```

- [ ] **Step 4: Run the metric function tests**

Run: `cd apps/backend && bun test src/result.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Run sidecar client tests too**

Run: `cd apps/backend && bun test src/r-sidecar.test.ts`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/result.ts
git commit -m "refactor: use R sidecar for text analysis in result.ts

Remove splitIntoWords, splitIntoPhrases, countSyllables,
and hyphen/de dependency. All metric functions now accept
pre-computed arrays from the R sidecar. calculateIndex
calls analyzeText() and derives all metrics from the
returned sentences, words, and syllablesPerWord arrays."
```

---

### Task 8: Update the /calculate route for sidecar errors

**Files:**
- Modify: `apps/backend/src/index.ts`

- [ ] **Step 1: Add 503 error handling for sidecar failures**

Update the `/calculate` route in `index.ts`:

```ts
    .post("/calculate", async ({ body, status }) => {
        const config = await prisma.config.findFirst({
            orderBy: {
                createdAt: 'desc'
            }
        });
        if (!config) return status(500);
        try {
            const result = await calculateIndex(body.text, config);
            if (!result) return status(500);
            return result;
        } catch (error) {
            console.error("Calculation failed:", error instanceof Error ? error.message : error);
            if (error instanceof Error && error.message.includes("R sidecar")) {
                return status(503);
            }
            return status(500);
        }
    }, {
        body: t.Object({
            text: t.String()
        })
    })
```

- [ ] **Step 2: Remove the `debugText` import if present**

Remove `debugText` from the import in `index.ts` (line 7: `import {calculateIndex, debugText} from "./result"` → `import {calculateIndex} from "./result"`).

- [ ] **Step 3: Write a test for the 503 behavior**

Add to `apps/backend/src/index.test.ts` (create if it doesn't exist):

```ts
import { test, expect, describe, mock, afterEach } from "bun:test";

describe("POST /calculate error handling", () => {
  test("returns 503 when R sidecar is unreachable", async () => {
    // The sidecar is not running locally, so this should fail
    const response = await fetch("http://localhost:3000/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Test." }),
    });

    // Without a running sidecar, we expect 503
    expect(response.status).toBe(503);
  });
});
```

**Note:** This test requires the backend to be running locally without a sidecar. Run it manually during integration testing (Task 11). It's documented here for completeness.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/index.ts
git commit -m "feat: return 503 when R sidecar is unreachable

The /calculate endpoint catches sidecar errors and returns
503 Service Unavailable instead of a generic 500."
```

---

## Chunk 4: CI/CD

### Task 9: Add r-sidecar to CI/CD pipeline

**Files:**
- Modify: `.github/workflows/build.yml`

- [ ] **Step 1: Add Docker metadata extraction for r-sidecar**

Add after the frontend metadata step:

```yaml
      - name: Extract Docker r-sidecar metadata
        id: meta-r-sidecar
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/r-sidecar
          tags: |
            type=sha
            type=ref,event=branch
            type=ref,event=tag
            type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}
```

- [ ] **Step 2: Add build-and-push step for r-sidecar**

Add after the frontend build step:

```yaml
      - name: Build and push r-sidecar
        uses: docker/build-push-action@v6
        with:
          context: .
          file: ./Dockerfile.r-sidecar
          platforms: ${{ github.ref == 'refs/heads/main' && 'linux/amd64,linux/arm64' || 'linux/amd64' }}
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta-r-sidecar.outputs.tags }}
          labels: ${{ steps.meta-r-sidecar.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/build.yml
git commit -m "ci: add r-sidecar Docker image build and push

R sidecar image is built and pushed to GHCR alongside
backend and frontend images. Multi-platform support
(amd64/arm64) on main branch."
```

---

### Task 10: Remove hyphen dependency from backend

**Files:**
- Modify: `apps/backend/package.json`

- [ ] **Step 1: Remove hyphen and @types/hyphen**

Run: `cd apps/backend && bun remove hyphen @types/hyphen`

- [ ] **Step 2: Verify build still works**

Run: `cd apps/backend && bun run start` (or just check that TypeScript compilation succeeds with `bunx tsc --noEmit`)
Expected: No import errors. The `hyphen/de` import was removed in Task 7.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/package.json bun.lock
git commit -m "chore: remove hyphen dependency from backend

No longer needed — syllable counting is handled by the
R sidecar via quanteda.textstats."
```

---

### Task 11: Integration test with Docker Compose

- [ ] **Step 1: Start the full stack locally**

Run:
```bash
docker compose up --build -d
```

Wait for all services to be healthy:
```bash
docker compose ps
```
Expected: `r-sidecar` shows `healthy`, `postgres` is running.

- [ ] **Step 2: Test the sidecar directly**

```bash
curl http://localhost:8787/health
curl -X POST http://localhost:8787/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Der Hund läuft über die Straße. Die Katze schläft auf dem Sofa."}'
```

Expected: Health returns ok. Analyze returns 2 sentences, word tokens, syllable counts.

- [ ] **Step 3: Test the backend /calculate endpoint**

```bash
curl -X POST http://localhost:3000/calculate \
  -H "Content-Type: application/json" \
  -d '{"text": "Der Hund läuft über die Straße. Die Katze schläft auf dem Sofa."}'
```

Expected: Full readability result with all metrics computed.

- [ ] **Step 4: Test sidecar-down scenario**

```bash
docker compose stop r-sidecar
curl -X POST http://localhost:3000/calculate \
  -H "Content-Type: application/json" \
  -d '{"text": "Test."}'
```

Expected: 503 status code.

```bash
docker compose start r-sidecar
```

- [ ] **Step 5: Tear down**

```bash
docker compose down
```

- [ ] **Step 6: Final commit with any fixes**

If any fixes were needed during integration testing, commit them:

```bash
git add -A
git commit -m "fix: integration test fixes for r-sidecar setup"
```
