# R Sidecar for RATTE-Compatible Text Analysis

**Date:** 2026-03-12
**Status:** Draft

## Problem

The backend uses the `hyphen/de` library for German syllable counting, which performs typographic hyphenation rather than linguistic syllabification. This produces different results compared to the RATTE 2 tool (Regensburger Analysetool für Texte), which uses R packages `quanteda.textstats` for syllable counting and `openNLP` for sentence/word tokenization. The `minWordLength: 5` setting further skews results by treating all short words as single-syllable.

## Goal

Add an R-based sidecar service that replicates RATTE 2's text analysis pipeline, providing the backend with RATTE-compatible sentence detection, word tokenization, and syllable counts.

## Architecture

### Data Flow

```
User -> Elysia backend (POST /calculate)
          -> R sidecar (POST /analyze) with raw text
          <- Returns: { sentences[], words[], syllablesPerWord[] }
        -> Backend computes readability metrics using R's results
        -> Stores result in PostgreSQL
        <- Returns result to user
```

### Components

1. **R Sidecar** — Plumber HTTP service (internal only, port 8787)
2. **Elysia Backend** — Refactored to consume sidecar output instead of local text splitting
3. **Docker Compose** — Sidecar added as internal service on the Docker network

## R Sidecar Service

### R Packages (matching RATTE 2)

| Package | Version in RATTE 2 | Purpose |
|---|---|---|
| `openNLP` | 0.2.7 | Sentence detection, word tokenization |
| `openNLPmodels.de` | — | German-trained models for OpenNLP |
| `NLP` | — | Infrastructure for openNLP |
| `quanteda` | 2.1.2 | Text corpus handling |
| `quanteda.textstats` | 0.92 | Syllable counting via `nsyllable()` |
| `plumber` | — | HTTP API framework |

### API Contract

#### `POST /analyze`

Request:

```json
{
  "text": "Der Hund läuft über die Straße."
}
```

Response:

```json
{
  "sentences": [
    "Der Hund läuft über die Straße."
  ],
  "words": ["Der", "Hund", "läuft", "über", "die", "Straße"],
  "syllablesPerWord": [1, 1, 1, 2, 1, 2]
}
```

- `sentences` — Array of sentence strings from OpenNLP sentence detector
- `words` — Array of word tokens from OpenNLP tokenizer. Punctuation tokens are filtered. Compound words with hyphens (e.g., "Schul-Aufgabe") are kept as single tokens — OpenNLP's tokenizer handles this based on its trained model
- `syllablesPerWord` — Syllable count per word from `quanteda.textstats::nsyllable()`, same order and length as `words`

**Note:** `nsyllable()` returns integer counts only, not syllable strings. The backend's stored `syllables` array field (which previously held syllable text fragments like `["Stra", "ße"]`) can no longer be populated with actual syllable strings. Instead, the `syllables` field will store the word text repeated once per syllable (e.g., a 3-syllable word "Ananas" produces `["Ananas", "Ananas", "Ananas"]`), and the per-syllable-count word groupings (`wordsWithOneSyllable`, etc.) will be derived by filtering the `words` array using `syllablesPerWord` counts.

**Empty text:** When `text` is empty or contains only whitespace/punctuation, the sidecar returns `{ "sentences": [], "words": [], "syllablesPerWord": [] }`. The backend's existing division-by-zero guards handle this.

#### `GET /health`

Returns `{ "status": "ok" }` for Docker health checks.

### Implementation

**File structure:**

```
r-sidecar/
  api.R        # Plumber API definition
  start.R      # Entry point, loads plumber and starts server
```

**Key behavior:**

- OpenNLP models (sentence detector, word tokenizer) are loaded once at startup and reused across requests to avoid the ~2-3 second model loading penalty per request
- Punctuation tokens are filtered from the word list before syllable counting
- The `nsyllable()` function is called on each word token to get syllable counts

## Backend Refactoring

### New File: `apps/backend/src/r-sidecar.ts`

Exports an `analyzeText(text: string)` function that:

1. Sends `POST ${R_SIDECAR_URL}/analyze` with `{ text }` body
2. Validates response shape: all three arrays present, `syllablesPerWord.length === words.length`
3. Returns typed result: `{ sentences: string[], words: string[], syllablesPerWord: number[] }`
4. Throws on sidecar unreachable or invalid response
5. HTTP timeout: 30 seconds per request

The sidecar URL is configured via the `R_SIDECAR_URL` environment variable (default: `http://r-sidecar:8787`).

### Changes to `apps/backend/src/result.ts`

**Removed functions:**

- `splitIntoWords()` — replaced by sidecar `words` array
- `splitIntoPhrases()` — replaced by sidecar `sentences` array
- `splitWordIntoSyllables()` — replaced by sidecar `syllablesPerWord` array
- `splitSentenceIntoWords()` — replaced by sidecar data
- `countSyllables()` — replaced by sidecar `syllablesPerWord`

**Refactored function signatures:**

All metric functions change from `(text: string)` to receiving pre-computed arrays:

- `calculateCountWords(words)` — returns `words.length`
- `calculateCountPhrases(sentences)` — returns `sentences.length`
- `calculateSyllableComplexity(words, syllablesPerWord)` — counts words with 3+ syllables (uses syllable count from sidecar, resolving the existing mismatch where the function comment said "vowel groups" but implementation used `countSyllables()`)
- `calculateMultiMemberedGraphemes(words)` — operates on word array (logic unchanged)
- `calculateRareGraphemes(words)` — operates on word array (logic unchanged)
- `calculateConsonantClusters(words)` — operates on word array (logic unchanged)
- `calculateAverageWordLength(words)` — average character length from word array
- `calculateAverageSyllablesPerWord(words, syllablesPerWord)` — uses syllable array
- `calculateAveragePhraseLength(words, sentences)` — uses both arrays
- `calculateAverageSyllablesPerPhrase(sentences, words, syllablesPerWord)` — uses all three
- `calculateProportionOfLongWords(words)` — counts words with 7+ characters
- `calculateLix(words, sentences)` — uses word/sentence arrays
- `calculateGsmog(words, sentences, syllablesPerWord)` — uses all three
- `calculateFleschKincaid(words, sentences, syllablesPerWord)` — uses all three
- `calculateWstf(words, sentences, syllablesPerWord)` — uses all three

**`calculateIndex()` changes:**

1. Calls `analyzeText(text)` to get `{ sentences, words, syllablesPerWord }`
2. Passes the arrays to each metric function
3. Derives per-syllable-count word groupings from `words` + `syllablesPerWord` (e.g., `wordsWithOneSyllable = words.filter((_, i) => syllablesPerWord[i] === 1)`)
4. Rest of the logic (Prisma create, LLIX calculation) stays the same

**Bug fix:** The existing `countMultipleWords` field is assigned `calculateCountPhrases(text)` — the same value as `countPhrases`. This is a copy-paste bug. It will be preserved as-is to avoid schema changes but noted for future cleanup.

### Error Handling

- If the sidecar is unreachable, the `/calculate` endpoint returns `503 Service Unavailable`
- No silent fallback to old TypeScript logic — consistency with RATTE is the goal
- Response validation ensures `syllablesPerWord.length === words.length`

## Docker & Deployment

### New File: `Dockerfile.r-sidecar`

Multi-stage build using `rocker/r-ver`:

1. Install system dependencies (Java JDK for OpenNLP)
2. Install R packages: `plumber`, `openNLP`, `openNLPmodels.de`, `NLP`, `quanteda`, `quanteda.textstats`
3. Copy `r-sidecar/` directory
4. Entry point: `Rscript start.R`
5. Expose port 8787

### docker-compose-prod.yml

```yaml
r-sidecar:
  build:
    context: .
    dockerfile: Dockerfile.r-sidecar
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "wget", "--spider", "-q", "http://localhost:8787/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 60s
```

The backend service adds a dependency on the sidecar:

```yaml
backend:
  depends_on:
    r-sidecar:
      condition: service_healthy
```

No ports exposed externally. The backend reaches it via Docker internal DNS at `http://r-sidecar:8787`.

**Note:** The healthcheck uses `wget` instead of `curl` because `rocker/r-ver` images may not include `curl`. The `start_period: 60s` allows time for R package and OpenNLP model loading on first startup.

### docker-compose.yml (dev)

Same service definition for local development.

### Caddy

No changes needed. The sidecar is internal-only.

### CI/CD

The GitHub Actions `build.yml` gets a third image build step for `r-sidecar`, pushed to GHCR alongside `backend` and `frontend`.

## What Stays the Same

- All readability formulas (LIX, gSmog, Flesch-Kincaid, WSTF, LLIX) — pure math, stays in TypeScript
- Grapheme analysis (multi-membered graphemes, rare graphemes, consonant clusters) — logic unchanged, just receives `words` array from sidecar instead of self-splitting
- Prisma schema and database — no changes
- Frontend — no changes
- Authentication — no changes
- API contract for `/calculate` endpoint — response shape unchanged

## Future Considerations

- POS tagging via OpenNLP (STTS tagset) for ProNIndex, subordinate clause detection
- TTR/MATTR calculation via quanteda.textstats
- childLex corpus integration for rare word detection
