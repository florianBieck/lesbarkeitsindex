# Ponytail Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove ~660 lines and 7 dependencies of confirmed over-engineering (dead code, hand-rolled stdlib, single-implementation abstractions, CI/Docker duplication) across the whole monorepo, with zero behavior change.

**Architecture:** 33 tasks (0–32) in five ordered groups plus bookends: Task 0 branches and commits the pre-existing pnpm bump; backend computation + schema + api-client first (Tasks 1–11, the coupled core), then backend infra (12–15), frontend (16–21), R sidecar + scripts (22–23), CI/Docker/root manifests (24–31); Task 32 sweeps stale docs and runs the full build/type gates. Every task is a deletion or an inlining verified by the existing test suites; the only new artifacts are two small Vue components extracted from duplicated markup and one Prisma migration dropping six dead columns.

**Tech Stack:** pnpm monorepo · NestJS/Fastify + Prisma 7 + Zod (backend) · Nuxt 4 + PrimeVue 4 (frontend) · R plumber sidecar (Docker) · Vitest everywhere · Playwright e2e · GitHub Actions → ghcr.io · Docker Compose + Caddy (prod).

## Global Constraints

- All work happens on branch `chore/ponytail-audit` off `main` (created in Task 0).
- **Zero behavior change.** Every task must leave the relevant test suite green; where a task touches assertion-covered behavior, tests are updated first (red → green). No drive-by fixes: bugs noticed along the way get reported, not fixed.
- **Never use `vp`** — it is a shell function unavailable in non-interactive shells. Use `pnpm` directly:
  - Backend unit tests: `pnpm --filter backend run test`
  - Backend e2e (needs `docker compose up -d` stack + root `.env`): `pnpm --filter backend run test:e2e`
  - Frontend unit tests: `pnpm --filter frontend run test:unit`
  - Prisma: `pnpm --filter backend exec prisma generate`; migrations are hand-written SQL applied with `pnpm --filter backend exec prisma migrate deploy` (`migrate dev` refuses non-interactive shells — Task 1 shows the exact procedure; needs `docker compose up -d --wait postgres`)
- After any dependency change: `pnpm install` before running tests.
- After any Prisma schema change: `pnpm --filter backend exec prisma generate` (client generates into `apps/backend/src/generated/` — gitignored).
- UI copy stays German; keep German code comments where a file's existing style is German.
- Commit per task, conventional-commits style. Every commit message body ends with:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- Do NOT touch: `Result.readingUnit`, `Result.detectedTextType` (consumed by `docs/calibration/run-calibration.mjs`), the deliberately duplicated `detectTextType` in api-client vs backend, or anything under `apps/backend/src/generated/`.

## Findings → Task Coverage Map

All 48 confirmed audit findings, their fix task, and estimated cut:

| ID | Finding (short) | Task | Δ lines | Δ deps |
|----|-----------------|------|---------|--------|
| F1 | config-weights form duplicated index.vue/admin.vue | 16 | −140 | |
| F2 | 3 copy-pasted CI build jobs → matrix | 27 | −80 | |
| F3 | e2e-r-sidecar job duplicates e2e-frontend | 26 | −63 | |
| F4 | 4 hand-rolled curl+sleep wait loops | 24 | −50 | |
| F5 | hand-rolled sidecar response validation → Zod | 12 | −28 | |
| F6 | manual imports vs Nuxt/PrimeVue auto-imports | 20 | −23 | |
| F7 | 4 dead digit-breakdown Result columns | 1 | −22 | |
| F8 | docker-compose-prod duplication → overlay merge | 28 | −22 | |
| F9 | 3 identical count loops + 5× strip regex | 3 | −20 | |
| F10 | toWebHeaders → better-auth fromNodeHeaders | 13 | −18 | |
| F11 | inline SVG logo duplicated login/logout | 17 | −18 | |
| F12 | calculateWordComplexity pack/unpack layer | 5 | −15 | |
| F13 | onlyBuiltDependencies duplicates allowBuilds | 31 | −11 | |
| F14 | dead `matches` arrays in text-features | 2 | −10 | |
| F15 | ComputeReadabilityOptions single-field bag | 7 | −10 | |
| F16 | 4 Caddyfile handle blocks → one matcher | 30 | −10 | |
| F17 | vacuous useAuthClient test | 21 | −9 | |
| F18 | defensive R POS extraction → openNLP idiom | 22 | −9 | |
| F19 | fabricated placeholder sentences array | 6 | −8 | |
| F20 | Quill editor as plain-text input → Textarea | 18 | −8 | −1 |
| F21 | container_name on all six services | 28 | −7 | |
| F22 | dead Result.hashText column + sha256 | 1 | −6 | |
| F23 | barrel `export *` for one spec's benefit | 8 | −6 | |
| F24 | api-client Zod schemas used only via z.infer | 10 | −6 | −1 |
| F25 | pnpm 10.33.0 pins drifted from packageManager | 25 | −6 | |
| F26 | dead ADMIN_EMAILS env + false CLAUDE.md gotcha | 25 | −5 | |
| F27 | unused `words` params in basic-metrics | 4 | −5 | |
| F28 | @nestjs/config used only to load .env | 14 | −4 | −1 |
| F29 | readingUnitForTextType one-line helper | 9 | −4 | |
| F30 | dead BETTER_AUTH_* env on unit-test CI job | 25 | −4 | |
| F31 | npm-style workspaces field (pnpm ignores it) | 31 | −4 | |
| F32 | 3 pointless named Docker stages | 29 | −4 | |
| F33 | hand-rolled pad() → String.padEnd | 23 | −4 | |
| F34 | dead Result.countPhrases column | 1 | −4 | |
| F35 | unreachable checks in calculateNumbers | 2 | −3 | |
| F36 | version/main/types manifest ceremony | 10 | −3 | |
| F37 | dayjs for one format call → toLocaleString | 19 | −2 | −1 |
| F38 | dead pagination flexibility in results.vue | 19 | −2 | |
| F39 | AuthGuard needlessly in providers/exports | 15 | −1 | |
| F40 | @HttpCode(OK) on a GET | 15 | −1 | |
| F41 | shadowed vitest exclude line | 15 | −1 | |
| F42 | TERMINAL_PUNCTUATION regex duplicated | 9 | −1 | |
| F43 | @nuxt/test-utils in prod deps + modules | 21 | −1 | |
| F44 | dotenv → process.loadEnvFile | 14 | −1 | −1 |
| F45 | @nestjs/schematics devDep shipped by CLI | 15 | −1 | −1 |
| F46 | ENV PORT=8787 nothing reads | 29 | −1 | |
| F47 | manual R JSON serializer wrappers | 22 | −1 | |
| F48 | ofetch dep — Nuxt ships it as $fetch | 11 | −0 | −1 |

**Total: ~−660 lines, −7 dependencies.**

## Execution Order & Risk Notes

Groups run in order — Tasks 1–11 (core: computation, schema, api-client), 12–15 (backend infra), 16–21 (frontend), 22–23 (R + scripts), 24–31 (CI/Docker/manifests). Within a group, tasks touching the same file assume earlier tasks in this plan already landed.

- Task 1 includes a **Prisma migration** (drops 6 columns) — destructive to existing `Result` rows' dead columns only; dev data loss is acceptable, production needs the migration deployed.
- Task 27 (CI matrix rewrite) is the **only task with real regression risk**; it pushes the branch and opens a **draft PR** to verify on a live CI run — do not merge before that run is green, and reuse that PR for the eventual review.
- Task 28 intentionally **changes the deploy workflow's behavior**: `deploy.yml` previously ran plain `docker compose pull/up`, which read only the dev `docker-compose.yml` — the prod overlay file was scp'd but never used. After Task 28 the workflow deploys the real prod stack via `-f docker-compose.yml -f docker-compose-prod.yml`. The overlay's `!reset` tags require **Docker Compose ≥ 2.24.4 on the deploy host** — check `docker compose version` there before the first prod deploy.
- Expect **one slow CI run** after Tasks 25/27/29: the Dockerfile edits invalidate the gha build-cache scopes (r-sidecar rebuild is ~20–30 min).
- pnpm 11 prints `[WARN] The "pnpm" field in package.json is no longer read` on every command until Task 31 removes the block — exit codes are unaffected; ignore it in log checks before then.
- Everything else is mechanical; if a task's suite goes red in a way its steps don't predict, stop and report rather than improvise.

Two deliberate micro-deviations from pure behavior-preservation, chosen and documented in their tasks: the alpha input on index.vue gains admin.vue's `:max="10"` (Task 16 unifies the duplicated form), and the results date format keeps de-DE's native comma (`02.07.2026, 14:30`, Task 19 — no test asserts the old shape).

---

### Task 0: Branch setup

**Covers findings:** none (preamble)

**Files:**
- Modify: none (git only — the working tree already contains uncommitted edits to `package.json` and `pnpm-workspace.yaml` from the pnpm 11.9.0 bump)

**Interfaces:**
- Consumes: nothing
- Produces: branch `chore/ponytail-audit` containing the committed pnpm-bump working-tree state that Task 31 later edits further

- [ ] **Step 1: Confirm the expected dirty state**

Run: `git status --short`
Expected output (exactly these two tracked modifications, nothing else staged):

```
 M package.json
 M pnpm-workspace.yaml
```

If other tracked files are modified, STOP and report — do not commit unknown changes.

- [ ] **Step 2: Create the branch**

Run: `git checkout -b chore/ponytail-audit`
Expected: `Switched to a new branch 'chore/ponytail-audit'`

- [ ] **Step 3: Commit the pre-existing pnpm bump**

```bash
git add package.json pnpm-workspace.yaml
git commit -m "chore: bump pnpm to 11.9.0 with allowBuilds map

Pre-existing working-tree change committed as-is so the audit
remediation starts from a clean tree; Task 31 dedupes the
now-redundant onlyBuiltDependencies block.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 4: Verify baseline is green**

Run: `pnpm install && pnpm --filter backend run test && pnpm --filter frontend run test:unit`
Expected: install exits 0; both Vitest suites PASS (this is the baseline every later task preserves).

---
## Section 1 — Core computation & API client

General notes for this section:

- All commands run from the repo root `C:/Users/info/projects/lesbarkeitsindex` (bash: `cd /c/Users/info/projects/lesbarkeitsindex`) unless stated otherwise.
- Backend unit suite: `pnpm --filter backend run test`. Frontend unit suite: `pnpm --filter frontend run test:unit`.
- Vitest does NOT type-check (SWC/esbuild transform only). Where a step says "expect PASS", it means the test assertions pass; type consistency is ensured by making all listed edits in the same task.
- Several source/spec files contain the German opening quote `„` (U+201E) and the ellipsis `…` — but the CLOSING quotes in `result.spec.ts` and the touched source files are plain ASCII `"` (e.g. `„Hallo"`), and one test string uses the six-character literal escape `\u2013` instead of an en dash. When applying Before/After edits, copy these characters exactly from the file on disk — never "normalize" in either direction.

### Task 1: Drop dead Result columns (countPhrases, digit buckets, hashText)

**Covers findings:** F7, F22, F34

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/20260702000000_drop_dead_result_columns/migration.sql`
- Modify: `apps/backend/src/calculate/result/text-features.ts`
- Modify: `apps/backend/src/calculate/result/index.ts`
- Modify: `packages/api-client/src/index.ts`
- Test: `apps/backend/src/calculate/result/result.spec.ts`
- Test: `apps/frontend/app/components/__tests__/result-view.test.ts`
- Test: `apps/frontend/app/pages/__tests__/index.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `calculateNumbers(words: readonly string[]): number` (in `text-features.ts`; the `NumberResult` type is deleted). `computeReadability(...)` return object no longer contains `countPhrases`, `countNumbersTwoDigit`, `countNumbersThreeDigit`, `countNumbersFourDigit`, `countNumbersFivePlusDigit`, `hashText`. Prisma `Result` model without those six columns. `resultDataSchema` (api-client) without those six fields.

Do NOT touch `Result.readingUnit` and `Result.detectedTextType` — `docs/calibration/run-calibration.mjs` reads them.

- [ ] **Step 1: Update the `calculateNumbers` spec block in `apps/backend/src/calculate/result/result.spec.ts` (failing test first)**

Before:
```ts
  describe('calculateNumbers', () => {
    test('detects 2-digit numbers', () => {
      const result = calculateNumbers(['Er', 'ist', '72', 'Jahre']);
      expect(result.count).toBe(1);
      expect(result.twoDigit).toBe(1);
    });

    test('detects 3-digit numbers', () => {
      const result = calculateNumbers(['Es', 'sind', '786', 'Meter']);
      expect(result.count).toBe(1);
      expect(result.threeDigit).toBe(1);
    });

    test('detects 4-digit numbers', () => {
      const result = calculateNumbers(['Im', 'Jahr', '2024']);
      expect(result.count).toBe(1);
      expect(result.fourDigit).toBe(1);
    });

    test('detects 5+ digit numbers', () => {
      const result = calculateNumbers(['87945', 'Einwohner']);
      expect(result.count).toBe(1);
      expect(result.fivePlusDigit).toBe(1);
    });

    test('detects numbers with dot separators', () => {
      const result = calculateNumbers(['5.289', 'Menschen']);
      expect(result.count).toBe(1);
      expect(result.fourDigit).toBe(1);
    });

    test('counts multiple numbers of different lengths', () => {
      const result = calculateNumbers(['72', 'und', '786', 'und', '2024']);
      expect(result.count).toBe(3);
      expect(result.twoDigit).toBe(1);
      expect(result.threeDigit).toBe(1);
      expect(result.fourDigit).toBe(1);
    });

    test('ignores single-digit numbers', () => {
      const result = calculateNumbers(['Er', 'hat', '5', 'Äpfel']);
      expect(result.count).toBe(0);
    });

    test('returns 0 for text without numbers', () => {
      const result = calculateNumbers(['Der', 'Hund', 'läuft']);
      expect(result.count).toBe(0);
    });

    test('returns 0 for empty array', () => {
      const result = calculateNumbers([]);
      expect(result.count).toBe(0);
    });
  });
```

After:
```ts
  describe('calculateNumbers', () => {
    test('detects 2-digit numbers', () => {
      expect(calculateNumbers(['Er', 'ist', '72', 'Jahre'])).toBe(1);
    });

    test('detects 3-digit numbers', () => {
      expect(calculateNumbers(['Es', 'sind', '786', 'Meter'])).toBe(1);
    });

    test('detects 4-digit numbers', () => {
      expect(calculateNumbers(['Im', 'Jahr', '2024'])).toBe(1);
    });

    test('detects 5+ digit numbers', () => {
      expect(calculateNumbers(['87945', 'Einwohner'])).toBe(1);
    });

    test('detects numbers with dot separators', () => {
      expect(calculateNumbers(['5.289', 'Menschen'])).toBe(1);
    });

    test('counts multiple numbers of different lengths', () => {
      expect(calculateNumbers(['72', 'und', '786', 'und', '2024'])).toBe(3);
    });

    test('ignores single-digit numbers', () => {
      expect(calculateNumbers(['Er', 'hat', '5', 'Äpfel'])).toBe(0);
    });

    test('returns 0 for text without numbers', () => {
      expect(calculateNumbers(['Der', 'Hund', 'läuft'])).toBe(0);
    });

    test('returns 0 for empty array', () => {
      expect(calculateNumbers([])).toBe(0);
    });
  });
```

- [ ] **Step 2: Update the `calculateNumbers` line in the empty-arrays test of `result.spec.ts`**

Before:
```ts
    expect(calculateAbbreviations([]).count).toBe(0);
    expect(calculateNumbers([]).count).toBe(0);
    expect(calculateSpecialCharacters('').count).toBe(0);
```

After:
```ts
    expect(calculateAbbreviations([]).count).toBe(0);
    expect(calculateNumbers([])).toBe(0);
    expect(calculateSpecialCharacters('').count).toBe(0);
```

- [ ] **Step 3: Remove the `countPhrases` assertions from `result.spec.ts` (4 occurrences)**

Edit 3a — Before:
```ts
    test('zählt den einzigen Satz (Satzzahl >= 1)', () => {
      const result = computeReadability(text, analysis, config);
      expect(result.countPhrases).toBe(1);
      expect(result.phrases).toEqual(['Der Hund läuft über die Straße.']);
    });
```
After:
```ts
    test('zählt den einzigen Satz (Satzzahl >= 1)', () => {
      const result = computeReadability(text, analysis, config);
      expect(result.phrases).toEqual(['Der Hund läuft über die Straße.']);
    });
```

Edit 3b — Before:
```ts
    test('der erste Satz zählt vollständig', () => {
      const result = computeReadability(text, analysis, config);
      expect(result.countPhrases).toBe(2);
      expect(result.countWords).toBe(8);
      expect(result.phrases).toEqual(['Das ist ein Satz.', 'Weiter geht es hier.']);
    });
```
After:
```ts
    test('der erste Satz zählt vollständig', () => {
      const result = computeReadability(text, analysis, config);
      expect(result.countWords).toBe(8);
      expect(result.phrases).toEqual(['Das ist ein Satz.', 'Weiter geht es hier.']);
    });
```

Edit 3c — Before:
```ts
    test('erkennt keinen Titel und zählt beide Sätze', () => {
      const result = computeReadability(text, analysis, config);
      expect(result.title).toBe('');
      expect(result.countPhrases).toBe(2);
      expect(result.countWords).toBe(9);
    });
```
After:
```ts
    test('erkennt keinen Titel und zählt beide Sätze', () => {
      const result = computeReadability(text, analysis, config);
      expect(result.title).toBe('');
      expect(result.phrases).toHaveLength(2);
      expect(result.countWords).toBe(9);
    });
```

Edit 3d — Before:
```ts
      const result = computeReadability(fullText, bodyOnlyAnalysis, config);
      expect(result.countWords).toBe(4);
      expect(result.countPhrases).toBe(1);
      expect(result.countSyllables).toBe(6);
```
After:
```ts
      const result = computeReadability(fullText, bodyOnlyAnalysis, config);
      expect(result.countWords).toBe(4);
      expect(result.countSyllables).toBe(6);
```

- [ ] **Step 4: Drop the `hashText` assertion and the now-unused `createHash` import from `result.spec.ts`**

Edit 4a — Before:
```ts
    test('text und hashText behalten den vollen Originaltext', () => {
      const result = computeReadability(fullText, bodyOnlyAnalysis, config);
      expect(result.text).toBe(fullText);
      expect(result.hashText).toBe(createHash('sha256').update(fullText, 'utf8').digest('hex'));
    });
```
After:
```ts
    test('text behält den vollen Originaltext', () => {
      const result = computeReadability(fullText, bodyOnlyAnalysis, config);
      expect(result.text).toBe(fullText);
    });
```

Edit 4b — Before:
```ts
import { createHash } from 'crypto';
import { test, expect, describe } from 'vitest';
```
After:
```ts
import { test, expect, describe } from 'vitest';
```

- [ ] **Step 5: Run the backend unit suite — expect FAIL**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run test
```
Expected: the `calculateNumbers` describe tests AND the shared `all functions handle empty arrays without crashing` test fail (the function still returns an object, so `toBe(...)` compares a number against `{ count: ... }`). Everything else passes.

- [ ] **Step 6: Make `calculateNumbers` return a plain count in `apps/backend/src/calculate/result/text-features.ts`**

Before:
```ts
/*
    Zahlen erkennen — categorized by digit count per PDF:
    - 2-digit: difficult for beginning readers
    - 3-digit: somewhat difficult
    - 4-digit: more difficult
    - 5+ digit: very difficult
    Numbers with dot separators (e.g. 5.289) are treated as one number,
    digits only counted (dots stripped).
    Single-digit numbers are ignored (not difficult).
 */
export type NumberResult = {
  count: number;
  twoDigit: number;
  threeDigit: number;
  fourDigit: number;
  fivePlusDigit: number;
};

export function calculateNumbers(words: readonly string[]): NumberResult {
  const result: NumberResult = {
    count: 0,
    twoDigit: 0,
    threeDigit: 0,
    fourDigit: 0,
    fivePlusDigit: 0,
  };
  if (words.length === 0) return result;
  for (const word of words) {
    // Match tokens that are purely numeric (with optional dot separators)
    const cleaned = word.replace(/[,;:!?]$/, '');
    if (!/^\d[\d.]*\d$|^\d{2,}$/.test(cleaned)) continue;
    const digitsOnly = cleaned.replace(/\./g, '');
    if (!/^\d+$/.test(digitsOnly)) continue;
    const len = digitsOnly.length;
    if (len < 2) continue;
    result.count++;
    if (len === 2) result.twoDigit++;
    else if (len === 3) result.threeDigit++;
    else if (len === 4) result.fourDigit++;
    else result.fivePlusDigit++;
  }
  return result;
}
```

After:
```ts
/*
    Zahlen erkennen — per PDF parameter list.
    Numbers with dot separators (e.g. 5.289) are treated as one number.
    Single-digit numbers are ignored (not difficult).
 */
export function calculateNumbers(words: readonly string[]): number {
  if (words.length === 0) return 0;
  let count = 0;
  for (const word of words) {
    // Match tokens that are purely numeric (with optional dot separators)
    const cleaned = word.replace(/[,;:!?]$/, '');
    if (!/^\d[\d.]*\d$|^\d{2,}$/.test(cleaned)) continue;
    const digitsOnly = cleaned.replace(/\./g, '');
    if (!/^\d+$/.test(digitsOnly)) continue;
    if (digitsOnly.length < 2) continue;
    count++;
  }
  return count;
}
```

- [ ] **Step 7: Remove the dead fields from `computeReadability` in `apps/backend/src/calculate/result/index.ts` (4 edits)**

Edit 7a (drop `createHash` import) — Before:
```ts
import { createHash } from 'crypto';
import type { TextAnalysis } from '../../r-sidecar/r-sidecar.service.js';
```
After:
```ts
import type { TextAnalysis } from '../../r-sidecar/r-sidecar.service.js';
```

Edit 7b (doc comment no longer mentions `hashText`) — Before:
```ts
 * und Fließtext selbst aus `text` ab und kann nie von der Analyse abweichen.
 * Ein erkannter Titel fließt in keine Kennzahl ein; `text` und `hashText`
 * behalten den vollen Originaltext inklusive Titel.
```
After:
```ts
 * und Fließtext selbst aus `text` ab und kann nie von der Analyse abweichen.
 * Ein erkannter Titel fließt in keine Kennzahl ein; `text` behält den vollen
 * Originaltext inklusive Titel.
```

Edit 7c (drop the `countPhrases` local and rename `numbers`) — Before:
```ts
  const countWords = words.length;
  const countPhrases = sentences.length;
```
After:
```ts
  const countWords = words.length;
```
and Before:
```ts
  const abbreviations = calculateAbbreviations(words);
  const numbers = calculateNumbers(words);
  const specialCharacters = calculateSpecialCharacters(bodyText);
```
After:
```ts
  const abbreviations = calculateAbbreviations(words);
  const countNumbers = calculateNumbers(words);
  const specialCharacters = calculateSpecialCharacters(bodyText);
```

Edit 7d (return object) — Before:
```ts
  return {
    countWords,
    countPhrases,
    countSyllables: totalSyllables,
```
After:
```ts
  return {
    countWords,
    countSyllables: totalSyllables,
```
and Before:
```ts
    countAbbreviations: abbreviations.count,
    countNumbers: numbers.count,
    countNumbersTwoDigit: numbers.twoDigit,
    countNumbersThreeDigit: numbers.threeDigit,
    countNumbersFourDigit: numbers.fourDigit,
    countNumbersFivePlusDigit: numbers.fivePlusDigit,
    countSpecialCharacters: specialCharacters.count,
```
After:
```ts
    countAbbreviations: abbreviations.count,
    countNumbers,
    countSpecialCharacters: specialCharacters.count,
```
and Before:
```ts
    phrases: [...sentences],
    hashText: createHash('sha256').update(text, 'utf8').digest('hex'),
    configId: config.id,
  };
```
After:
```ts
    phrases: [...sentences],
    configId: config.id,
  };
```

- [ ] **Step 8: Run the backend unit suite — expect PASS**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run test
```
Expected: all backend tests pass.

- [ ] **Step 9: Remove the six columns from the `Result` model in `apps/backend/prisma/schema.prisma` (3 edits)**

Edit 9a — Before:
```prisma
  countWords                                  Decimal
  countPhrases                                Decimal
  countSyllables                              Decimal
```
After:
```prisma
  countWords                                  Decimal
  countSyllables                              Decimal
```

Edit 9b — Before:
```prisma
  countAbbreviations                          Decimal
  countNumbers                                Decimal
  countNumbersTwoDigit                        Decimal
  countNumbersThreeDigit                      Decimal
  countNumbersFourDigit                       Decimal
  countNumbersFivePlusDigit                   Decimal
  countSpecialCharacters                      Decimal
```
After:
```prisma
  countAbbreviations                          Decimal
  countNumbers                                Decimal
  countSpecialCharacters                      Decimal
```

Edit 9c — Before:
```prisma
  phrases                                     String[]
  hashText                                    String
  config                                      Config   @relation(fields: [configId], references: [id])
```
After:
```prisma
  phrases                                     String[]
  config                                      Config   @relation(fields: [configId], references: [id])
```

- [ ] **Step 10: Create the migration file (hand-written, because `prisma migrate dev` refuses non-interactive shells)**

Create `apps/backend/prisma/migrations/20260702000000_drop_dead_result_columns/migration.sql` with this complete content. (An earlier migration `20260624000000_drop_dead_result_columns` already exists — it dropped a different, previous batch of dead columns. Prisma identifies migrations by the full timestamped folder name, so the repeated descriptive suffix is fine; do NOT touch the old folder.)

```sql
-- Drop dead Result columns (ponytail audit F7/F22/F34):
--   countPhrases:              written, never read (countReadingUnits is the used denominator)
--   countNumbersTwoDigit ..
--   countNumbersFivePlusDigit: digit-bucket breakdown, written, never read
--   hashText:                  sha256 of the input text, written, never read
-- DropColumn
ALTER TABLE "Result" DROP COLUMN "countPhrases",
DROP COLUMN "countNumbersTwoDigit",
DROP COLUMN "countNumbersThreeDigit",
DROP COLUMN "countNumbersFourDigit",
DROP COLUMN "countNumbersFivePlusDigit",
DROP COLUMN "hashText";
```

- [ ] **Step 11: Apply the migration and regenerate the Prisma client**

```bash
cd /c/Users/info/projects/lesbarkeitsindex
[ -f .env ] || cp .env.example .env  # apps/backend/prisma.config.ts loads DATABASE_URL from the repo-root .env; the working tree ships only .env.example (whose defaults match docker-compose)
docker compose up -d --wait postgres
pnpm --filter backend exec prisma migrate deploy
pnpm --filter backend exec prisma generate
```
Expected: `migrate deploy` applies `20260702000000_drop_dead_result_columns` (on a fresh database volume it applies all seven earlier migrations first); `generate` succeeds. (`src/generated/` is gitignored — nothing extra to commit from generate.)

- [ ] **Step 12: Remove the six fields from `resultDataSchema` in `packages/api-client/src/index.ts` (3 edits)**

Edit 12a — Before:
```ts
  countWords: z.number(),
  countPhrases: z.number(),
  countSyllables: z.number(),
```
After:
```ts
  countWords: z.number(),
  countSyllables: z.number(),
```

Edit 12b — Before:
```ts
  countAbbreviations: z.number(),
  countNumbers: z.number(),
  countNumbersTwoDigit: z.number(),
  countNumbersThreeDigit: z.number(),
  countNumbersFourDigit: z.number(),
  countNumbersFivePlusDigit: z.number(),
  countSpecialCharacters: z.number(),
```
After:
```ts
  countAbbreviations: z.number(),
  countNumbers: z.number(),
  countSpecialCharacters: z.number(),
```

Edit 12c — Before:
```ts
  phrases: z.array(z.string()),
  hashText: z.string(),
  config: configSchema,
```
After:
```ts
  phrases: z.array(z.string()),
  config: configSchema,
```

- [ ] **Step 13: Remove the dropped fields from the frontend fixtures (2 files, 3 edits each)**

In `apps/frontend/app/components/__tests__/result-view.test.ts`:

Edit 13a — Before:
```ts
  countWords: 8,
  countPhrases: 2,
  countSyllables: 13,
```
After:
```ts
  countWords: 8,
  countSyllables: 13,
```

Edit 13b — Before:
```ts
  countAbbreviations: 0,
  countNumbers: 0,
  countNumbersTwoDigit: 0,
  countNumbersThreeDigit: 0,
  countNumbersFourDigit: 0,
  countNumbersFivePlusDigit: 0,
  countSpecialCharacters: 0,
```
After:
```ts
  countAbbreviations: 0,
  countNumbers: 0,
  countSpecialCharacters: 0,
```

Edit 13c — Before:
```ts
  phrases: ['Igel sind nachtaktive Tiere.', 'Sie schlafen am Tag.'],
  hashText: 'abc123',
  config: makeConfig(),
```
After:
```ts
  phrases: ['Igel sind nachtaktive Tiere.', 'Sie schlafen am Tag.'],
  config: makeConfig(),
```

In `apps/frontend/app/pages/__tests__/index.test.ts`:

Edit 13d — Before:
```ts
  countWords: 4,
  countPhrases: 1,
  countSyllables: 4,
```
After:
```ts
  countWords: 4,
  countSyllables: 4,
```

Edit 13e — Before (identical block to 13b, in this file):
```ts
  countAbbreviations: 0,
  countNumbers: 0,
  countNumbersTwoDigit: 0,
  countNumbersThreeDigit: 0,
  countNumbersFourDigit: 0,
  countNumbersFivePlusDigit: 0,
  countSpecialCharacters: 0,
```
After:
```ts
  countAbbreviations: 0,
  countNumbers: 0,
  countSpecialCharacters: 0,
```

Edit 13f — Before:
```ts
  phrases: [],
  hashText: 'h',
  config: DB_CONFIG,
```
After:
```ts
  phrases: [],
  config: DB_CONFIG,
```

- [ ] **Step 14: Run the frontend unit suite — expect PASS**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && pnpm --filter frontend run test:unit
```
Expected: all frontend unit tests pass.

- [ ] **Step 15: Verify no stragglers reference the dropped fields**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && grep -rn --exclude-dir=node_modules --exclude-dir=.nuxt --include='*.ts' --include='*.vue' --include='*.prisma' -E 'countNumbersTwoDigit|countNumbersThreeDigit|countNumbersFourDigit|countNumbersFivePlusDigit|hashText|countPhrases' apps packages | grep -v 'prisma/migrations' || echo CLEAN
```
Expected output: `CLEAN` (historical migration SQL files are the only remaining mentions and are excluded).

- [ ] **Step 16: Commit**

```bash
cd /c/Users/info/projects/lesbarkeitsindex
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/20260702000000_drop_dead_result_columns/migration.sql apps/backend/src/calculate/result/text-features.ts apps/backend/src/calculate/result/index.ts apps/backend/src/calculate/result/result.spec.ts packages/api-client/src/index.ts apps/frontend/app/components/__tests__/result-view.test.ts apps/frontend/app/pages/__tests__/index.test.ts
git commit -m "refactor: drop dead Result columns (countPhrases, digit buckets, hashText)" -m "Written on every calculate, read nowhere: countPhrases, the four
countNumbers*Digit breakdown counters and hashText. Drops the columns,
the digit bucketing in calculateNumbers (now returns a plain count) and
the sha256 assembly in computeReadability. readingUnit/detectedTextType
stay (consumed by docs/calibration/run-calibration.mjs)." -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 2: text-features tidy — plain counts, no dead matches, no unreachable checks

**Covers findings:** F14, F35

**Files:**
- Modify: `apps/backend/src/calculate/result/text-features.ts`
- Modify: `apps/backend/src/calculate/result/index.ts`
- Test: `apps/backend/src/calculate/result/result.spec.ts`

**Interfaces:**
- Consumes: `calculateNumbers(words: readonly string[]): number` (Task 1 state of `text-features.ts`)
- Produces: `calculateAbbreviations(words: readonly string[]): number`, `calculateSpecialCharacters(text: string): number`

- [ ] **Step 1: Update the `calculateAbbreviations` spec block in `result.spec.ts` (failing test first)**

Before:
```ts
  describe('calculateAbbreviations', () => {
    test('detects unit abbreviations', () => {
      const result = calculateAbbreviations(['5', 'km', 'und', '3', 'kg']);
      expect(result.count).toBe(2);
    });

    test('detects common abbreviations with dots', () => {
      const result = calculateAbbreviations(['z.B.', 'ist', 'd.h.', 'gut']);
      expect(result.count).toBe(2);
    });

    test('detects acronyms', () => {
      const result = calculateAbbreviations(['Die', 'EU', 'und', 'USA']);
      expect(result.count).toBe(2);
    });

    test('detects mixed abbreviation types', () => {
      const result = calculateAbbreviations(['Die', 'EU', 'hat', 'ca.', '5', 'km']);
      expect(result.count).toBe(3);
    });

    test('returns 0 for text without abbreviations', () => {
      const result = calculateAbbreviations(['Der', 'Hund', 'läuft']);
      expect(result.count).toBe(0);
    });

    test('returns 0 for empty array', () => {
      const result = calculateAbbreviations([]);
      expect(result.count).toBe(0);
    });

    test('returns matched abbreviations list', () => {
      const result = calculateAbbreviations(['Die', 'EU', 'hat', 'ca.', '5', 'km']);
      expect(result.matches).toContain('EU');
      expect(result.matches).toContain('ca.');
      expect(result.matches).toContain('km');
    });
  });
```

After:
```ts
  describe('calculateAbbreviations', () => {
    test('detects unit abbreviations', () => {
      expect(calculateAbbreviations(['5', 'km', 'und', '3', 'kg'])).toBe(2);
    });

    test('detects common abbreviations with dots', () => {
      expect(calculateAbbreviations(['z.B.', 'ist', 'd.h.', 'gut'])).toBe(2);
    });

    test('detects acronyms', () => {
      expect(calculateAbbreviations(['Die', 'EU', 'und', 'USA'])).toBe(2);
    });

    test('detects mixed abbreviation types', () => {
      expect(calculateAbbreviations(['Die', 'EU', 'hat', 'ca.', '5', 'km'])).toBe(3);
    });

    test('returns 0 for text without abbreviations', () => {
      expect(calculateAbbreviations(['Der', 'Hund', 'läuft'])).toBe(0);
    });

    test('returns 0 for empty array', () => {
      expect(calculateAbbreviations([])).toBe(0);
    });
  });
```

- [ ] **Step 2: Update the `calculateSpecialCharacters` spec block in `result.spec.ts`**

CAUTION: the quotation-marks test mixes a typographic opening quote „ with a plain ASCII closing " inside the single-quoted string, and the em-dash test uses the six-character literal escape `\u2013` (not an actual dash) — copy both exactly from the file.

Before:
```ts
  describe('calculateSpecialCharacters', () => {
    test('counts question and exclamation marks', () => {
      expect(calculateSpecialCharacters('Was ist das? Toll!').count).toBe(2);
    });

    test('counts quotation marks (German style)', () => {
      expect(calculateSpecialCharacters('Er sagte: „Hallo"').count).toBe(2);
    });

    test('counts parentheses', () => {
      expect(calculateSpecialCharacters('Der Hund (groß) läuft').count).toBe(2);
    });

    test('counts special symbols (%, &, §, #, @)', () => {
      expect(calculateSpecialCharacters('50% & §1 #tag @user').count).toBe(5);
    });

    test('counts em-dash and slash', () => {
      expect(calculateSpecialCharacters('gut \u2013 schlecht und/oder').count).toBe(2);
    });

    test('does NOT count period, comma, colon, semicolon', () => {
      expect(calculateSpecialCharacters('Der Hund, die Katze; und: der Vogel.').count).toBe(0);
    });

    test('returns 0 for empty string', () => {
      expect(calculateSpecialCharacters('').count).toBe(0);
    });

    test('returns matched characters', () => {
      const result = calculateSpecialCharacters('50% (gut)');
      expect(result.matches).toContain('%');
      expect(result.matches).toContain('(');
      expect(result.matches).toContain(')');
    });
  });
```

After:
```ts
  describe('calculateSpecialCharacters', () => {
    test('counts question and exclamation marks', () => {
      expect(calculateSpecialCharacters('Was ist das? Toll!')).toBe(2);
    });

    test('counts quotation marks (German style)', () => {
      expect(calculateSpecialCharacters('Er sagte: „Hallo"')).toBe(2);
    });

    test('counts parentheses', () => {
      expect(calculateSpecialCharacters('Der Hund (groß) läuft')).toBe(2);
    });

    test('counts special symbols (%, &, §, #, @)', () => {
      expect(calculateSpecialCharacters('50% & §1 #tag @user')).toBe(5);
    });

    test('counts em-dash and slash', () => {
      expect(calculateSpecialCharacters('gut \u2013 schlecht und/oder')).toBe(2);
    });

    test('does NOT count period, comma, colon, semicolon', () => {
      expect(calculateSpecialCharacters('Der Hund, die Katze; und: der Vogel.')).toBe(0);
    });

    test('returns 0 for empty string', () => {
      expect(calculateSpecialCharacters('')).toBe(0);
    });
  });
```

- [ ] **Step 3: Update the remaining `.count` calls in the empty-arrays test of `result.spec.ts`**

Before:
```ts
    expect(calculateAbbreviations([]).count).toBe(0);
    expect(calculateNumbers([])).toBe(0);
    expect(calculateSpecialCharacters('').count).toBe(0);
```
After:
```ts
    expect(calculateAbbreviations([])).toBe(0);
    expect(calculateNumbers([])).toBe(0);
    expect(calculateSpecialCharacters('')).toBe(0);
```

- [ ] **Step 4: Run the backend unit suite — expect FAIL**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run test
```
Expected: the `calculateAbbreviations` and `calculateSpecialCharacters` tests fail, as does the shared `all functions handle empty arrays without crashing` test (the functions still return `{ count, matches }` objects).

- [ ] **Step 5: Drop the `matches` arrays in `text-features.ts` (2 edits)**

Edit 5a — Before:
```ts
export function calculateAbbreviations(words: readonly string[]): {
  count: number;
  matches: string[];
} {
  if (words.length === 0) return { count: 0, matches: [] };
  const matches: string[] = [];
  for (const word of words) {
    const lower = word.toLowerCase().replace(/[,;:!?]$/, '');
    if (UNIT_ABBREVIATIONS.has(lower)) {
      matches.push(word);
    } else if (DOTTED_ABBREVIATIONS.has(lower)) {
      matches.push(word);
    } else if (ACRONYMS.has(word.replace(/[,;:!?]$/, ''))) {
      matches.push(word);
    }
  }
  return { count: matches.length, matches };
}
```
After:
```ts
export function calculateAbbreviations(words: readonly string[]): number {
  let count = 0;
  for (const word of words) {
    const lower = word.toLowerCase().replace(/[,;:!?]$/, '');
    if (
      UNIT_ABBREVIATIONS.has(lower) ||
      DOTTED_ABBREVIATIONS.has(lower) ||
      ACRONYMS.has(word.replace(/[,;:!?]$/, ''))
    ) {
      count++;
    }
  }
  return count;
}
```

Edit 5b — Before:
```ts
export function calculateSpecialCharacters(text: string): { count: number; matches: string[] } {
  if (!text) return { count: 0, matches: [] };
  const found = text.match(SPECIAL_CHAR_REGEX);
  if (!found) return { count: 0, matches: [] };
  return { count: found.length, matches: found };
}
```
After:
```ts
export function calculateSpecialCharacters(text: string): number {
  return (text.match(SPECIAL_CHAR_REGEX) ?? []).length;
}
```

- [ ] **Step 6: Remove the unreachable checks in `calculateNumbers` (`text-features.ts`)**

The gate regex `/^\d[\d.]*\d$|^\d{2,}$/` already guarantees: only digits and dots, digit at both ends, so after stripping dots the remainder is all digits and at least 2 of them. The `digitsOnly` re-test and the `len < 2` guard can never fire; the empty-array early return duplicates the loop's behavior.

Before:
```ts
export function calculateNumbers(words: readonly string[]): number {
  if (words.length === 0) return 0;
  let count = 0;
  for (const word of words) {
    // Match tokens that are purely numeric (with optional dot separators)
    const cleaned = word.replace(/[,;:!?]$/, '');
    if (!/^\d[\d.]*\d$|^\d{2,}$/.test(cleaned)) continue;
    const digitsOnly = cleaned.replace(/\./g, '');
    if (!/^\d+$/.test(digitsOnly)) continue;
    if (digitsOnly.length < 2) continue;
    count++;
  }
  return count;
}
```
After:
```ts
export function calculateNumbers(words: readonly string[]): number {
  let count = 0;
  for (const word of words) {
    // Purely numeric tokens (with optional dot separators): the pattern requires
    // a digit at both ends, so at least two digits remain after stripping dots.
    const cleaned = word.replace(/[,;:!?]$/, '');
    if (/^\d[\d.]*\d$|^\d{2,}$/.test(cleaned)) count++;
  }
  return count;
}
```

- [ ] **Step 7: Update the two call sites in `apps/backend/src/calculate/result/index.ts`**

Edit 7a — Before:
```ts
  const abbreviations = calculateAbbreviations(words);
  const countNumbers = calculateNumbers(words);
  const specialCharacters = calculateSpecialCharacters(bodyText);
```
After:
```ts
  const countAbbreviations = calculateAbbreviations(words);
  const countNumbers = calculateNumbers(words);
  const countSpecialCharacters = calculateSpecialCharacters(bodyText);
```

Edit 7b — Before:
```ts
    countAbbreviations: abbreviations.count,
    countNumbers,
    countSpecialCharacters: specialCharacters.count,
```
After:
```ts
    countAbbreviations,
    countNumbers,
    countSpecialCharacters,
```

- [ ] **Step 8: Run the backend unit suite — expect PASS**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run test
```
Expected: all backend tests pass.

- [ ] **Step 9: Commit**

```bash
cd /c/Users/info/projects/lesbarkeitsindex
git add apps/backend/src/calculate/result/text-features.ts apps/backend/src/calculate/result/index.ts apps/backend/src/calculate/result/result.spec.ts
git commit -m "refactor(backend): plain counts in text-features, drop unreachable checks" -m "calculateAbbreviations/calculateSpecialCharacters returned { count, matches }
but production only ever read .count — both return a number now.
calculateNumbers loses three checks its gate regex already guarantees." -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 3: grapheme-analysis collapse — filter one-liners, shared non-letter strip

**Covers findings:** F9

**Files:**
- Modify: `apps/backend/src/calculate/result/grapheme-analysis.ts`
- Modify: `apps/backend/src/calculate/result/basic-metrics.ts`
- Test: existing coverage in `apps/backend/src/calculate/result/result.spec.ts` and `word-complexity.spec.ts` (no spec changes)

**Interfaces:**
- Consumes: nothing
- Produces: `stripNonLetters(word: string): string` exported from `basic-metrics.ts`. Signatures of the three grapheme counters are unchanged.

Pure refactor with existing coverage: run the suite green before AND after.

- [ ] **Step 1: Run the backend unit suite — expect PASS (baseline)**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run test
```
Expected: all backend tests pass.

- [ ] **Step 2: Add the shared strip helper to `basic-metrics.ts` and use it there (3 edits)**

Edit 2a (insert at the very top of the file, before the first comment block) — Before:
```ts
/*
    Coverage: Anzahl der Wörter mit komplexen Silben (≥3 Silben), je Wort max. einmal.
```
After:
```ts
/** Alles außer deutschen Buchstaben (A–Z, Umlaute, ß). */
const NON_LETTERS = /[^A-Za-zÄÖÜäöüß]/g;

/** Entfernt alle Nicht-Buchstaben aus einem Wort — gemeinsamer Strip für alle Zähler. */
export function stripNonLetters(word: string): string {
  return word.replace(NON_LETTERS, '');
}

/*
    Coverage: Anzahl der Wörter mit komplexen Silben (≥3 Silben), je Wort max. einmal.
```

Edit 2b (`calculateAverageCharsPerSyllable`) — Before:
```ts
  for (let i = 0; i < words.length; i++) {
    const letters = words[i].replace(/[^A-Za-zÄÖÜäöüß]/g, '');
    totalChars += letters.length;
    totalSyllables += syllablesPerWord[i];
  }
```
After:
```ts
  for (let i = 0; i < words.length; i++) {
    const letters = stripNonLetters(words[i]);
    totalChars += letters.length;
    totalSyllables += syllablesPerWord[i];
  }
```

Edit 2c (`calculateProportionOfLongWords`) — Before:
```ts
  let longWordCount = 0;
  for (const rawWord of words) {
    const word = rawWord.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
    if (!word) continue;
    if (word.length >= LONG_WORD_MIN_LENGTH) {
      longWordCount++;
    }
  }
```
After:
```ts
  let longWordCount = 0;
  for (const rawWord of words) {
    if (stripNonLetters(rawWord).length >= LONG_WORD_MIN_LENGTH) {
      longWordCount++;
    }
  }
```

- [ ] **Step 3: Rewrite `apps/backend/src/calculate/result/grapheme-analysis.ts` — complete new file content**

Note the regexes lose their pointless `/g` flags (mandatory: `.test()` on a `/g` regex is stateful via `lastIndex` and would be a bug), and `rareGraphemeRegex` moves to module level.

```ts
import { stripNonLetters } from './basic-metrics.js';

/*
    Mehrgliedrige Grapheme — following Brügelmann (Br 10).

    Categories:
    1. Digraphs/trigraphs: sch, ch, ck, ng
    2. Diphthongs: ie, ei, eu, äu, au (au included per BL, contrary to Br who excludes it)
    3. sp/st at word beginning (treated as graphemes per Br 10, not consonant clusters)

    Order matters: longer patterns first to prevent partial matches
    (e.g., "sch" before "ch", "äu" before "au").
 */

// Digraphs/trigraphs + diphthongs — matched anywhere in the word
const graphemeRegex = /(sch|ch|ck|ng|äu|au|eu|ei|ie)/i;

// sp/st only at word beginning (syllable-onset grapheme per Br 10)
const onsetGraphemeRegex = /\b(sp|st)/i;

export function countWordsWithMultiMemberedGraphemes(words: readonly string[]): number {
  // Coverage: Anzahl der Wörter mit mindestens einem Vorkommen (je Wort max. einmal).
  return words.filter((rawWord) => {
    const word = stripNonLetters(rawWord);
    return graphemeRegex.test(word) || onsetGraphemeRegex.test(word);
  }).length;
}

/*
    seltene Grapheme (ä, ö, ü, ß, c, q, x, y)
 */
const rareGraphemeRegex = /[äöüÄÖÜßcqxyCQXY]/;

export function countWordsWithRareGraphemes(words: readonly string[]): number {
  // Coverage: Anzahl der Wörter mit mindestens einem seltenen Graphem (je Wort max. einmal).
  return words.filter((rawWord) => rareGraphemeRegex.test(stripNonLetters(rawWord))).length;
}

/*
    Konsonantencluster — following Brügelmann/BRELIX PDF parameter list.

    Two categories:
    1. Onset clusters (2+ consonant sounds at syllable/word beginning)
       - Excludes st/sp at onset (counted as multi-membered graphemes per Br 10)
    2. Coda clusters (3+ consonant sounds at syllable/word end)
       - Excludes patterns with only 2 sounds (tz, rk, rt, rch) and
         double consonants (only 1 sound)
       - ng counts as 1 sound, so "ngt" = 2 sounds (not a cluster)

    Longer patterns are listed first to prevent partial matches.
 */

// Onset: at word boundary — 2+ consonant sounds at syllable start
const onsetClusterRegex =
  /\b(schl|schm|schn|schr|str|spr|bl|br|cl|cr|dr|fl|fr|gl|gn|gr|kl|kn|kr|pf|pl|pr|tr)/i;

// Coda: at word boundary — 3+ consonant sounds at word/syllable end
// Ordered longest-first to avoid partial matches
const codaClusterRegex =
  /(rchst|mpfst|rbst|chst|chts|rcht|ckst|lfst|rfst|mpft|mpst|ngst|nkst|rnst|rbt|bst|ckt|dst|fst|rft|gst|lfs|mpf|mpt|nft|nkt|nst|nzt|rnt|rkt|rzt|rts|tzt)\b/i;

export function countWordsWithConsonantClusters(words: readonly string[]): number {
  // Coverage: Anzahl der Wörter mit mindestens einem Cluster (je Wort max. einmal).
  return words.filter((rawWord) => {
    const word = stripNonLetters(rawWord);
    return onsetClusterRegex.test(word) || codaClusterRegex.test(word);
  }).length;
}
```

- [ ] **Step 4: Run the backend unit suite — expect PASS**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run test
```
Expected: all backend tests pass (grapheme coverage tests in `result.spec.ts` and `word-complexity.spec.ts` exercise all three counters).

- [ ] **Step 5: Verify the strip regex now exists exactly once**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && grep -rn 'A-Za-zÄÖÜäöüß' apps/backend/src
```
Expected: exactly one hit — the `NON_LETTERS` constant in `basic-metrics.ts`.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/info/projects/lesbarkeitsindex
git add apps/backend/src/calculate/result/grapheme-analysis.ts apps/backend/src/calculate/result/basic-metrics.ts
git commit -m "refactor(backend): collapse grapheme count loops, share non-letter strip" -m "The three structurally identical count loops become filter().length
one-liners; the 5x-duplicated non-letter strip regex lives once in
basic-metrics (stripNonLetters); /g flags dropped from .test() regexes." -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 4: Drop unused `words` params from syllable-based metrics

**Covers findings:** F27

**Files:**
- Modify: `apps/backend/src/calculate/result/basic-metrics.ts`
- Modify: `apps/backend/src/calculate/result/indices.ts`
- Modify: `apps/backend/src/calculate/result/word-complexity.ts`
- Modify: `apps/backend/src/calculate/result/index.ts`
- Test: `apps/backend/src/calculate/result/result.spec.ts`

**Interfaces:**
- Consumes: `stripNonLetters` state of `basic-metrics.ts` (Task 3)
- Produces: `countWordsWithComplexSyllables(syllablesPerWord: readonly number[]): number`, `calculateAverageSyllablesPerWord(syllablesPerWord: readonly number[]): number`, `calculateGsmog(sentences: readonly string[], syllablesPerWord: readonly number[]): number` (the `words` param of gSMOG becomes dead by this change and is dropped with it; Task 6 renames `sentences` again)

By sidecar contract `words.length === syllablesPerWord.length`, so `words` was only ever used for `.length` (or not at all).

- [ ] **Step 1: Update all `countWordsWithComplexSyllables` / `calculateAverageSyllablesPerWord` / `calculateGsmog` calls in `result.spec.ts` (failing tests first; 8 edits)**

Edit 1a — Before:
```ts
  test('countWordsWithComplexSyllables counts words with 3+ syllables', () => {
    expect(countWordsWithComplexSyllables(WORDS, SYLLABLES)).toBe(0);
    expect(countWordsWithComplexSyllables(['Ananas'], [3])).toBe(1);
  });

  test('countWordsWithComplexSyllables returns 0 for empty arrays', () => {
    expect(countWordsWithComplexSyllables([], [])).toBe(0);
  });
```
After:
```ts
  test('countWordsWithComplexSyllables counts words with 3+ syllables', () => {
    expect(countWordsWithComplexSyllables(SYLLABLES)).toBe(0);
    expect(countWordsWithComplexSyllables([3])).toBe(1);
  });

  test('countWordsWithComplexSyllables returns 0 for empty arrays', () => {
    expect(countWordsWithComplexSyllables([])).toBe(0);
  });
```

Edit 1b — Before:
```ts
  test('countWordsWithComplexSyllables counts complex words in a sentence', () => {
    const words = [
      'Die',
      'Bundesregierung',
      'hat',
      'eine',
      'weitreichende',
      'Entscheidung',
      'getroffen',
    ];
    const syllables = [1, 5, 1, 2, 4, 3, 3];
    const result = countWordsWithComplexSyllables(words, syllables);
    expect(result).toBeGreaterThan(0);
  });
```
After:
```ts
  test('countWordsWithComplexSyllables counts complex words in a sentence', () => {
    // "Bundesregierung" (5), "weitreichende" (4), "Entscheidung" (3), "getroffen" (3)
    const syllables = [1, 5, 1, 2, 4, 3, 3];
    expect(countWordsWithComplexSyllables(syllables)).toBe(4);
  });
```

Edit 1c — Before:
```ts
  test('countWordsWithComplexSyllables returns 0 for simple monosyllabic words', () => {
    const words = ['Der', 'Hund', 'ist', 'alt'];
    const syllables = [1, 1, 1, 1];
    expect(countWordsWithComplexSyllables(words, syllables)).toBe(0);
  });
```
After:
```ts
  test('countWordsWithComplexSyllables returns 0 for simple monosyllabic words', () => {
    expect(countWordsWithComplexSyllables([1, 1, 1, 1])).toBe(0);
  });
```

Edit 1d — Before:
```ts
  test('calculateAverageSyllablesPerWord computes average', () => {
    const avg = calculateAverageSyllablesPerWord(WORDS, SYLLABLES);
```
After:
```ts
  test('calculateAverageSyllablesPerWord computes average', () => {
    const avg = calculateAverageSyllablesPerWord(SYLLABLES);
```

Edit 1e — Before:
```ts
  test('calculateGsmog computes gSmog score', () => {
    const gsmog = calculateGsmog(WORDS, SENTENCES, SYLLABLES);
```
After:
```ts
  test('calculateGsmog computes gSmog score', () => {
    const gsmog = calculateGsmog(SENTENCES, SYLLABLES);
```

Edit 1f (empty-arrays block) — Before:
```ts
    expect(countWordsWithComplexSyllables([], [])).toBe(0);
    expect(countWordsWithMultiMemberedGraphemes([])).toBe(0);
```
After:
```ts
    expect(countWordsWithComplexSyllables([])).toBe(0);
    expect(countWordsWithMultiMemberedGraphemes([])).toBe(0);
```

Edit 1g (empty-arrays block) — Before:
```ts
    expect(calculateAverageSyllablesPerWord([], [])).toBe(0);
    expect(calculateAveragePhraseLength([], [])).toBe(0);
```
After:
```ts
    expect(calculateAverageSyllablesPerWord([])).toBe(0);
    expect(calculateAveragePhraseLength([], [])).toBe(0);
```
and — Before:
```ts
    expect(calculateGsmog([], [], [])).toBe(0);
```
After:
```ts
    expect(calculateGsmog([], [])).toBe(0);
```

Edit 1h (Coverage-Semantik block) — Before:
```ts
    expect(countWordsWithComplexSyllables(words, [2, 3, 1, 1])).toBeLessThanOrEqual(words.length);
```
After:
```ts
    expect(countWordsWithComplexSyllables([2, 3, 1, 1])).toBeLessThanOrEqual(words.length);
```

- [ ] **Step 2: Run the backend unit suite — expect FAIL**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run test
```
Expected: the edited tests fail (old implementations receive the syllable array in the `words` slot; `syllablesPerWord` is `undefined`, so `.filter` throws / averages are wrong).

- [ ] **Step 3: Drop the params in `basic-metrics.ts` (2 edits)**

Edit 3a — Before:
```ts
/*
    Coverage: Anzahl der Wörter mit komplexen Silben (≥3 Silben), je Wort max. einmal.
    `words` bleibt Teil der Signatur (Aufrufer übergeben beide Arrays), die Zählung
    hängt aber allein an den Silbenzahlen.
 */
export function countWordsWithComplexSyllables(
  words: readonly string[],
  syllablesPerWord: readonly number[],
): number {
  return syllablesPerWord.filter((count) => count >= 3).length;
}
```
After:
```ts
/*
    Coverage: Anzahl der Wörter mit komplexen Silben (≥3 Silben), je Wort max. einmal.
 */
export function countWordsWithComplexSyllables(syllablesPerWord: readonly number[]): number {
  return syllablesPerWord.filter((count) => count >= 3).length;
}
```

Edit 3b — Before:
```ts
/*
    ∅Silben/Wort
 */
export function calculateAverageSyllablesPerWord(
  words: readonly string[],
  syllablesPerWord: readonly number[],
): number {
  if (words.length === 0) return 0;
  let total = 0;
  for (const count of syllablesPerWord) {
    total += count;
  }
  return total / words.length;
}
```
After:
```ts
/*
    ∅Silben/Wort (Nenner: Silbenzahl-Liste — per Sidecar-Vertrag == Wortzahl)
 */
export function calculateAverageSyllablesPerWord(syllablesPerWord: readonly number[]): number {
  if (syllablesPerWord.length === 0) return 0;
  let total = 0;
  for (const count of syllablesPerWord) {
    total += count;
  }
  return total / syllablesPerWord.length;
}
```

- [ ] **Step 4: Update `indices.ts` — gSMOG loses its now-dead `words` param, WSTF updates its call (2 edits)**

Edit 4a — Before:
```ts
export function calculateGsmog(
  words: readonly string[],
  sentences: readonly string[],
  syllablesPerWord: readonly number[],
): number {
  const sentenceCount = sentences.length;
  if (sentenceCount === 0) return 0;
  const wordsWithThreeOrMoreSyllables = countWordsWithComplexSyllables(words, syllablesPerWord);
  const gsmog = Math.sqrt((wordsWithThreeOrMoreSyllables * 30) / sentenceCount) - 2;
  return Math.round(gsmog * 100) / 100;
}
```
After:
```ts
export function calculateGsmog(
  sentences: readonly string[],
  syllablesPerWord: readonly number[],
): number {
  const sentenceCount = sentences.length;
  if (sentenceCount === 0) return 0;
  const wordsWithThreeOrMoreSyllables = countWordsWithComplexSyllables(syllablesPerWord);
  const gsmog = Math.sqrt((wordsWithThreeOrMoreSyllables * 30) / sentenceCount) - 2;
  return Math.round(gsmog * 100) / 100;
}
```

Edit 4b (inside `calculateWstf`) — Before:
```ts
  const wordsWithThreeOrMoreSyllables = countWordsWithComplexSyllables(words, syllablesPerWord);
  const wstf =
```
After:
```ts
  const wordsWithThreeOrMoreSyllables = countWordsWithComplexSyllables(syllablesPerWord);
  const wstf =
```

- [ ] **Step 5: Update the call in `word-complexity.ts`**

Before:
```ts
  const countWordsWithComplexSyllables = countComplexSyllableWords(words, syllablesPerWord);
```
After:
```ts
  const countWordsWithComplexSyllables = countComplexSyllableWords(syllablesPerWord);
```

- [ ] **Step 6: Update the two calls in `apps/backend/src/calculate/result/index.ts`**

Edit 6a — Before:
```ts
  const averageSyllablesPerWord = calculateAverageSyllablesPerWord(words, syllablesPerWord);
```
After:
```ts
  const averageSyllablesPerWord = calculateAverageSyllablesPerWord(syllablesPerWord);
```

Edit 6b — Before:
```ts
  const gsmog = calculateGsmog(words, readingUnits, syllablesPerWord);
```
After:
```ts
  const gsmog = calculateGsmog(readingUnits, syllablesPerWord);
```

- [ ] **Step 7: Run the backend unit suite — expect PASS**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run test
```
Expected: all backend tests pass.

- [ ] **Step 8: Commit**

```bash
cd /c/Users/info/projects/lesbarkeitsindex
git add apps/backend/src/calculate/result/basic-metrics.ts apps/backend/src/calculate/result/indices.ts apps/backend/src/calculate/result/word-complexity.ts apps/backend/src/calculate/result/index.ts apps/backend/src/calculate/result/result.spec.ts
git commit -m "refactor(backend): drop unused words params from syllable metrics" -m "countWordsWithComplexSyllables and calculateAverageSyllablesPerWord used
words only for .length, which equals syllablesPerWord.length by sidecar
contract. calculateGsmog's words param became dead as a result and goes too." -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 5: Inline calculateWordComplexity into computeWordComplexity

**Covers findings:** F12

**Files:**
- Modify: `apps/backend/src/calculate/result/word-complexity.ts`
- Test: `apps/backend/src/calculate/result/word-complexity.spec.ts`

**Interfaces:**
- Consumes: `countWordsWithComplexSyllables(syllablesPerWord)` (Task 4)
- Produces: `computeWordComplexity(words: readonly string[], syllablesPerWord: readonly number[], weights: { readonly complexSyllables: number; readonly multiMemberedGraphemes: number; readonly rareGraphemes: number; readonly consonantClusters: number }): { readonly wordComplexity: number; readonly components: WordComplexityComponents }`. DELETED: `calculateWordComplexity`, `WordComplexityValues`. `WordComplexityComponents` stays.

Pure refactor (the weighted-mean behavior is already covered end-to-end by `result.spec.ts` AC3 and the surviving `computeWordComplexity` specs): green before and after.

- [ ] **Step 1: Run the backend unit suite — expect PASS (baseline)**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run test
```
Expected: all backend tests pass.

- [ ] **Step 2: Rewrite `apps/backend/src/calculate/result/word-complexity.ts` — complete new file content**

(Note: the `countComplexSyllableWords` call already takes only `syllablesPerWord` after Task 4.)

```ts
/*
    Wortkomplexität (WK, ADR 0001): eigenständiger Wert 0–100, gewichteter
    Mittelwert von vier Coverage-Komponenten. WK bleibt roh — keine Streckung
    auf Ankertexte. Die vier WK-Komponente-Zähler leben weiterhin in
    basic-metrics.ts / grapheme-analysis.ts (gSMOG/WSTF nutzen denselben
    Silbenzähler); dieses Modul ruft sie auf und bündelt Anteile + Mittelwert.

    Die Grenze zum Aufschlagsmodell ist bewusst: LÜ-LIX (LIX + α·WK) und die
    Niveaustufe gehören NICHT hierher (siehe score-model.ts).
 */

import { countWordsWithComplexSyllables as countComplexSyllableWords } from './basic-metrics.js';
import {
  countWordsWithMultiMemberedGraphemes as countMultiMemberedGraphemeWords,
  countWordsWithRareGraphemes as countRareGraphemeWords,
  countWordsWithConsonantClusters as countConsonantClusterWords,
} from './grapheme-analysis.js';

/**
 * Die acht WK-Komponentenfelder, die computeReadability als eigenständige
 * Ergebnisfelder ausweist und persistiert (Schema-Spaltennamen, exakt).
 */
export interface WordComplexityComponents {
  readonly countWordsWithComplexSyllables: number;
  readonly countWordsWithConsonantClusters: number;
  readonly countWordsWithMultiMemberedGraphemes: number;
  readonly countWordsWithRareGraphemes: number;
  readonly proportionOfWordsWithComplexSyllables: number;
  readonly proportionOfWordsWithConsonantClusters: number;
  readonly proportionOfWordsWithMultiMemberedGraphemes: number;
  readonly proportionOfWordsWithRareGraphemes: number;
}

/**
 * Berechnet die Wortkomplexität (WK, 0–100) samt ihrer acht Komponentenfelder
 * aus den Wörtern, den Silbenzahlen und den vier fachlichen Gewichten
 * (Startwerte 50 / 25 / 12,5 / 12,5). Jede Komponente zählt ein Wort höchstens
 * einmal (Coverage, Anteil in [0, 1]); der Nenner ist die Wortzahl. WK ist der
 * auf die Gewichtssumme normierte, auf 0–100 skalierte gewichtete Mittelwert —
 * bei Gesamtgewicht 0 ist WK 0 (kein Division-durch-Null).
 */
export function computeWordComplexity(
  words: readonly string[],
  syllablesPerWord: readonly number[],
  weights: {
    readonly complexSyllables: number;
    readonly multiMemberedGraphemes: number;
    readonly rareGraphemes: number;
    readonly consonantClusters: number;
  },
): { readonly wordComplexity: number; readonly components: WordComplexityComponents } {
  const countWords = words.length;

  const countWordsWithComplexSyllables = countComplexSyllableWords(syllablesPerWord);
  const countWordsWithConsonantClusters = countConsonantClusterWords(words);
  const countWordsWithMultiMemberedGraphemes = countMultiMemberedGraphemeWords(words);
  const countWordsWithRareGraphemes = countRareGraphemeWords(words);

  const proportionOfWordsWithComplexSyllables =
    countWords > 0 ? countWordsWithComplexSyllables / countWords : 0;
  const proportionOfWordsWithConsonantClusters =
    countWords > 0 ? countWordsWithConsonantClusters / countWords : 0;
  const proportionOfWordsWithMultiMemberedGraphemes =
    countWords > 0 ? countWordsWithMultiMemberedGraphemes / countWords : 0;
  const proportionOfWordsWithRareGraphemes =
    countWords > 0 ? countWordsWithRareGraphemes / countWords : 0;

  const totalWeight =
    weights.complexSyllables +
    weights.multiMemberedGraphemes +
    weights.rareGraphemes +
    weights.consonantClusters;
  const weightedSum =
    proportionOfWordsWithComplexSyllables * weights.complexSyllables +
    proportionOfWordsWithMultiMemberedGraphemes * weights.multiMemberedGraphemes +
    proportionOfWordsWithRareGraphemes * weights.rareGraphemes +
    proportionOfWordsWithConsonantClusters * weights.consonantClusters;
  const wordComplexity =
    totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100 * 100) / 100 : 0;

  return {
    wordComplexity,
    components: {
      countWordsWithComplexSyllables,
      countWordsWithConsonantClusters,
      countWordsWithMultiMemberedGraphemes,
      countWordsWithRareGraphemes,
      proportionOfWordsWithComplexSyllables,
      proportionOfWordsWithConsonantClusters,
      proportionOfWordsWithMultiMemberedGraphemes,
      proportionOfWordsWithRareGraphemes,
    },
  };
}
```

- [ ] **Step 3: Rewrite `apps/backend/src/calculate/result/word-complexity.spec.ts` — complete new file content**

The `calculateWordComplexity` describe block dies with the function; the weighting/normalization/zero-weight behaviors move into `computeWordComplexity` tests.

```ts
import { describe, test, expect } from 'vitest';
import { computeWordComplexity } from './word-complexity.js';

/** BL-Startgewichte: Drei-/Mehrsilber 50, mehrgliedrige Grapheme 25, seltene 12,5, Cluster 12,5. */
const START_WEIGHTS = {
  complexSyllables: 50,
  multiMemberedGraphemes: 25,
  rareGraphemes: 12.5,
  consonantClusters: 12.5,
};

describe('computeWordComplexity (Zähler → Anteile → WK, acht Komponentenfelder)', () => {
  test('leere Wortliste: WK 0, alle acht Komponenten 0', () => {
    const { wordComplexity, components } = computeWordComplexity([], [], START_WEIGHTS);
    expect(wordComplexity).toBe(0);
    expect(components).toEqual({
      countWordsWithComplexSyllables: 0,
      countWordsWithConsonantClusters: 0,
      countWordsWithMultiMemberedGraphemes: 0,
      countWordsWithRareGraphemes: 0,
      proportionOfWordsWithComplexSyllables: 0,
      proportionOfWordsWithConsonantClusters: 0,
      proportionOfWordsWithMultiMemberedGraphemes: 0,
      proportionOfWordsWithRareGraphemes: 0,
    });
  });

  test('merkmalloses Wort ("Tag"): WK 0, keine Komponente trifft', () => {
    const { wordComplexity, components } = computeWordComplexity(['Tag'], [1], START_WEIGHTS);
    expect(wordComplexity).toBe(0);
    expect(components.countWordsWithComplexSyllables).toBe(0);
    expect(components.countWordsWithMultiMemberedGraphemes).toBe(0);
    expect(components.countWordsWithRareGraphemes).toBe(0);
    expect(components.countWordsWithConsonantClusters).toBe(0);
  });

  test('gewichtet eine einzelne Komponente gemäß Startgewicht (Dreisilber → 50)', () => {
    // "Banane" (3 Silben) trifft nur die Komponente Drei-/Mehrsilber: 1·50 / 100 · 100 = 50.
    const { wordComplexity } = computeWordComplexity(['Banane'], [3], START_WEIGHTS);
    expect(wordComplexity).toBe(50);
  });

  test('normiert auf die Summe der Gewichte (gleichgewichtet → 25)', () => {
    // Nur Drei-/Mehrsilber trifft; bei Gewichten 1/1/1/1 ergibt das 1/4 → 25.
    const equal = {
      complexSyllables: 1,
      multiMemberedGraphemes: 1,
      rareGraphemes: 1,
      consonantClusters: 1,
    };
    const { wordComplexity } = computeWordComplexity(['Banane'], [3], equal);
    expect(wordComplexity).toBe(25);
  });

  test('liefert 0 bei Gesamtgewicht 0 (kein Division-durch-Null)', () => {
    const zeroWeights = {
      complexSyllables: 0,
      multiMemberedGraphemes: 0,
      rareGraphemes: 0,
      consonantClusters: 0,
    };
    const { wordComplexity } = computeWordComplexity(['Banane'], [3], zeroWeights);
    expect(wordComplexity).toBe(0);
  });

  test('seltenes Graphem (ß) wird als Coverage-Anteil ausgewiesen', () => {
    // 'Strauß' enthält 'ß' (seltenes Graphem); 'Tag' nicht → Anteil 1/2.
    const { components } = computeWordComplexity(['Strauß', 'Tag'], [1, 1], START_WEIGHTS);
    expect(components.countWordsWithRareGraphemes).toBe(1);
    expect(components.proportionOfWordsWithRareGraphemes).toBe(0.5);
  });

  test('Anteil ist Zähler / Wortzahl (Coverage in [0,1])', () => {
    const { components } = computeWordComplexity(['Strauß', 'Tag'], [1, 1], START_WEIGHTS);
    for (const [count, proportion] of [
      [components.countWordsWithComplexSyllables, components.proportionOfWordsWithComplexSyllables],
      [components.countWordsWithConsonantClusters, components.proportionOfWordsWithConsonantClusters],
      [
        components.countWordsWithMultiMemberedGraphemes,
        components.proportionOfWordsWithMultiMemberedGraphemes,
      ],
      [components.countWordsWithRareGraphemes, components.proportionOfWordsWithRareGraphemes],
    ] as const) {
      expect(count).toBeLessThanOrEqual(2);
      expect(proportion).toBe(count / 2);
      expect(proportion).toBeLessThanOrEqual(1);
    }
  });

  test('WK bleibt im Bereich 0–100', () => {
    // "schickst": mehrgliedrige Grapheme + Cluster + kein Dreisilber → gewichteter Mix.
    const { wordComplexity } = computeWordComplexity(['schickst', 'Tag'], [1, 1], START_WEIGHTS);
    expect(wordComplexity).toBeGreaterThanOrEqual(0);
    expect(wordComplexity).toBeLessThanOrEqual(100);
  });
});
```

- [ ] **Step 4: Run the backend unit suite — expect PASS**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run test
```
Expected: all backend tests pass (the AC3 test in `result.spec.ts` — `result.wordComplexity` = 25 for `schickst Tag.` — pins the weighted-mean formula end-to-end).

- [ ] **Step 5: Verify the deleted symbols are gone**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && grep -rn 'calculateWordComplexity\|WordComplexityValues' apps/backend/src || echo CLEAN
```
Expected output: `CLEAN`.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/info/projects/lesbarkeitsindex
git add apps/backend/src/calculate/result/word-complexity.ts apps/backend/src/calculate/result/word-complexity.spec.ts
git commit -m "refactor(backend): inline word-complexity weighted mean" -m "computeWordComplexity packed four proportions into a WordComplexityValues
object solely for calculateWordComplexity to unpack again. The weighted
sum is inlined; the pass-through function and the interface are deleted." -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 6: sentences arrays → sentenceCount numbers

**Covers findings:** F19

**Files:**
- Modify: `apps/backend/src/calculate/result/indices.ts`
- Modify: `apps/backend/src/calculate/result/basic-metrics.ts`
- Modify: `apps/backend/src/calculate/result/linguistic-features.ts`
- Modify: `apps/backend/src/calculate/result/index.ts`
- Test: `apps/backend/src/calculate/result/result.spec.ts`

**Interfaces:**
- Consumes: Task 4 signatures (`calculateGsmog(sentences, syllablesPerWord)` etc.)
- Produces: `calculateLix(words: readonly string[], sentenceCount: number): number`, `calculateGsmog(sentenceCount: number, syllablesPerWord: readonly number[]): number`, `calculateFleschKincaid(words: readonly string[], sentenceCount: number, syllablesPerWord: readonly number[]): number`, `calculateWstf(words: readonly string[], sentenceCount: number, syllablesPerWord: readonly number[]): number`, `calculateRix(words: readonly string[], sentenceCount: number, passiveCount: number, subordinateClauseRatio: number, nominalizationCount: number): number`, `calculateAveragePhraseLength(words: readonly string[], sentenceCount: number): number`, `calculateAverageSyllablesPerPhrase(sentenceCount: number, syllablesPerWord: readonly number[]): number`, `calculateSubordinateClauseRatio(posTags: readonly string[], sentenceCount: number): number`. The `line-${i}` placeholder-array fabrication in `computeReadability` is deleted.

- [ ] **Step 1: Update `result.spec.ts` — the shared consts and the index/average call sites (failing tests first; 6 edits)**

Edit 1a (delete the now-obsolete SENTENCES const) — Before:
```ts
const WORDS = ['Der', 'Hund', 'läuft', 'über', 'die', 'Straße'];
const SENTENCES = ['Der Hund läuft über die Straße.'];
const SYLLABLES = [1, 1, 1, 2, 1, 2];
```
After:
```ts
const WORDS = ['Der', 'Hund', 'läuft', 'über', 'die', 'Straße'];
const SYLLABLES = [1, 1, 1, 2, 1, 2];
```

Edit 1b — Before:
```ts
  test('calculateAveragePhraseLength computes words per sentence', () => {
    const avg = calculateAveragePhraseLength(WORDS, SENTENCES);
    expect(avg).toBe(6);
  });

  test('calculateAverageSyllablesPerPhrase computes syllables per sentence', () => {
    const avg = calculateAverageSyllablesPerPhrase(SENTENCES, SYLLABLES);
    expect(avg).toBeCloseTo(8 / 1, 5);
  });
```
After:
```ts
  test('calculateAveragePhraseLength computes words per sentence', () => {
    const avg = calculateAveragePhraseLength(WORDS, 1);
    expect(avg).toBe(6);
  });

  test('calculateAverageSyllablesPerPhrase computes syllables per sentence', () => {
    const avg = calculateAverageSyllablesPerPhrase(1, SYLLABLES);
    expect(avg).toBeCloseTo(8 / 1, 5);
  });
```

Edit 1c — Before:
```ts
  test('calculateLix computes LIX score', () => {
    const lix = calculateLix(WORDS, SENTENCES);
    expect(lix).toBeCloseTo(6.0, 1);
  });

  test('calculateLix strips hyphens before measuring word length', () => {
    const words = ['ab-cde', 'Der', 'ist'];
    const sentences = ['ab-cde Der ist.'];
    const lix = calculateLix(words, sentences);
    expect(lix).toBe(3);
  });

  test('calculateLix counts hyphenated compound as long when Buchstaben > 6', () => {
    const words = ['Carl-Heinrich', 'von'];
    const sentences = ['Carl-Heinrich von.'];
    const lix = calculateLix(words, sentences);
    expect(lix).toBe(52);
  });
```
After:
```ts
  test('calculateLix computes LIX score', () => {
    const lix = calculateLix(WORDS, 1);
    expect(lix).toBeCloseTo(6.0, 1);
  });

  test('calculateLix strips hyphens before measuring word length', () => {
    const lix = calculateLix(['ab-cde', 'Der', 'ist'], 1);
    expect(lix).toBe(3);
  });

  test('calculateLix counts hyphenated compound as long when Buchstaben > 6', () => {
    const lix = calculateLix(['Carl-Heinrich', 'von'], 1);
    expect(lix).toBe(52);
  });
```

Edit 1d — Before:
```ts
  test('calculateGsmog computes gSmog score', () => {
    const gsmog = calculateGsmog(SENTENCES, SYLLABLES);
    expect(gsmog).toBeCloseTo(-2, 1);
  });

  test('calculateFleschKincaid computes FK score', () => {
    const fk = calculateFleschKincaid(WORDS, SENTENCES, SYLLABLES);
    const expected = 0.39 * 6 + 11.8 * (8 / 6) - 15.59;
    expect(fk).toBeCloseTo(expected, 1);
  });

  test('calculateWstf computes WSTF score', () => {
    const wstf = calculateWstf(WORDS, SENTENCES, SYLLABLES);
    const expected = 0.2656 * 6 + 0.2744 * 0 * 100 - 1.693;
    expect(wstf).toBeCloseTo(expected, 1);
  });
```
After:
```ts
  test('calculateGsmog computes gSmog score', () => {
    const gsmog = calculateGsmog(1, SYLLABLES);
    expect(gsmog).toBeCloseTo(-2, 1);
  });

  test('calculateFleschKincaid computes FK score', () => {
    const fk = calculateFleschKincaid(WORDS, 1, SYLLABLES);
    const expected = 0.39 * 6 + 11.8 * (8 / 6) - 15.59;
    expect(fk).toBeCloseTo(expected, 1);
  });

  test('calculateWstf computes WSTF score', () => {
    const wstf = calculateWstf(WORDS, 1, SYLLABLES);
    const expected = 0.2656 * 6 + 0.2744 * 0 * 100 - 1.693;
    expect(wstf).toBeCloseTo(expected, 1);
  });
```

Edit 1e (empty-arrays block) — Before:
```ts
    expect(calculateAveragePhraseLength([], [])).toBe(0);
    expect(calculateAverageSyllablesPerPhrase([], [])).toBe(0);
    expect(calculateProportionOfLongWords([])).toBe(0);
    expect(calculateLix([], [])).toBe(0);
    expect(calculateGsmog([], [])).toBe(0);
    expect(calculateFleschKincaid([], [], [])).toBe(0);
    expect(calculateWstf([], [], [])).toBe(0);
```
After:
```ts
    expect(calculateAveragePhraseLength([], 0)).toBe(0);
    expect(calculateAverageSyllablesPerPhrase(0, [])).toBe(0);
    expect(calculateProportionOfLongWords([])).toBe(0);
    expect(calculateLix([], 0)).toBe(0);
    expect(calculateGsmog(0, [])).toBe(0);
    expect(calculateFleschKincaid([], 0, [])).toBe(0);
    expect(calculateWstf([], 0, [])).toBe(0);
```

Edit 1f (subordinate-clause + RIX blocks) — Before:
```ts
  describe('calculateSubordinateClauseRatio', () => {
    test('counts KOUS as subordinate clause', () => {
      expect(
        calculateSubordinateClauseRatio(
          ['ART', 'NN', 'KOUS', 'PPER', 'VVFIN'],
          ['Satz eins.', 'weil er geht.'],
        ),
      ).toBe(0.5);
    });

    test('counts KOUI as subordinate clause', () => {
      expect(calculateSubordinateClauseRatio(['KOUI', 'VVINF'], ['Um zu gehen.'])).toBe(1);
    });

    test('returns 0 when no subordinating conjunctions', () => {
      expect(calculateSubordinateClauseRatio(['ART', 'NN', 'VVFIN'], ['Der Hund läuft.'])).toBe(0);
    });

    test('returns 0 for empty arrays', () => {
      expect(calculateSubordinateClauseRatio([], [])).toBe(0);
    });
  });
```
After:
```ts
  describe('calculateSubordinateClauseRatio', () => {
    test('counts KOUS as subordinate clause', () => {
      expect(
        calculateSubordinateClauseRatio(['ART', 'NN', 'KOUS', 'PPER', 'VVFIN'], 2),
      ).toBe(0.5);
    });

    test('counts KOUI as subordinate clause', () => {
      expect(calculateSubordinateClauseRatio(['KOUI', 'VVINF'], 1)).toBe(1);
    });

    test('returns 0 when no subordinating conjunctions', () => {
      expect(calculateSubordinateClauseRatio(['ART', 'NN', 'VVFIN'], 1)).toBe(0);
    });

    test('returns 0 for empty arrays', () => {
      expect(calculateSubordinateClauseRatio([], 0)).toBe(0);
    });
  });
```
and — Before:
```ts
  describe('calculateRix', () => {
    test('computes RIX with all components', () => {
      const words = ['Der', 'Hund', 'wird', 'gefüttert', 'das', 'Leichtes'];
      const sentences = ['Der Hund wird gefüttert das Leichtes.'];
      const result = calculateRix(words, sentences, 1, 0.5, 1);
      expect(result).toBeGreaterThan(0);
    });

    test('returns simplified value when no passive/subordinate/nominalization', () => {
      const words = ['Der', 'Hund', 'ist', 'alt'];
      const sentences = ['Der Hund ist alt.'];
      expect(calculateRix(words, sentences, 0, 0, 0)).toBe(1.74);
    });

    test('returns 0 for empty arrays', () => {
      expect(calculateRix([], [], 0, 0, 0)).toBe(0);
    });
  });
```
After:
```ts
  describe('calculateRix', () => {
    test('computes RIX with all components', () => {
      const words = ['Der', 'Hund', 'wird', 'gefüttert', 'das', 'Leichtes'];
      const result = calculateRix(words, 1, 1, 0.5, 1);
      expect(result).toBeGreaterThan(0);
    });

    test('returns simplified value when no passive/subordinate/nominalization', () => {
      expect(calculateRix(['Der', 'Hund', 'ist', 'alt'], 1, 0, 0, 0)).toBe(1.74);
    });

    test('returns 0 for empty arrays', () => {
      expect(calculateRix([], 0, 0, 0, 0)).toBe(0);
    });
  });
```

- [ ] **Step 2: Run the backend unit suite — expect FAIL**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run test
```
Expected: the edited index/average/ratio tests fail (old implementations read `.length` off a number → `undefined` → NaN results).

- [ ] **Step 3: Change the five index functions in `indices.ts` to take `sentenceCount: number` (5 edits)**

Edit 3a — Before:
```ts
export function calculateLix(words: readonly string[], sentences: readonly string[]): number {
  const wordCount = words.length;
  if (wordCount === 0) return 0;
  const sentenceCount = Math.max(1, sentences.length);
  const longWordCount = countLongWords(words);
  const lix = wordCount / sentenceCount + (longWordCount * 100) / wordCount;
  return Math.round(lix * 100) / 100;
}
```
After:
```ts
export function calculateLix(words: readonly string[], sentenceCount: number): number {
  const wordCount = words.length;
  if (wordCount === 0) return 0;
  const divisor = Math.max(1, sentenceCount);
  const longWordCount = countLongWords(words);
  const lix = wordCount / divisor + (longWordCount * 100) / wordCount;
  return Math.round(lix * 100) / 100;
}
```

Edit 3b — Before:
```ts
export function calculateGsmog(
  sentences: readonly string[],
  syllablesPerWord: readonly number[],
): number {
  const sentenceCount = sentences.length;
  if (sentenceCount === 0) return 0;
```
After:
```ts
export function calculateGsmog(
  sentenceCount: number,
  syllablesPerWord: readonly number[],
): number {
  if (sentenceCount === 0) return 0;
```

Edit 3c — Before:
```ts
export function calculateFleschKincaid(
  words: readonly string[],
  sentences: readonly string[],
  syllablesPerWord: readonly number[],
): number {
  const wordCount = words.length;
  const sentenceCount = sentences.length;
  if (wordCount === 0 || sentenceCount === 0) return 0;
```
After:
```ts
export function calculateFleschKincaid(
  words: readonly string[],
  sentenceCount: number,
  syllablesPerWord: readonly number[],
): number {
  const wordCount = words.length;
  if (wordCount === 0 || sentenceCount === 0) return 0;
```

Edit 3d — Before:
```ts
export function calculateWstf(
  words: readonly string[],
  sentences: readonly string[],
  syllablesPerWord: readonly number[],
): number {
  const wordCount = words.length;
  const sentenceCount = sentences.length;
  if (wordCount === 0 || sentenceCount === 0) return 0;
```
After:
```ts
export function calculateWstf(
  words: readonly string[],
  sentenceCount: number,
  syllablesPerWord: readonly number[],
): number {
  const wordCount = words.length;
  if (wordCount === 0 || sentenceCount === 0) return 0;
```

Edit 3e — Before:
```ts
export function calculateRix(
  words: readonly string[],
  sentences: readonly string[],
  passiveCount: number,
  subordinateClauseRatio: number,
  nominalizationCount: number,
): number {
  const wordCount = words.length;
  const sentenceCount = sentences.length;
  if (wordCount === 0 || sentenceCount === 0) return 0;
```
After:
```ts
export function calculateRix(
  words: readonly string[],
  sentenceCount: number,
  passiveCount: number,
  subordinateClauseRatio: number,
  nominalizationCount: number,
): number {
  const wordCount = words.length;
  if (wordCount === 0 || sentenceCount === 0) return 0;
```

- [ ] **Step 4: Change the two averages in `basic-metrics.ts`**

Before:
```ts
/*
    Durchschnittliche Satzlänge
 */
export function calculateAveragePhraseLength(
  words: readonly string[],
  sentences: readonly string[],
): number {
  if (sentences.length === 0) return 0;
  return Math.round((words.length / sentences.length) * 100) / 100;
}

/*
    ∅Silben/Satz
 */
export function calculateAverageSyllablesPerPhrase(
  sentences: readonly string[],
  syllablesPerWord: readonly number[],
): number {
  if (sentences.length === 0) return 0;
  let totalSyllables = 0;
  for (const count of syllablesPerWord) {
    totalSyllables += count;
  }
  return totalSyllables / sentences.length;
}
```
After:
```ts
/*
    Durchschnittliche Satzlänge (Nenner: Anzahl Leseeinheiten — Sätze oder Zeilen)
 */
export function calculateAveragePhraseLength(
  words: readonly string[],
  sentenceCount: number,
): number {
  if (sentenceCount === 0) return 0;
  return Math.round((words.length / sentenceCount) * 100) / 100;
}

/*
    ∅Silben/Satz
 */
export function calculateAverageSyllablesPerPhrase(
  sentenceCount: number,
  syllablesPerWord: readonly number[],
): number {
  if (sentenceCount === 0) return 0;
  let totalSyllables = 0;
  for (const count of syllablesPerWord) {
    totalSyllables += count;
  }
  return totalSyllables / sentenceCount;
}
```

- [ ] **Step 5: Change `calculateSubordinateClauseRatio` in `linguistic-features.ts`**

Before:
```ts
export function calculateSubordinateClauseRatio(
  posTags: readonly string[],
  sentences: readonly string[],
): number {
  if (sentences.length === 0) return 0;
  let subordinateClauses = 0;
  for (const tag of posTags) {
    if (tag === 'KOUS' || tag === 'KOUI') subordinateClauses++;
  }
  return Math.round((subordinateClauses / sentences.length) * 100) / 100;
}
```
After:
```ts
export function calculateSubordinateClauseRatio(
  posTags: readonly string[],
  sentenceCount: number,
): number {
  if (sentenceCount === 0) return 0;
  let subordinateClauses = 0;
  for (const tag of posTags) {
    if (tag === 'KOUS' || tag === 'KOUI') subordinateClauses++;
  }
  return Math.round((subordinateClauses / sentenceCount) * 100) / 100;
}
```

- [ ] **Step 6: Delete the placeholder-array fabrication in `apps/backend/src/calculate/result/index.ts` and pass the count (2 edits)**

Edit 6a — Before:
```ts
  const countReadingUnits =
    textType === 'list' ? countNonEmptyLines(text) : sentences.length;

  // Bei Listen ersetzt eine virtuelle „Lese­einheiten"-Liste die R-Sidecar-Sätze
  // als Nenner satzbezogener Maße. Die Inhalte sind irrelevant — die
  // sätzbezogenen Funktionen nutzen nur `.length`.
  const readingUnits: readonly string[] =
    textType === 'list'
      ? Array.from({ length: countReadingUnits }, (_, i) => `line-${i}`)
      : sentences;
```
After:
```ts
  // Nenner aller satzbezogenen Maße (ADR 0002): Zeilenzahl bei Liste, sonst Satzzahl.
  const countReadingUnits =
    textType === 'list' ? countNonEmptyLines(text) : sentences.length;
```
(Note: the deleted comment contains German typographic quotes and a soft hyphen inside `Lese­einheiten` — match the block from the file exactly; anchoring on the `const readingUnits: readonly string[] =` line is safest.)

Edit 6b — Before:
```ts
  const averagePhraseLength = calculateAveragePhraseLength(words, readingUnits);
  const averageSyllablesPerPhrase = calculateAverageSyllablesPerPhrase(readingUnits, syllablesPerWord);
  const proportionOfLongWords = calculateProportionOfLongWords(words);
  const lix = calculateLix(words, readingUnits);
  const gsmog = calculateGsmog(readingUnits, syllablesPerWord);
  const fleschKincaid = calculateFleschKincaid(words, readingUnits, syllablesPerWord);
  const wst4 = calculateWstf(words, readingUnits, syllablesPerWord);
  const ttr = calculateTTR(words);
  const proNIndex = calculateProNIndex(posTags);
  const subordinateClauseRatio = calculateSubordinateClauseRatio(posTags, readingUnits);
  const passiveCount = calculatePassiveCount(words, posTags);
  const nominalizationCount = calculateNominalizations(words, posTags);
  const rix = calculateRix(
    words,
    readingUnits,
    passiveCount,
    subordinateClauseRatio,
    nominalizationCount,
  );
```
After:
```ts
  const averagePhraseLength = calculateAveragePhraseLength(words, countReadingUnits);
  const averageSyllablesPerPhrase = calculateAverageSyllablesPerPhrase(
    countReadingUnits,
    syllablesPerWord,
  );
  const proportionOfLongWords = calculateProportionOfLongWords(words);
  const lix = calculateLix(words, countReadingUnits);
  const gsmog = calculateGsmog(countReadingUnits, syllablesPerWord);
  const fleschKincaid = calculateFleschKincaid(words, countReadingUnits, syllablesPerWord);
  const wst4 = calculateWstf(words, countReadingUnits, syllablesPerWord);
  const ttr = calculateTTR(words);
  const proNIndex = calculateProNIndex(posTags);
  const subordinateClauseRatio = calculateSubordinateClauseRatio(posTags, countReadingUnits);
  const passiveCount = calculatePassiveCount(words, posTags);
  const nominalizationCount = calculateNominalizations(words, posTags);
  const rix = calculateRix(
    words,
    countReadingUnits,
    passiveCount,
    subordinateClauseRatio,
    nominalizationCount,
  );
```

- [ ] **Step 7: Run the backend unit suite — expect PASS**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run test
```
Expected: all backend tests pass — in particular the ADR-0002 list-denominator tests in `result.spec.ts` (`averagePhraseLength` = 1 for the 20-word list, `countReadingUnits` = 20) still hold.

- [ ] **Step 8: Commit**

```bash
cd /c/Users/info/projects/lesbarkeitsindex
git add apps/backend/src/calculate/result/indices.ts apps/backend/src/calculate/result/basic-metrics.ts apps/backend/src/calculate/result/linguistic-features.ts apps/backend/src/calculate/result/index.ts apps/backend/src/calculate/result/result.spec.ts
git commit -m "refactor(backend): pass sentence counts instead of placeholder arrays" -m "computeReadability fabricated a line-\${i} string array so downstream
functions could read .length. All sentence-based metrics now take
sentenceCount: number and get countReadingUnits directly." -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 7: Drop ComputeReadabilityOptions — plain optional parameter

**Covers findings:** F15

**Files:**
- Modify: `apps/backend/src/calculate/result/index.ts`
- Modify: `apps/backend/src/calculate/calculate.service.ts`
- Test: `apps/backend/src/calculate/result/result.spec.ts`

**Interfaces:**
- Consumes: `computeReadability` state after Task 6
- Produces: `computeReadability(text: string, analysis: TextAnalysis, config: ConfigWeights, textTypeOverride?: TextType)`. DELETED: `ComputeReadabilityOptions`.

- [ ] **Step 1: Update all `computeReadability` override call sites in `result.spec.ts` (failing tests first; 2 replace-all edits)**

Replace ALL occurrences (4x) of:
```ts
, { textTypeOverride: 'prose' })
```
with:
```ts
, 'prose')
```

Replace ALL occurrences (6x) of:
```ts
, { textTypeOverride: 'list' })
```
with:
```ts
, 'list')
```

(Counts verified against the working tree: 4x `'prose'`, 6x `'list'`, every one a `computeReadability(text, analysis, config, ...)` call in this file — replace all of them.)

- [ ] **Step 2: Run the backend unit suite — expect FAIL**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run test
```
Expected: ADR-0002 override tests fail (old code reads `options.textTypeOverride` off the string `'list'` → `undefined` → heuristic wins, e.g. `textType` is `'list'` where the test now forces `'prose'`).

- [ ] **Step 3: Replace the options bag in `apps/backend/src/calculate/result/index.ts` (3 edits)**

Edit 3a (delete the interface; it contains German typographic quotes — match exactly) — Before:
```ts
/** Optionale Zusatzparameter, etwa ein vom Nutzer gesetzter Texttyp-Override. */
export interface ComputeReadabilityOptions {
  /**
   * Übersteuert die heuristische Texttyp-Erkennung (ADR 0002). Wenn gesetzt,
   * wird `textType` exakt darauf festgelegt; `detectedTextType` bleibt das
   * heuristisch erkannte Ergebnis, damit die Oberfläche „automatisch erkannt
   * als X, manuell auf Y gesetzt" anzeigen kann.
   */
  readonly textTypeOverride?: TextType;
}

```
After: (nothing — delete the block including the trailing blank line)

Edit 3b — Before:
```ts
export function computeReadability(
  text: string,
  analysis: TextAnalysis,
  config: ConfigWeights,
  options: ComputeReadabilityOptions = {},
) {
```
After:
```ts
export function computeReadability(
  text: string,
  analysis: TextAnalysis,
  config: ConfigWeights,
  /** Übersteuert die heuristische Texttyp-Erkennung (ADR 0002); `detectedTextType`
      bleibt das heuristisch erkannte Ergebnis. */
  textTypeOverride?: TextType,
) {
```

Edit 3c — Before:
```ts
  const { textType, detectedTextType, readingUnit, title, bodyText } = resolveTextShape(
    text,
    options.textTypeOverride,
  );
```
After:
```ts
  const { textType, detectedTextType, readingUnit, title, bodyText } = resolveTextShape(
    text,
    textTypeOverride,
  );
```

- [ ] **Step 4: Update the caller in `apps/backend/src/calculate/calculate.service.ts`**

Before:
```ts
    const resultData = computeReadability(text, analysis, effectiveConfig, { textTypeOverride });
```
After:
```ts
    const resultData = computeReadability(text, analysis, effectiveConfig, textTypeOverride);
```

- [ ] **Step 5: Run the backend unit suite — expect PASS**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run test
```
Expected: all backend tests pass, including `calculate.service.spec.ts` ('reicht textTypeOverride durch ...').

- [ ] **Step 6: Commit**

```bash
cd /c/Users/info/projects/lesbarkeitsindex
git add apps/backend/src/calculate/result/index.ts apps/backend/src/calculate/calculate.service.ts apps/backend/src/calculate/result/result.spec.ts
git commit -m "refactor(backend): replace ComputeReadabilityOptions bag with plain param" -m "The options object wrapped a single optional field with one production
caller. computeReadability takes textTypeOverride?: TextType directly." -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 8: Barrel cleanup — export only what calculate.service consumes

**Covers findings:** F23

**Files:**
- Modify: `apps/backend/src/calculate/result/index.ts`
- Test: `apps/backend/src/calculate/result/result.spec.ts`

**Interfaces:**
- Consumes: Task 6/7 signatures (the rewritten spec imports must reference them)
- Produces: `./result/index.js` exports exactly `computeReadability`, `ConfigWeights` (defined there) plus re-exports `resolveTextShape` (from `./text-shape.js`) and `type TextType` (from `./text-type.js`) — the four symbols `calculate.service.ts` imports. All `export * from` lines are gone.

Pure refactor: green before and after.

- [ ] **Step 1: Run the backend unit suite — expect PASS (baseline)**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run test
```
Expected: all backend tests pass.

- [ ] **Step 2: Verify the barrel's only external consumers are `calculate.service.ts` and `result.spec.ts`**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && grep -rn "result/index" apps/backend/src ; grep -rn "from './index.js'" apps/backend/src/calculate/result
```
Expected: exactly two hits — `calculate.service.ts` (imports `computeReadability`, `resolveTextShape`, `type ConfigWeights`, `type TextType`) and `result.spec.ts`. If anything else shows up, STOP and reconcile before proceeding.

- [ ] **Step 3: Replace the ten `export * from` lines in `apps/backend/src/calculate/result/index.ts`**

Before:
```ts
export * from './basic-metrics.js';
export * from './grapheme-analysis.js';
export * from './indices.js';
export * from './linguistic-features.js';
export * from './text-features.js';
export * from './title-guard.js';
export * from './score-model.js';
export * from './text-type.js';
export * from './text-shape.js';
export * from './word-complexity.js';
```
After:
```ts
// Nur was der CalculateService konsumiert; Spezifikationen importieren die
// Einzelmodule direkt.
export { resolveTextShape } from './text-shape.js';
export type { TextType } from './text-type.js';
```

- [ ] **Step 4: Rewrite the import block of `result.spec.ts` to use the individual modules (like the five other spec files already do)**

Before:
```ts
import { test, expect, describe } from 'vitest';
import {
  computeReadability,
  type ConfigWeights,
  countWordsWithComplexSyllables,
  countWordsWithMultiMemberedGraphemes,
  countWordsWithRareGraphemes,
  countWordsWithConsonantClusters,
  calculateAverageWordLength,
  calculateAverageSyllablesPerWord,
  calculateAveragePhraseLength,
  calculateAverageSyllablesPerPhrase,
  calculateProportionOfLongWords,
  calculateLix,
  calculateGsmog,
  calculateFleschKincaid,
  calculateWstf,
  calculateTTR,
  calculateAverageCharsPerSyllable,
  calculateAbbreviations,
  calculateNumbers,
  calculateSpecialCharacters,
  calculateProNIndex,
  calculateSubordinateClauseRatio,
  calculatePassiveCount,
  calculateNominalizations,
  calculateRix,
} from './index.js';
```
After:
```ts
import { test, expect, describe } from 'vitest';
import { computeReadability, type ConfigWeights } from './index.js';
import {
  countWordsWithComplexSyllables,
  calculateAverageCharsPerSyllable,
  calculateAverageWordLength,
  calculateAverageSyllablesPerWord,
  calculateAveragePhraseLength,
  calculateAverageSyllablesPerPhrase,
  calculateProportionOfLongWords,
} from './basic-metrics.js';
import {
  countWordsWithMultiMemberedGraphemes,
  countWordsWithRareGraphemes,
  countWordsWithConsonantClusters,
} from './grapheme-analysis.js';
import {
  calculateLix,
  calculateGsmog,
  calculateFleschKincaid,
  calculateWstf,
  calculateRix,
} from './indices.js';
import {
  calculateProNIndex,
  calculateSubordinateClauseRatio,
  calculatePassiveCount,
  calculateNominalizations,
} from './linguistic-features.js';
import {
  calculateTTR,
  calculateAbbreviations,
  calculateNumbers,
  calculateSpecialCharacters,
} from './text-features.js';
```

- [ ] **Step 5: Run the backend unit suite — expect PASS**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run test
```
Expected: all backend tests pass.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/info/projects/lesbarkeitsindex
git add apps/backend/src/calculate/result/index.ts apps/backend/src/calculate/result/result.spec.ts
git commit -m "refactor(backend): trim result barrel to service-consumed exports" -m "Ten export-star lines existed solely so result.spec.ts could import 26
symbols through the barrel. The barrel now exports exactly what
calculate.service.ts consumes; the spec imports the modules directly." -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 9: text-type tidy — inline readingUnitForTextType, share TERMINAL_PUNCTUATION

**Covers findings:** F29, F42

**Files:**
- Modify: `apps/backend/src/calculate/result/text-type.ts`
- Modify: `apps/backend/src/calculate/result/title-guard.ts`
- Modify: `apps/backend/src/calculate/result/text-shape.ts`
- Test: `apps/backend/src/calculate/result/text-type.spec.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (these files are untouched so far)
- Produces: `export const TERMINAL_PUNCTUATION = /[.!?]$/` from `text-type.ts` (imported by `title-guard.ts`). DELETED: `readingUnitForTextType`. `TextType`, `ReadingUnit`, `detectTextType`, `countNonEmptyLines` unchanged.

Pure refactor (the reading-unit mapping stays covered by `text-shape.spec.ts`): green before and after.

- [ ] **Step 1: Run the backend unit suite — expect PASS (baseline)**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run test
```
Expected: all backend tests pass.

- [ ] **Step 2: Export the shared constant and delete `readingUnitForTextType` in `text-type.ts` (2 edits)**

Edit 2a — Before:
```ts
/**
 * Eine Zeile, die mit '.', '!' oder '?' endet, gilt als Satz —
 * konsistent mit dem Titel-Guard. Unicode-Ellipse '…' und Doppelpunkt
 * disqualifizieren NICHT.
 */
const TERMINAL_PUNCTUATION = /[.!?]$/;
```
After:
```ts
/**
 * Eine Zeile, die mit '.', '!' oder '?' endet, gilt als Satz — gemeinsame
 * Konstante für Texttyp-Heuristik und Titel-Guard. Unicode-Ellipse '…' und
 * Doppelpunkt disqualifizieren NICHT.
 */
export const TERMINAL_PUNCTUATION = /[.!?]$/;
```

Edit 2b — Before:
```ts
  return withoutTerminal > withTerminal ? 'list' : 'prose';
}

/** Leseeinheit aus dem Texttyp: Fließtext → Satz, Liste → Zeile. */
export function readingUnitForTextType(textType: TextType): ReadingUnit {
  return textType === 'list' ? 'line' : 'sentence';
}
```
After:
```ts
  return withoutTerminal > withTerminal ? 'list' : 'prose';
}
```

- [ ] **Step 3: Import the constant in `title-guard.ts` (2 edits)**

Edit 3a (add the import directly after the file's opening JSDoc block) — Before:
```ts
 * weiterer Text folgt. Ein erkannter Titel fließt in keine Kennzahl ein.
 */

/** Maximale Länge (getrimmt, UTF-16-Einheiten) einer Titelzeile. */
```
After:
```ts
 * weiterer Text folgt. Ein erkannter Titel fließt in keine Kennzahl ein.
 */

import { TERMINAL_PUNCTUATION } from './text-type.js';

/** Maximale Länge (getrimmt, UTF-16-Einheiten) einer Titelzeile. */
```

Edit 3b (drop the local duplicate) — Before:
```ts
/** Eine Zeile, die mit '.', '!' oder '?' endet, ist ein Satz — kein Titel. */
const TERMINAL_PUNCTUATION = /[.!?]$/;

/** "Weiterer Text folgt" = der Rest enthält mindestens einen Buchstaben oder eine Ziffer. */
```
After:
```ts
/** "Weiterer Text folgt" = der Rest enthält mindestens einen Buchstaben oder eine Ziffer. */
```

- [ ] **Step 4: Inline the reading-unit ternary in `text-shape.ts` (2 edits)**

Edit 4a — Before:
```ts
import {
  detectTextType,
  readingUnitForTextType,
  type ReadingUnit,
  type TextType,
} from './text-type.js';
```
After:
```ts
import { detectTextType, type ReadingUnit, type TextType } from './text-type.js';
```

Edit 4b — Before:
```ts
  const detectedTextType = detectTextType(text);
  const textType: TextType = textTypeOverride ?? detectedTextType;
  const readingUnit = readingUnitForTextType(textType);
```
After:
```ts
  const detectedTextType = detectTextType(text);
  const textType: TextType = textTypeOverride ?? detectedTextType;
  // Leseeinheit aus dem Texttyp: Fließtext → Satz, Liste → Zeile.
  const readingUnit: ReadingUnit = textType === 'list' ? 'line' : 'sentence';
```

- [ ] **Step 5: Drop the deleted function from `text-type.spec.ts` (2 edits)**

Edit 5a — Before:
```ts
import {
  detectTextType,
  countNonEmptyLines,
  readingUnitForTextType,
} from './text-type.js';
```
After:
```ts
import { detectTextType, countNonEmptyLines } from './text-type.js';
```

Edit 5b (delete the describe block at the end of the file) — Before:
```ts
describe('readingUnitForTextType', () => {
  test('Fließtext → Satz', () => {
    expect(readingUnitForTextType('prose')).toBe('sentence');
  });

  test('Liste → Zeile', () => {
    expect(readingUnitForTextType('list')).toBe('line');
  });
});
```
After: (nothing — delete the block; the mapping stays covered by `text-shape.spec.ts`, which asserts `readingUnit: 'sentence'` for prose and `'line'` for lists)

- [ ] **Step 6: Run the backend unit suite — expect PASS**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run test
```
Expected: all backend tests pass.

- [ ] **Step 7: Commit**

```bash
cd /c/Users/info/projects/lesbarkeitsindex
git add apps/backend/src/calculate/result/text-type.ts apps/backend/src/calculate/result/title-guard.ts apps/backend/src/calculate/result/text-shape.ts apps/backend/src/calculate/result/text-type.spec.ts
git commit -m "refactor(backend): inline readingUnitForTextType, share TERMINAL_PUNCTUATION" -m "The one-line ternary had a single production caller (resolveTextShape);
the terminal-punctuation regex was defined identically in text-type.ts
and title-guard.ts (text-type's doc comment demands consistency with the
title guard) — now one exported constant." -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 10: api-client — plain TypeScript types instead of zod schemas

**Covers findings:** F24, F36

**Files:**
- Modify: `packages/api-client/src/index.ts`
- Modify: `packages/api-client/package.json`
- Modify: `pnpm-lock.yaml` (via `pnpm install`)
- Test: existing frontend unit suite (no test-file changes)

**Interfaces:**
- Consumes: Task 1 state of `packages/api-client/src/index.ts` (six fields already removed from `resultDataSchema`)
- Produces: `export type TextType = 'prose' | 'list'`, `export type ReadingUnit = 'sentence' | 'line'`, `export interface Config`, `export interface ResultData` (plain types, same field sets). DELETED: `textTypeSchema`, `readingUnitSchema`, `configSchema`, `resultDataSchema`, the `zod` dependency, and the `version`/`main`/`types` manifest fields. `detectTextType`, `ResultsResponse`, `CalculateRequest`, `UpdateConfigRequest`, `createApiClient(baseURL)` unchanged in this task.

The schemas are used exclusively via `z.infer` — there is no `.parse` anywhere (verified). Keep the deliberately duplicated `detectTextType` untouched.

- [ ] **Step 1: Verify no runtime zod usage and no external schema imports**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && grep -rn --include='*.ts' --include='*.vue' -E 'textTypeSchema|readingUnitSchema|configSchema|resultDataSchema' apps packages | grep -v 'packages/api-client/src/index.ts' || echo NO-EXTERNAL-CONSUMERS
grep -n '\.parse(' packages/api-client/src/index.ts || echo NO-PARSE
```
Expected: `NO-EXTERNAL-CONSUMERS` and `NO-PARSE`. If not, STOP and reconcile.

- [ ] **Step 2: Run the frontend unit suite — expect PASS (baseline)**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && pnpm --filter frontend run test:unit
```
Expected: all frontend unit tests pass.

- [ ] **Step 3: Rewrite `packages/api-client/src/index.ts` — complete new file content**

(The `detectTextType` body and `createApiClient` are byte-identical to the current file; the schemas become plain types. Preserve the German typographic quotes in the comments.)

```ts
import { ofetch, type $Fetch } from 'ofetch';

/** Texttyp eines Textes (ADR 0002): Fließtext oder Liste. */
export type TextType = 'prose' | 'list';

/** Leseeinheit (ADR 0002): Satz bei Fließtext, Zeile bei Liste. */
export type ReadingUnit = 'sentence' | 'line';

/**
 * Heuristische Texttyp-Erkennung (ADR 0002, Issue #30). Liefert „list", wenn
 * die Mehrheit der nicht-leeren Zeilen kein Satzendzeichen (`.`, `!`, `?`)
 * trägt; sonst „prose". Die kanonische Implementierung lebt im Backend; diese
 * Kopie nutzen Backend und Frontend, damit die Erkennung an beiden Stellen
 * identisch bleibt — die Oberfläche zeigt sie schon vor dem Absenden an.
 */
export function detectTextType(text: string): TextType {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return 'prose';

  let withoutTerminal = 0;
  let withTerminal = 0;
  for (const line of lines) {
    if (/[.!?]$/.test(line)) {
      withTerminal++;
    } else {
      withoutTerminal++;
    }
  }
  return withoutTerminal > withTerminal ? 'list' : 'prose';
}

/**
 * Datenvertrag der API — einzige Quelle der Wahrheit für die Antwortform.
 * Das Backend liefert durchgängig Zahlen (kein Decimal-String mehr), daher
 * sind alle Kennzahlen `number`.
 */
export interface Config {
  id: string;
  createdAt: string;
  alpha: number;
  weightComplexSyllables: number;
  weightMultiMemberedGraphemes: number;
  weightRareGraphemes: number;
  weightConsonantClusters: number;
}

export interface ResultData {
  id: string;
  createdAt: string;
  countWords: number;
  countSyllables: number;
  countWordsWithComplexSyllables: number;
  countWordsWithConsonantClusters: number;
  countWordsWithMultiMemberedGraphemes: number;
  countWordsWithRareGraphemes: number;
  countWordsWithOneSyllable: number;
  countWordsWithTwoSyllable: number;
  countWordsWithThreeSyllable: number;
  countWordsWithFourSyllable: number;
  countWordsWithFiveSyllable: number;
  averageWordLength: number;
  averagePhraseLength: number;
  averageCharsPerSyllable: number;
  averageSyllablesPerWord: number;
  averageSyllablesPerPhrase: number;
  proportionOfLongWords: number;
  proportionOfWordsWithComplexSyllables: number;
  proportionOfWordsWithConsonantClusters: number;
  proportionOfWordsWithMultiMemberedGraphemes: number;
  proportionOfWordsWithRareGraphemes: number;
  lix: number;
  ratte: number;
  gsmog: number;
  wst4: number;
  fleschKincaid: number;
  ttr: number;
  countAbbreviations: number;
  countNumbers: number;
  countSpecialCharacters: number;
  proNIndex: number;
  subordinateClauseRatio: number;
  passiveCount: number;
  nominalizationCount: number;
  wordComplexity: number;
  lueLix: number;
  level: number;
  textType: TextType;
  readingUnit: ReadingUnit;
  detectedTextType: TextType;
  countReadingUnits: number;
  text: string;
  title: string;
  words: string[];
  wordsWithOneSyllable: string[];
  wordsWithTwoSyllables: string[];
  wordsWithThreeSyllables: string[];
  wordsWithFourSyllables: string[];
  wordsWithFiveSyllables: string[];
  phrases: string[];
  config: Config;
  configId: string;
}

export interface ResultsResponse {
  data: ResultData[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CalculateRequest {
  text: string;
  saveResult?: boolean;
  alpha?: number;
  weightComplexSyllables?: number;
  weightMultiMemberedGraphemes?: number;
  weightRareGraphemes?: number;
  weightConsonantClusters?: number;
  /** Manueller Texttyp-Override (ADR 0002); übersteuert die Heuristik. */
  textType?: TextType;
}

export interface UpdateConfigRequest {
  alpha: number;
  weightComplexSyllables: number;
  weightMultiMemberedGraphemes: number;
  weightRareGraphemes: number;
  weightConsonantClusters: number;
}

export function createApiClient(baseURL: string) {
  const api: $Fetch = ofetch.create({
    baseURL,
    credentials: 'include',
  });

  return {
    getConfig: () => api<Config>('/config'),
    updateConfig: (body: UpdateConfigRequest) => api<Config>('/config', { method: 'POST', body }),
    calculate: (body: CalculateRequest) => api<ResultData>('/calculate', { method: 'POST', body }),
    getResults: (query?: { page?: number; limit?: number }) =>
      api<ResultsResponse>('/results', { query }),
  };
}
```

- [ ] **Step 4: Rewrite `packages/api-client/package.json` — complete new file content**

(Drops `zod` from dependencies and the redundant `version`/`main`/`types` fields; `exports` already points at `./src/index.ts` and the package is private with a single `workspace:*` consumer.)

```json
{
  "name": "@lesbarkeitsindex/api-client",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "ofetch": "^1.4.0"
  }
}
```

- [ ] **Step 5: Reinstall to update the lockfile**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && pnpm install
```
Expected: succeeds; `pnpm-lock.yaml` drops the api-client → zod edge.

- [ ] **Step 6: Run the frontend unit suite — expect PASS**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && pnpm --filter frontend run test:unit
```
Expected: all frontend unit tests pass (consumers import only `TextType`, `ResultData`, `Config`, `ResultsResponse`, `detectTextType`, `createApiClient` — all still exported).

- [ ] **Step 7: Commit**

```bash
cd /c/Users/info/projects/lesbarkeitsindex
git add packages/api-client/src/index.ts packages/api-client/package.json pnpm-lock.yaml
git commit -m "refactor(api-client): replace zod schemas with plain types" -m "All four schemas were consumed exclusively via z.infer — no .parse
anywhere. Plain union types/interfaces carry the same contract without
the dependency. Also drops redundant version/main/types manifest fields
(exports already points at ./src/index.ts; package is private)." -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 11: api-client — inject the fetch client, drop ofetch

**Covers findings:** F48

**Files:**
- Modify: `packages/api-client/src/index.ts`
- Modify: `packages/api-client/package.json`
- Modify: `apps/frontend/app/composables/useApiClient.ts`
- Modify: `CLAUDE.md` (two stale API-client lines: factory signature + tech-stack entry)
- Modify: `pnpm-lock.yaml` (via `pnpm install`)
- Test: existing frontend unit suite (no test-file changes — `index.test.ts` and `result-view.test.ts` mock `~/composables/useApiClient` wholesale and never touch `$fetch`)

**Interfaces:**
- Consumes: Task 10 state of `packages/api-client` (plain types, no zod)
- Produces: `export type ApiFetch = <T>(path: string, options?: { method?: 'GET' | 'POST'; body?: Record<string, unknown>; query?: Record<string, unknown> }) => Promise<T>` and `createApiClient(fetcher: ApiFetch)`. `CalculateRequest` and `UpdateConfigRequest` become TYPE ALIASES (object-literal types carry the implicit index signature required for assignability to `body`; interfaces do not). DELETED: the `ofetch` import and dependency — the package becomes zero-dependency.

Design note (verified against ofetch 1.5.1, the version Nuxt 4 bundles, with `tsc --strict`): `$Fetch` and the result of `$fetch.create(...)` are directly assignable to `ApiFetch` — no cast needed. Nuxt's global `$fetch` IS ofetch, so runtime behavior is identical.

- [ ] **Step 1: Replace the ofetch usage in `packages/api-client/src/index.ts` (3 edits)**

Edit 1a (drop the import — the file then starts with the TextType comment) — Before:
```ts
import { ofetch, type $Fetch } from 'ofetch';

/** Texttyp eines Textes (ADR 0002): Fließtext oder Liste. */
```
After:
```ts
/** Texttyp eines Textes (ADR 0002): Fließtext oder Liste. */
```

Edit 1b (request payloads become type aliases) — Before:
```ts
export interface CalculateRequest {
  text: string;
  saveResult?: boolean;
  alpha?: number;
  weightComplexSyllables?: number;
  weightMultiMemberedGraphemes?: number;
  weightRareGraphemes?: number;
  weightConsonantClusters?: number;
  /** Manueller Texttyp-Override (ADR 0002); übersteuert die Heuristik. */
  textType?: TextType;
}

export interface UpdateConfigRequest {
  alpha: number;
  weightComplexSyllables: number;
  weightMultiMemberedGraphemes: number;
  weightRareGraphemes: number;
  weightConsonantClusters: number;
}
```
After:
```ts
/*
 * Request-Typen als Typaliasse, nicht als `interface`: Nur Objektliteral-Typen
 * tragen die implizite Indexsignatur, die sie dem `body`-Feld von {@link ApiFetch}
 * (`Record<string, unknown>`) zuweisbar macht.
 */
export type CalculateRequest = {
  text: string;
  saveResult?: boolean;
  alpha?: number;
  weightComplexSyllables?: number;
  weightMultiMemberedGraphemes?: number;
  weightRareGraphemes?: number;
  weightConsonantClusters?: number;
  /** Manueller Texttyp-Override (ADR 0002); übersteuert die Heuristik. */
  textType?: TextType;
};

export type UpdateConfigRequest = {
  alpha: number;
  weightComplexSyllables: number;
  weightMultiMemberedGraphemes: number;
  weightRareGraphemes: number;
  weightConsonantClusters: number;
};
```

Edit 1c (inject the fetcher) — Before:
```ts
export function createApiClient(baseURL: string) {
  const api: $Fetch = ofetch.create({
    baseURL,
    credentials: 'include',
  });

  return {
    getConfig: () => api<Config>('/config'),
    updateConfig: (body: UpdateConfigRequest) => api<Config>('/config', { method: 'POST', body }),
    calculate: (body: CalculateRequest) => api<ResultData>('/calculate', { method: 'POST', body }),
    getResults: (query?: { page?: number; limit?: number }) =>
      api<ResultsResponse>('/results', { query }),
  };
}
```
After:
```ts
/**
 * Minimaler Fetch-Vertrag des API-Clients. Nuxts globales `$fetch` (ofetch)
 * erfüllt ihn direkt — Basis-URL und Credentials konfiguriert der Aufrufer,
 * z. B. via `$fetch.create({ baseURL, credentials: 'include' })`. Der Client
 * selbst bleibt abhängigkeitsfrei.
 */
export type ApiFetch = <T>(
  path: string,
  options?: {
    method?: 'GET' | 'POST';
    body?: Record<string, unknown>;
    query?: Record<string, unknown>;
  },
) => Promise<T>;

export function createApiClient(fetcher: ApiFetch) {
  return {
    getConfig: () => fetcher<Config>('/config'),
    updateConfig: (body: UpdateConfigRequest) =>
      fetcher<Config>('/config', { method: 'POST', body }),
    calculate: (body: CalculateRequest) =>
      fetcher<ResultData>('/calculate', { method: 'POST', body }),
    getResults: (query?: { page?: number; limit?: number }) =>
      fetcher<ResultsResponse>('/results', { query }),
  };
}
```

- [ ] **Step 2: Make the package zero-dependency — rewrite `packages/api-client/package.json`**

Complete new file content:

```json
{
  "name": "@lesbarkeitsindex/api-client",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

- [ ] **Step 3: Pass a configured `$fetch` instance in `apps/frontend/app/composables/useApiClient.ts`**

Complete new file content:

```ts
import { createApiClient, type ResultData } from '@lesbarkeitsindex/api-client';
export type { ResultData };
export type { ResultsResponse as ResultsData } from '@lesbarkeitsindex/api-client';

export const useApiClient = (): ReturnType<typeof createApiClient> => {
  const runtime = useRuntimeConfig();
  // Nuxts globales `$fetch` ist ofetch: gleiche Semantik wie zuvor, nur
  // konfiguriert die App jetzt Basis-URL und Cookie-Credentials selbst.
  return createApiClient(
    $fetch.create({ baseURL: runtime.public.apiBase, credentials: 'include' }),
  );
};
```

- [ ] **Step 4: Update the stale API-client lines in `CLAUDE.md` (2 edits)**

Edit 4a (Code Conventions) — Before:
```markdown
- API client: `createApiClient(baseURL)` from `@lesbarkeitsindex/api-client`
```
After:
```markdown
- API client: `createApiClient(fetcher)` from `@lesbarkeitsindex/api-client` — caller supplies a configured `$fetch`/ofetch instance (baseURL + credentials)
```

Edit 4b (Tech Stack Rules) — Before:
```markdown
- **API client**: `@lesbarkeitsindex/api-client` package using `ofetch` for typed frontend → backend calls
```
After:
```markdown
- **API client**: `@lesbarkeitsindex/api-client` package (zero-dependency) — the frontend injects Nuxt's `$fetch` (ofetch) via `createApiClient(fetcher)` for typed frontend → backend calls
```

- [ ] **Step 5: Reinstall to update the lockfile**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && pnpm install
```
Expected: succeeds; api-client has no dependencies left in `pnpm-lock.yaml`.

- [ ] **Step 6: Run the frontend unit suite — expect PASS**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && pnpm --filter frontend run test:unit
```
Expected: all frontend unit tests pass (the api-client is only exercised through the mocked `useApiClient` composable; type assignability was verified against ofetch 1.5.1 during planning).

- [ ] **Step 7: Verify ofetch is gone from the package**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && grep -rn --exclude-dir=node_modules 'ofetch' packages/api-client || echo CLEAN
```
Expected output: `CLEAN`.

- [ ] **Step 8: Commit**

```bash
cd /c/Users/info/projects/lesbarkeitsindex
git add packages/api-client/src/index.ts packages/api-client/package.json apps/frontend/app/composables/useApiClient.ts CLAUDE.md pnpm-lock.yaml
git commit -m "refactor(api-client): inject \$fetch instance, drop ofetch dependency" -m "createApiClient now accepts a minimal ApiFetch contract instead of
building its own ofetch instance. The frontend passes
\$fetch.create({ baseURL, credentials: 'include' }) — Nuxt's global
\$fetch IS ofetch, so behavior is identical and the package becomes
zero-dependency. Request payload types become type aliases (implicit
index signature) for body assignability." -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```
## Section 2: Backend-Infrastruktur (Tasks 12–15)

All commands run from the repo root `C:/Users/info/projects/lesbarkeitsindex` (each command below includes the `cd`). Prerequisite (from plan preamble): `pnpm install` has been run and the Prisma client is generated (the backend `postinstall` script runs `prisma generate` automatically).

### Task 12: Zod-Schema ersetzt handgerollte Sidecar-Antwort-Validierung

**Covers findings:** F5
**Files:**
- Modify: `apps/backend/src/r-sidecar/r-sidecar.service.ts`
- Test: `apps/backend/src/r-sidecar/r-sidecar.service.spec.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `export type TextAnalysis = z.infer<typeof TextAnalysisSchema>` (exported from `apps/backend/src/r-sidecar/r-sidecar.service.ts`; shape unchanged — `{ sentences: string[]; words: string[]; syllablesPerWord: number[]; posTags: string[] }` — but the `readonly` modifiers are gone; consumed by `apps/backend/src/calculate/result/index.ts` in a parameter position, which accepts both). `RSidecarService.analyzeText(text: string): Promise<TextAnalysis>` signature unchanged.

Note on test-first: `r-sidecar.service.spec.ts` does NOT assert on the bespoke error strings — every negative test uses message-agnostic `.rejects.toThrow()`. There is therefore no honest "red" step; this is a refactor under existing coverage (suite green before AND after). We additionally pin down the one message contract that matters: `CalculateService.calculate` (in `apps/backend/src/calculate/calculate.service.ts`) maps errors whose message contains `'R sidecar'` to a 503 `ServiceUnavailableException` — the new Zod error message must keep that prefix.

- [ ] **Step 1: Run the existing backend unit suite (baseline green).**

  ```sh
  cd C:/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run test
  ```

  Expected: exit code 0, all test files pass (the r-sidecar spec currently contains 5 tests, all passing).

- [ ] **Step 2: Add a message-prefix contract test to the spec.** This test documents the `'R sidecar'` prefix that `CalculateService` relies on for its 503 mapping. It passes against the OLD code too (old messages also start with "R sidecar") — it is a pin, not a red test.

  In `apps/backend/src/r-sidecar/r-sidecar.service.spec.ts` — Before:

  ```ts
    test('throws on missing fields in response', async () => {
      const incomplete = { sentences: ['Test.'], words: ['Test'] };

      globalThis.fetch = vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify(incomplete), { status: 200 })),
      ) as typeof fetch;

      const service = createService();
      await expect(service.analyzeText('Test.')).rejects.toThrow();
    });
  });
  ```

  After:

  ```ts
    test('throws on missing fields in response', async () => {
      const incomplete = { sentences: ['Test.'], words: ['Test'] };

      globalThis.fetch = vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify(incomplete), { status: 200 })),
      ) as typeof fetch;

      const service = createService();
      await expect(service.analyzeText('Test.')).rejects.toThrow();
    });

    test('validation errors keep the "R sidecar" message prefix (503 mapping in CalculateService)', async () => {
      const badTypes = {
        sentences: ['Test.'],
        words: ['Test', 42],
        syllablesPerWord: [1, 1],
        posTags: ['NN', 'NN'],
      };

      globalThis.fetch = vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify(badTypes), { status: 200 })),
      ) as typeof fetch;

      const service = createService();
      await expect(service.analyzeText('Test.')).rejects.toThrow(/R sidecar/);
    });
  });
  ```

- [ ] **Step 3: Run the r-sidecar spec — expect PASS (6 tests).**

  ```sh
  cd C:/Users/info/projects/lesbarkeitsindex && pnpm --filter backend exec vitest run src/r-sidecar/r-sidecar.service.spec.ts
  ```

  Expected: exit code 0, 6 tests pass (the new test passes against the old implementation as well — old bespoke messages also contain "R sidecar").

- [ ] **Step 4: Replace the hand-rolled type with a Zod schema.** In `apps/backend/src/r-sidecar/r-sidecar.service.ts` — Before:

  ```ts
  import { Injectable } from '@nestjs/common';

  const TIMEOUT_MS = 30_000;

  export type TextAnalysis = {
    readonly sentences: readonly string[];
    readonly words: readonly string[];
    readonly syllablesPerWord: readonly number[];
    readonly posTags: readonly string[];
  };
  ```

  After:

  ```ts
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
  ```

- [ ] **Step 5: Replace the ~48-line if-throw cascade with one `safeParse`.** In `apps/backend/src/r-sidecar/r-sidecar.service.ts` — Before:

  ```ts
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
  ```

  After:

  ```ts
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
  ```

- [ ] **Step 6: Run the full backend unit suite — expect green.**

  ```sh
  cd C:/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run test
  ```

  Expected: exit code 0, all test files pass (r-sidecar spec: 6/6 — including all pre-existing negative tests, since Zod rejects the same inputs).

- [ ] **Step 7: Commit.**

  ```sh
  cd C:/Users/info/projects/lesbarkeitsindex && git add apps/backend/src/r-sidecar/r-sidecar.service.ts apps/backend/src/r-sidecar/r-sidecar.service.spec.ts && git commit -m "refactor(backend): zod schema replaces hand-rolled sidecar response checks" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

  Expected: commit created on the working branch.

### Task 13: `fromNodeHeaders` aus better-auth ersetzt `toWebHeaders`

**Covers findings:** F10
**Files:**
- Modify: `apps/backend/src/auth/auth.controller.ts`, `apps/backend/src/auth/auth.guard.ts`
- Delete: `apps/backend/src/auth/web-headers.ts`

**Interfaces:**
- Consumes: nothing
- Produces: nothing (the deleted `toWebHeaders` had exactly 2 callers, both repointed here; no spec file for `web-headers.ts` exists — verified: `apps/backend/src/auth/` contains only `auth.controller.ts`, `auth.guard.ts`, `auth.module.ts`, `auth.service.ts`, `web-headers.ts`)

Verified in the installed `better-auth@1.5.6`: `better-auth/node` exports `fromNodeHeaders(nodeHeaders: IncomingHttpHeaders): Headers` with identical semantics to `toWebHeaders` (skips `undefined`, `append` for array headers, `set` otherwise). `FastifyRequest['headers']` is `IncomingHttpHeaders`-compatible.

- [ ] **Step 1: Run the backend unit suite (baseline green — pure refactor, no behavior change).**

  ```sh
  cd C:/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run test
  ```

  Expected: exit code 0, all tests pass.

- [ ] **Step 2: Repoint `auth.controller.ts` to `fromNodeHeaders`.** Before:

  ```ts
  import { All, Controller, Req, Res } from '@nestjs/common';
  import { FastifyReply, FastifyRequest } from 'fastify';
  import { AuthService } from './auth.service.js';
  import { toWebHeaders } from './web-headers.js';

  @Controller('api/auth')
  export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @All('*')
    async handleAuth(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
      const url = new URL(req.url, `http://${req.hostname}`);
      const headers = toWebHeaders(req.headers);
  ```

  After:

  ```ts
  import { All, Controller, Req, Res } from '@nestjs/common';
  import { FastifyReply, FastifyRequest } from 'fastify';
  import { fromNodeHeaders } from 'better-auth/node';
  import { AuthService } from './auth.service.js';

  @Controller('api/auth')
  export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @All('*')
    async handleAuth(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
      const url = new URL(req.url, `http://${req.hostname}`);
      const headers = fromNodeHeaders(req.headers);
  ```

- [ ] **Step 3: Repoint `auth.guard.ts` to `fromNodeHeaders`.** Before:

  ```ts
  import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
  import { FastifyRequest } from 'fastify';
  import { AuthService } from './auth.service.js';
  import { toWebHeaders } from './web-headers.js';

  @Injectable()
  export class AuthGuard implements CanActivate {
    constructor(private readonly authService: AuthService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest<FastifyRequest>();
      const headers = toWebHeaders(request.headers);
  ```

  After:

  ```ts
  import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
  import { FastifyRequest } from 'fastify';
  import { fromNodeHeaders } from 'better-auth/node';
  import { AuthService } from './auth.service.js';

  @Injectable()
  export class AuthGuard implements CanActivate {
    constructor(private readonly authService: AuthService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest<FastifyRequest>();
      const headers = fromNodeHeaders(request.headers);
  ```

- [ ] **Step 4: Delete the helper file (staged).**

  ```sh
  cd C:/Users/info/projects/lesbarkeitsindex && git rm apps/backend/src/auth/web-headers.ts
  ```

  Expected: `rm 'apps/backend/src/auth/web-headers.ts'`.

- [ ] **Step 5: Verify zero remaining references.**

  ```sh
  cd C:/Users/info/projects/lesbarkeitsindex && grep -rn "toWebHeaders\|web-headers" apps/backend/src apps/backend/test; echo "exit=$?"
  ```

  Expected: no output lines, `exit=1` (grep found nothing).

- [ ] **Step 6: Type-check via build (nest-cli has `typeCheck: true`).**

  ```sh
  cd C:/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run build
  ```

  Expected: exit code 0, `dist/` produced, no type errors (validates the `better-auth/node` import under `moduleResolution: NodeNext`).

- [ ] **Step 7: Run the backend unit suite — expect green (after).**

  ```sh
  cd C:/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run test
  ```

  Expected: exit code 0, all tests pass.

- [ ] **Step 8: Commit.**

  ```sh
  cd C:/Users/info/projects/lesbarkeitsindex && git add apps/backend/src/auth/auth.controller.ts apps/backend/src/auth/auth.guard.ts apps/backend/src/auth/web-headers.ts && git commit -m "refactor(backend): use better-auth fromNodeHeaders, drop web-headers helper" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

  Expected: commit created (the `git add` on the deleted path stages the removal; it was already staged by `git rm`, re-adding is a no-op).

### Task 14: Native env-Ladung ersetzt @nestjs/config und dotenv

**Covers findings:** F28, F44
**Files:**
- Modify: `apps/backend/src/main.ts`, `apps/backend/src/app.module.ts`, `apps/backend/prisma.config.ts`, `apps/backend/package.json`, `pnpm-lock.yaml`

**Interfaces:**
- Consumes: nothing
- Produces: nothing (env loading stays a side effect; all services keep reading `process.env` in their constructors, which run during `NestFactory.create` — i.e. after the top-level env load in `main.ts`)

Verified: `ConfigService` is injected nowhere (`grep -rn ConfigService apps/backend/src apps/backend/test` → no matches); `@nestjs/config` appears only in `app.module.ts`; `dotenv` only in `prisma.config.ts`; no test imports `AppModule`, so no test depends on `ConfigModule` env loading. Path math: both `src/` and compiled `dist/` sit three levels below the repo root, so `resolve(__dirname, '..', '..', '..', '.env')` hits the root `.env` in dev; in the Docker runtime image it resolves to `/app/.env`, which does not exist — hence the `existsSync` guard (`process.loadEnvFile` throws on a missing file, unlike dotenv's silent no-op). Node: local v24, Docker `node:22-alpine` — both have `process.loadEnvFile` (>= 20.12).

- [ ] **Step 1: Run the backend unit suite (baseline green).**

  ```sh
  cd C:/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run test
  ```

  Expected: exit code 0, all tests pass.

- [ ] **Step 2: Load the root `.env` natively at the top of `main.ts`.** Before:

  ```ts
  import 'reflect-metadata';
  import { NestFactory } from '@nestjs/core';
  import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
  import { Logger } from '@nestjs/common';
  import { AppModule } from './app.module.js';
  import { PrismaService } from './prisma/prisma.service.js';
  import { AuthService } from './auth/auth.service.js';
  import { APIError } from 'better-auth';

  const logger = new Logger('Bootstrap');
  ```

  After:

  ```ts
  import 'reflect-metadata';
  import { existsSync } from 'node:fs';
  import { resolve } from 'node:path';
  import { NestFactory } from '@nestjs/core';
  import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
  import { Logger } from '@nestjs/common';
  import { AppModule } from './app.module.js';
  import { PrismaService } from './prisma/prisma.service.js';
  import { AuthService } from './auth/auth.service.js';
  import { APIError } from 'better-auth';

  // Root-.env laden (lokale Entwicklung). Im Docker-Runtime-Image existiert keine
  // .env-Datei — dort kommen die Variablen aus der Container-Umgebung. Der Guard
  // ist nötig, weil process.loadEnvFile bei fehlender Datei wirft. __dirname liegt
  // sowohl als src/ (Dev/Vitest) als auch als dist/ (Build) drei Ebenen unter der
  // Repo-Wurzel.
  const envFile = resolve(__dirname, '..', '..', '..', '.env');
  if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
  }

  const logger = new Logger('Bootstrap');
  ```

- [ ] **Step 3: Drop `ConfigModule.forRoot` from `app.module.ts`.** Before:

  ```ts
  import { resolve } from 'node:path';
  import { Module } from '@nestjs/common';
  import { ConfigModule } from '@nestjs/config';
  import { PrismaModule } from './prisma/prisma.module.js';
  import { AuthModule } from './auth/auth.module.js';
  import { RSidecarModule } from './r-sidecar/r-sidecar.module.js';
  import { AppConfigModule } from './config/config.module.js';
  import { CalculateModule } from './calculate/calculate.module.js';
  import { ResultsModule } from './results/results.module.js';
  import { HealthController } from './health.controller.js';

  @Module({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: resolve(__dirname, '..', '..', '..', '.env'),
      }),
      PrismaModule,
      AuthModule,
      RSidecarModule,
      AppConfigModule,
      CalculateModule,
      ResultsModule,
    ],
    controllers: [HealthController],
  })
  export class AppModule {}
  ```

  After:

  ```ts
  import { Module } from '@nestjs/common';
  import { PrismaModule } from './prisma/prisma.module.js';
  import { AuthModule } from './auth/auth.module.js';
  import { RSidecarModule } from './r-sidecar/r-sidecar.module.js';
  import { AppConfigModule } from './config/config.module.js';
  import { CalculateModule } from './calculate/calculate.module.js';
  import { ResultsModule } from './results/results.module.js';
  import { HealthController } from './health.controller.js';

  @Module({
    imports: [
      PrismaModule,
      AuthModule,
      RSidecarModule,
      AppConfigModule,
      CalculateModule,
      ResultsModule,
    ],
    controllers: [HealthController],
  })
  export class AppModule {}
  ```

- [ ] **Step 4: Replace dotenv in `prisma.config.ts` (complete new file content).** The `existsSync` guard preserves dotenv's silent-missing-file behavior — the Docker build stage sets `DATABASE_URL` directly and has no root `.env`.

  ```ts
  import { existsSync } from 'node:fs';
  import { resolve } from 'node:path';
  import { defineConfig } from 'prisma/config';

  // Root-.env laden, falls vorhanden (im Docker-Build fehlt sie — dort kommt
  // DATABASE_URL aus der Umgebung; process.loadEnvFile wirft bei fehlender Datei).
  const envFile = resolve(__dirname, '..', '..', '.env');
  if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
  }

  export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
      path: 'prisma/migrations',
    },
    datasource: {
      url: process.env['DATABASE_URL'],
    },
  });
  ```

- [ ] **Step 5: Remove `@nestjs/config` and `dotenv` from `apps/backend/package.json`.** Before:

  ```json
    "dependencies": {
      "@nestjs/common": "^11.1.0",
      "@nestjs/config": "^4.0.0",
      "@nestjs/core": "^11.1.0",
      "@nestjs/platform-fastify": "^11.1.0",
      "@prisma/adapter-pg": "^7.1.0",
      "@prisma/client": "^7.1.0",
      "better-auth": "^1.4.5",
      "dotenv": "^17.4.1",
      "pg": "^8.16.3",
  ```

  After:

  ```json
    "dependencies": {
      "@nestjs/common": "^11.1.0",
      "@nestjs/core": "^11.1.0",
      "@nestjs/platform-fastify": "^11.1.0",
      "@prisma/adapter-pg": "^7.1.0",
      "@prisma/client": "^7.1.0",
      "better-auth": "^1.4.5",
      "pg": "^8.16.3",
  ```

- [ ] **Step 6: Reinstall to update the lockfile (also re-runs the backend `postinstall` → `prisma generate`, which exercises the new `prisma.config.ts`).**

  ```sh
  cd C:/Users/info/projects/lesbarkeitsindex && pnpm install
  ```

  Expected: exit code 0, `pnpm-lock.yaml` updated (entries for `@nestjs/config` and `dotenv` as backend deps removed), `prisma generate` in postinstall succeeds.

- [ ] **Step 7: Verify zero remaining references.**

  ```sh
  cd C:/Users/info/projects/lesbarkeitsindex && grep -rn "@nestjs/config\|from 'dotenv'" apps/backend/src apps/backend/test apps/backend/prisma.config.ts apps/backend/package.json; echo "exit=$?"
  ```

  Expected: no output lines, `exit=1`.

- [ ] **Step 8: Run the backend unit suite — expect green (after).**

  ```sh
  cd C:/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run test
  ```

  Expected: exit code 0, all tests pass.

- [ ] **Step 9: Boot check via build (nest-cli `typeCheck: true` — this is the F44-mandated smoke check; a live boot additionally needs the docker stack and is not required here).**

  ```sh
  cd C:/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run build
  ```

  Expected: exit code 0, no type errors, `dist/main.js` produced.

- [ ] **Step 10: Commit.**

  ```sh
  cd C:/Users/info/projects/lesbarkeitsindex && git add apps/backend/src/main.ts apps/backend/src/app.module.ts apps/backend/prisma.config.ts apps/backend/package.json pnpm-lock.yaml && git commit -m "refactor(backend): native process.loadEnvFile, drop @nestjs/config and dotenv" -m "ConfigService was injected nowhere; all services read process.env. loadEnvFile is guarded with existsSync because the Docker runtime image ships no .env file." -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

  Expected: commit created.

### Task 15: Backend-Kleinaufräumarbeiten (Guard-Provider, @HttpCode(OK), toter vitest-exclude, @nestjs/schematics)

**Covers findings:** F39, F40, F41, F45
**Files:**
- Modify: `apps/backend/src/auth/auth.module.ts`, `apps/backend/src/results/results.controller.ts`, `apps/backend/vitest.config.ts`, `apps/backend/package.json`, `pnpm-lock.yaml`

**Interfaces:**
- Consumes: nothing
- Produces: nothing (`AuthModule` keeps exporting `AuthService`; `AuthGuard` stays exported from `apps/backend/src/auth/auth.guard.ts` and keeps being referenced via `@UseGuards(AuthGuard)` in `config.controller.ts` — enhancer guards are instantiated per-context by Nest with DI resolved from the host module, so no provider registration is needed; `AppConfigModule` imports `AuthModule`, which provides the `AuthService` the guard injects)

Verified: `AuthGuard` is referenced only in `config.controller.ts` (`@UseGuards`) and `test/config.e2e-spec.ts` (`overrideGuard`, works without provider registration). `HttpCode`/`HttpStatus` in `results.controller.ts` are used only for the removed decorator. `@nestjs/cli@11.0.17` declares `@nestjs/schematics@^11.0.1` as its own dependency, and no `nest g` usage exists anywhere in the repo — `nest-cli.json`'s `"collection": "@nestjs/schematics"` keeps resolving through the CLI's own copy. The vitest `exclude` entries are fully shadowed: `include: ['src/**/*.spec.ts']` never matches `node_modules`, `dist`, or `test/**`, and `node_modules`/`dist` are Vitest defaults anyway.

- [ ] **Step 1: Run the backend unit suite (baseline green). Note the number of test files/tests reported — it must be identical after the vitest.config change.**

  ```sh
  cd C:/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run test
  ```

  Expected: exit code 0, all tests pass. Record the "Test Files N passed" count.

- [ ] **Step 2 (F39): Drop `AuthGuard` from `AuthModule` providers/exports.** In `apps/backend/src/auth/auth.module.ts` — Before (complete current file):

  ```ts
  import { Module } from '@nestjs/common';
  import { AuthService } from './auth.service.js';
  import { AuthController } from './auth.controller.js';
  import { AuthGuard } from './auth.guard.js';

  @Module({
    controllers: [AuthController],
    providers: [AuthService, AuthGuard],
    exports: [AuthService, AuthGuard],
  })
  export class AuthModule {}
  ```

  After (complete new file):

  ```ts
  import { Module } from '@nestjs/common';
  import { AuthService } from './auth.service.js';
  import { AuthController } from './auth.controller.js';

  @Module({
    controllers: [AuthController],
    providers: [AuthService],
    exports: [AuthService],
  })
  export class AuthModule {}
  ```

- [ ] **Step 3 (F40): Remove the redundant `@HttpCode(HttpStatus.OK)` from the GET handler.** (The `@HttpCode(HttpStatus.OK)` overrides on POST handlers in `config.controller.ts` and the calculate controller STAY — POST defaults to 201.) In `apps/backend/src/results/results.controller.ts` — Before:

  ```ts
  import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
  import { PrismaService } from '../prisma/prisma.service.js';
  import { toJsonNumbers } from '../serialize.js';

  @Controller('results')
  export class ResultsController {
    constructor(private readonly prisma: PrismaService) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    async getResults(@Query('page') pageParam?: string, @Query('limit') limitParam?: string) {
  ```

  After:

  ```ts
  import { Controller, Get, Query } from '@nestjs/common';
  import { PrismaService } from '../prisma/prisma.service.js';
  import { toJsonNumbers } from '../serialize.js';

  @Controller('results')
  export class ResultsController {
    constructor(private readonly prisma: PrismaService) {}

    @Get()
    async getResults(@Query('page') pageParam?: string, @Query('limit') limitParam?: string) {
  ```

- [ ] **Step 4 (F41): Remove the dead `exclude` from `apps/backend/vitest.config.ts`.** Before (complete current file):

  ```ts
  import { defineConfig } from 'vitest/config';

  export default defineConfig({
    test: {
      include: ['src/**/*.spec.ts'],
      exclude: ['node_modules', 'dist', 'test/**'],
    },
  });
  ```

  After (complete new file):

  ```ts
  import { defineConfig } from 'vitest/config';

  export default defineConfig({
    test: {
      include: ['src/**/*.spec.ts'],
    },
  });
  ```

- [ ] **Step 5 (F45): Remove `@nestjs/schematics` from devDependencies.** In `apps/backend/package.json` (state AFTER Task 14 — dependencies no longer contain `@nestjs/config`/`dotenv`) — Before:

  ```json
    "devDependencies": {
      "@nestjs/cli": "^11.0.0",
      "@nestjs/schematics": "^11.0.0",
      "@nestjs/testing": "^11.1.0",
  ```

  After:

  ```json
    "devDependencies": {
      "@nestjs/cli": "^11.0.0",
      "@nestjs/testing": "^11.1.0",
  ```

- [ ] **Step 6: Reinstall to update the lockfile.**

  ```sh
  cd C:/Users/info/projects/lesbarkeitsindex && pnpm install
  ```

  Expected: exit code 0, `pnpm-lock.yaml` updated (direct backend dependency on `@nestjs/schematics` removed; the package itself stays in the lockfile as a transitive dep of `@nestjs/cli`).

- [ ] **Step 7: Run the backend unit suite — expect green with the SAME test-file count as Step 1 (proves the removed `exclude` changed nothing about test collection).**

  ```sh
  cd C:/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run test
  ```

  Expected: exit code 0, identical "Test Files N passed" count as in Step 1.

- [ ] **Step 8: Verify the guarded route still works — run the config integration spec (uses mocked Prisma + `overrideGuard`, needs NO docker stack; exercises the `@UseGuards(AuthGuard)` route wiring end-to-end through Fastify).**

  ```sh
  cd C:/Users/info/projects/lesbarkeitsindex && pnpm --filter backend exec vitest run --config vitest.e2e.config.ts test/config.e2e-spec.ts
  ```

  Expected: exit code 0, all 8 tests in `POST /config — Zod-Validierung Admin-Konfiguration (Issue #29, AC3)` pass.

- [ ] **Step 9: Type-check via build (catches any DI/decorator typing fallout).**

  ```sh
  cd C:/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run build
  ```

  Expected: exit code 0, no type errors.

- [ ] **Step 10: Commit.**

  ```sh
  cd C:/Users/info/projects/lesbarkeitsindex && git add apps/backend/src/auth/auth.module.ts apps/backend/src/results/results.controller.ts apps/backend/vitest.config.ts apps/backend/package.json pnpm-lock.yaml && git commit -m "chore(backend): drop redundant guard providers, GET @HttpCode(OK), dead vitest exclude, @nestjs/schematics" -m "Enhancer guards used via @UseGuards need no provider registration; AuthService stays exported for the guard's DI. GET already defaults to 200. The vitest exclude was fully shadowed by the src-scoped include. @nestjs/cli ships its own @nestjs/schematics." -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

  Expected: commit created.
## Section 3: Frontend (Nuxt)

All commands run from the repo root (`C:/Users/info/projects/lesbarkeitsindex`) in bash. Use `pnpm`, never `vp`. Frontend unit suite: `pnpm --filter frontend run test:unit`.

### Task 16: Shared config-weights form component

**Covers findings:** F1
**Files:**
- Create: `apps/frontend/app/components/config-weights-form.vue`
- Create: `apps/frontend/app/components/__tests__/config-weights-form.test.ts`
- Modify: `apps/frontend/app/pages/index.vue`
- Modify: `apps/frontend/app/pages/admin.vue`
- Test: `apps/frontend/app/pages/__tests__/index.test.ts` (unchanged, must stay green), `apps/frontend/app/pages/__tests__/admin.test.ts` (unchanged, must stay green)

**Interfaces:**
- Consumes: `useApiClient(): ReturnType<typeof createApiClient>` from `~/composables/useApiClient` (call signature unchanged by Task 11's rewrite; only `.getConfig()` is used).
- Produces: Nuxt auto-registered component `ConfigWeightsForm` (file `app/components/config-weights-form.vue`) with five required `defineModel` bindings, all `number`: `alpha`, `weightComplexSyllables`, `weightMultiMemberedGraphemes`, `weightRareGraphemes`, `weightConsonantClusters`. On mount it calls `client.getConfig()` and writes the stored config into all five models. DOM ids are preserved exactly: `param-alpha`, `weight-complex-syllables`, `weight-multi-graphemes`, `weight-rare-graphemes`, `weight-consonant-clusters`.

Design decisions (binding for the executor):
- The pages keep owning the five refs (needed by `admin.vue`'s `weightSum` computed, `saveConfig`, and by page tests that read/write refs through `wrapper.vm`). The component only renders the inputs and hydrates the models from `getConfig()` on mount — this removes the duplicated `onMounted` hydration from both pages.
- The alpha input is unified to `:max="10"` (admin.vue's current behavior; index.vue previously had no max). Deliberate unification — no test asserts a max.

- [ ] **Step 1: Write the failing component test.** Create `apps/frontend/app/components/__tests__/config-weights-form.test.ts` with exactly this content (complete file):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import ConfigWeightsForm from '~/components/config-weights-form.vue';

/**
 * Unit-Test für die gemeinsame Gewichtungs-Eingabemaske (Aufschlag α + vier
 * WK-Gewichte), die von Startseite und Admin-Seite verwendet wird.
 *
 * Die Maske besitzt keinen eigenen Zustand: die Seiten binden per v-model.
 * Beim Mount hydriert sie die Modelle aus der gespeicherten Konfiguration.
 */

const getConfigMock = vi.fn();

vi.mock('~/composables/useApiClient', () => ({
  useApiClient: () => ({
    getConfig: getConfigMock,
    updateConfig: vi.fn(),
    calculate: vi.fn(),
    getResults: vi.fn(),
  }),
}));

const DB_CONFIG = {
  id: 'cfg-1',
  createdAt: '2026-06-12T08:00:00.000Z',
  alpha: 0.45,
  weightComplexSyllables: 40,
  weightMultiMemberedGraphemes: 30,
  weightRareGraphemes: 20,
  weightConsonantClusters: 10,
};

const MODEL_PROPS = {
  alpha: 0.3,
  weightComplexSyllables: 50,
  weightMultiMemberedGraphemes: 25,
  weightRareGraphemes: 12.5,
  weightConsonantClusters: 12.5,
};

describe('ConfigWeightsForm', () => {
  beforeEach(() => {
    getConfigMock.mockReset();
    getConfigMock.mockResolvedValue(DB_CONFIG);
  });

  it('rendert die fünf Eingabefelder mit den bekannten Ids und deutschen Labels', async () => {
    const wrapper = await mountSuspended(ConfigWeightsForm, { props: MODEL_PROPS });
    await flushPromises();

    for (const id of [
      'param-alpha',
      'weight-complex-syllables',
      'weight-multi-graphemes',
      'weight-rare-graphemes',
      'weight-consonant-clusters',
    ]) {
      expect(wrapper.find(`#${id}`).exists()).toBe(true);
    }

    const text = wrapper.text();
    expect(text).toContain('Aufschlag');
    expect(text).toContain('Drei- und Mehrsilber');
    expect(text).toContain('Mehrgliedrige Grapheme');
    expect(text).toContain('Seltene Grapheme');
    expect(text).toContain('Konsonantenlauthäufung');
  });

  it('hydriert die Modelle beim Mount aus der gespeicherten Konfiguration', async () => {
    const onAlpha = vi.fn();
    const onComplex = vi.fn();
    const onMulti = vi.fn();
    const onRare = vi.fn();
    const onClusters = vi.fn();

    await mountSuspended(ConfigWeightsForm, {
      props: {
        ...MODEL_PROPS,
        'onUpdate:alpha': onAlpha,
        'onUpdate:weightComplexSyllables': onComplex,
        'onUpdate:weightMultiMemberedGraphemes': onMulti,
        'onUpdate:weightRareGraphemes': onRare,
        'onUpdate:weightConsonantClusters': onClusters,
      },
    });
    await flushPromises();

    expect(getConfigMock).toHaveBeenCalledTimes(1);
    expect(onAlpha).toHaveBeenCalledWith(0.45);
    expect(onComplex).toHaveBeenCalledWith(40);
    expect(onMulti).toHaveBeenCalledWith(30);
    expect(onRare).toHaveBeenCalledWith(20);
    expect(onClusters).toHaveBeenCalledWith(10);
  });
});
```

- [ ] **Step 2: Run the new test — expect FAIL.** Run:

```bash
pnpm --filter frontend run test:unit app/components/__tests__/config-weights-form.test.ts
```

Expected outcome: the test file FAILS to run with a module-resolution error for `~/components/config-weights-form.vue` (the component does not exist yet). Do not proceed until you see this failure.

- [ ] **Step 3: Create the component.** Create `apps/frontend/app/components/config-weights-form.vue` with exactly this content (complete file):

```vue
<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-2 p-4 border rounded-md">
      <label for="param-alpha" class="text-sm font-medium"
        >Aufschlag &alpha;
        <span class="text-surface-400 font-normal">(Stärke der Wortkomplexität)</span></label
      >
      <InputNumber
        id="param-alpha"
        v-model="alpha"
        fluid
        showButtons
        buttonLayout="horizontal"
        :step="0.05"
        :min="0"
        :max="10"
        mode="decimal"
        :minFractionDigits="2"
        :maxFractionDigits="2"
        incrementIcon="pi pi-plus"
        decrementIcon="pi pi-minus"
      />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="field in weightFields"
        :key="field.id"
        class="flex flex-col gap-2 p-4 border rounded-md"
      >
        <label :for="field.id" class="text-sm font-medium"
          >{{ field.label }}
          <span class="text-surface-400 font-normal">{{ field.hint }}</span></label
        >
        <InputNumber
          :id="field.id"
          v-model="field.model.value"
          fluid
          showButtons
          buttonLayout="horizontal"
          :step="5"
          :min="0"
          mode="decimal"
          :minFractionDigits="0"
          :maxFractionDigits="2"
          incrementIcon="pi pi-plus"
          decrementIcon="pi pi-minus"
        />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted } from 'vue';
import InputNumber from 'primevue/inputnumber';
import { useApiClient } from '~/composables/useApiClient';

// Gemeinsame Eingabemaske für den Aufschlag α und die vier WK-Gewichte
// (Startseite „Erweiterte Einstellungen" und Admin-Konfiguration).
// Die Seiten besitzen den Zustand (v-model); die Maske lädt beim Mount die
// gespeicherte Konfiguration und schreibt sie in die Modelle zurück.
const alpha = defineModel<number>('alpha', { required: true });
const weightComplexSyllables = defineModel<number>('weightComplexSyllables', { required: true });
const weightMultiMemberedGraphemes = defineModel<number>('weightMultiMemberedGraphemes', {
  required: true,
});
const weightRareGraphemes = defineModel<number>('weightRareGraphemes', { required: true });
const weightConsonantClusters = defineModel<number>('weightConsonantClusters', { required: true });

const weightFields = [
  {
    id: 'weight-complex-syllables',
    label: 'Drei- und Mehrsilber',
    hint: '(Wörter mit 3 oder mehr Silben)',
    model: weightComplexSyllables,
  },
  {
    id: 'weight-multi-graphemes',
    label: 'Mehrgliedrige Grapheme',
    hint: '(z.B. sch, ch, ck, ng)',
    model: weightMultiMemberedGraphemes,
  },
  {
    id: 'weight-rare-graphemes',
    label: 'Seltene Grapheme',
    hint: '(ä, ö, ü, ß, c, q, x, y)',
    model: weightRareGraphemes,
  },
  {
    id: 'weight-consonant-clusters',
    label: 'Konsonantenlauthäufung',
    hint: '(z.B. Str-, Spr-, -nkt)',
    model: weightConsonantClusters,
  },
];

const client = useApiClient();

onMounted(async () => {
  try {
    const config = await client.getConfig();
    alpha.value = config.alpha;
    weightComplexSyllables.value = config.weightComplexSyllables;
    weightMultiMemberedGraphemes.value = config.weightMultiMemberedGraphemes;
    weightRareGraphemes.value = config.weightRareGraphemes;
    weightConsonantClusters.value = config.weightConsonantClusters;
  } catch (e) {
    console.error('Konfiguration konnte nicht geladen werden', e);
  }
});
</script>
```

- [ ] **Step 4: Run the component test — expect PASS.** Run:

```bash
pnpm --filter frontend run test:unit app/components/__tests__/config-weights-form.test.ts
```

Expected outcome: 2 tests pass.

- [ ] **Step 5: Replace the duplicated markup in `index.vue`.** In `apps/frontend/app/pages/index.vue`, replace the whole weights block inside the Fieldset.

Before:

```vue
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2 p-4 border rounded-md">
            <label for="param-alpha" class="text-sm font-medium"
              >Aufschlag &alpha;
              <span class="text-surface-400 font-normal">(Stärke der Wortkomplexität)</span></label
            >
            <InputNumber
              id="param-alpha"
              v-model="alpha"
              fluid
              showButtons
              buttonLayout="horizontal"
              :step="0.05"
              :min="0"
              mode="decimal"
              :minFractionDigits="2"
              :maxFractionDigits="2"
              incrementIcon="pi pi-plus"
              decrementIcon="pi pi-minus"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex flex-col gap-2 p-4 border rounded-md">
              <label for="weight-complex-syllables" class="text-sm font-medium"
                >Drei- und Mehrsilber
                <span class="text-surface-400 font-normal"
                  >(Wörter mit 3 oder mehr Silben)</span
                ></label
              >
              <InputNumber
                id="weight-complex-syllables"
                v-model="weightComplexSyllables"
                fluid
                showButtons
                buttonLayout="horizontal"
                :step="5"
                :min="0"
                mode="decimal"
                :minFractionDigits="0"
                :maxFractionDigits="2"
                incrementIcon="pi pi-plus"
                decrementIcon="pi pi-minus"
              />
            </div>
            <div class="flex flex-col gap-2 p-4 border rounded-md">
              <label for="weight-multi-graphemes" class="text-sm font-medium"
                >Mehrgliedrige Grapheme
                <span class="text-surface-400 font-normal">(z.B. sch, ch, ck, ng)</span></label
              >
              <InputNumber
                id="weight-multi-graphemes"
                v-model="weightMultiMemberedGraphemes"
                fluid
                showButtons
                buttonLayout="horizontal"
                :step="5"
                :min="0"
                mode="decimal"
                :minFractionDigits="0"
                :maxFractionDigits="2"
                incrementIcon="pi pi-plus"
                decrementIcon="pi pi-minus"
              />
            </div>
            <div class="flex flex-col gap-2 p-4 border rounded-md">
              <label for="weight-rare-graphemes" class="text-sm font-medium"
                >Seltene Grapheme
                <span class="text-surface-400 font-normal">(ä, ö, ü, ß, c, q, x, y)</span></label
              >
              <InputNumber
                id="weight-rare-graphemes"
                v-model="weightRareGraphemes"
                fluid
                showButtons
                buttonLayout="horizontal"
                :step="5"
                :min="0"
                mode="decimal"
                :minFractionDigits="0"
                :maxFractionDigits="2"
                incrementIcon="pi pi-plus"
                decrementIcon="pi pi-minus"
              />
            </div>
            <div class="flex flex-col gap-2 p-4 border rounded-md">
              <label for="weight-consonant-clusters" class="text-sm font-medium"
                >Konsonantenlauthäufung
                <span class="text-surface-400 font-normal">(z.B. Str-, Spr-, -nkt)</span></label
              >
              <InputNumber
                id="weight-consonant-clusters"
                v-model="weightConsonantClusters"
                fluid
                showButtons
                buttonLayout="horizontal"
                :step="5"
                :min="0"
                mode="decimal"
                :minFractionDigits="0"
                :maxFractionDigits="2"
                incrementIcon="pi pi-plus"
                decrementIcon="pi pi-minus"
              />
            </div>
          </div>
        </div>
```

After:

```vue
        <ConfigWeightsForm
          v-model:alpha="alpha"
          v-model:weight-complex-syllables="weightComplexSyllables"
          v-model:weight-multi-membered-graphemes="weightMultiMemberedGraphemes"
          v-model:weight-rare-graphemes="weightRareGraphemes"
          v-model:weight-consonant-clusters="weightConsonantClusters"
        />
```

(`ConfigWeightsForm` is auto-registered by Nuxt — do NOT add an import.)

- [ ] **Step 6: Drop the now-duplicated hydration from `index.vue`'s script.** Two edits in `apps/frontend/app/pages/index.vue`.

Edit 6a — imports. Before:

```ts
import { ref, defineAsyncComponent, onMounted, computed, watch } from 'vue';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import Fieldset from 'primevue/fieldset';
```

After:

```ts
import { ref, defineAsyncComponent, computed, watch } from 'vue';
import Button from 'primevue/button';
import Fieldset from 'primevue/fieldset';
```

Edit 6b — remove the `onMounted` block. Before:

```ts
// Aufschlagsmodell-Parameter — Startwerte werden beim Mount aus der gespeicherten
// Admin-Konfiguration geladen, damit Admin-Änderungen die nächste Analyse erreichen.
const alpha = ref(0.3);
const weightComplexSyllables = ref(50);
const weightMultiMemberedGraphemes = ref(25);
const weightRareGraphemes = ref(12.5);
const weightConsonantClusters = ref(12.5);

onMounted(async () => {
  try {
    const config = await client.getConfig();
    alpha.value = config.alpha;
    weightComplexSyllables.value = config.weightComplexSyllables;
    weightMultiMemberedGraphemes.value = config.weightMultiMemberedGraphemes;
    weightRareGraphemes.value = config.weightRareGraphemes;
    weightConsonantClusters.value = config.weightConsonantClusters;
  } catch (e) {
    console.error('Konfiguration konnte nicht geladen werden', e);
  }
});
```

After:

```ts
// Aufschlagsmodell-Parameter — die gemeinsame Eingabemaske (ConfigWeightsForm)
// hydriert die Werte beim Mount aus der gespeicherten Admin-Konfiguration.
const alpha = ref(0.3);
const weightComplexSyllables = ref(50);
const weightMultiMemberedGraphemes = ref(25);
const weightRareGraphemes = ref(12.5);
const weightConsonantClusters = ref(12.5);
```

- [ ] **Step 7: Replace the duplicated markup in `admin.vue`.** In `apps/frontend/app/pages/admin.vue`, replace the whole weights block.

Before:

```vue
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2 p-4 border rounded-md">
        <label for="param-alpha" class="text-sm font-medium"
          >Aufschlag &alpha;
          <span class="text-surface-400 font-normal">(Stärke der Wortkomplexität)</span></label
        >
        <InputNumber
          id="param-alpha"
          v-model="alpha"
          fluid
          showButtons
          buttonLayout="horizontal"
          :step="0.05"
          :min="0"
          :max="10"
          mode="decimal"
          :minFractionDigits="2"
          :maxFractionDigits="2"
          incrementIcon="pi pi-plus"
          decrementIcon="pi pi-minus"
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex flex-col gap-2 p-4 border rounded-md">
          <label for="weight-complex-syllables" class="text-sm font-medium"
            >Drei- und Mehrsilber
            <span class="text-surface-400 font-normal"
              >(Wörter mit 3 oder mehr Silben)</span
            ></label
          >
          <InputNumber
            id="weight-complex-syllables"
            v-model="weightComplexSyllables"
            fluid
            showButtons
            buttonLayout="horizontal"
            :step="5"
            :min="0"
            mode="decimal"
            :minFractionDigits="0"
            :maxFractionDigits="2"
            incrementIcon="pi pi-plus"
            decrementIcon="pi pi-minus"
          />
        </div>
        <div class="flex flex-col gap-2 p-4 border rounded-md">
          <label for="weight-multi-graphemes" class="text-sm font-medium"
            >Mehrgliedrige Grapheme
            <span class="text-surface-400 font-normal">(z.B. sch, ch, ck, ng)</span></label
          >
          <InputNumber
            id="weight-multi-graphemes"
            v-model="weightMultiMemberedGraphemes"
            fluid
            showButtons
            buttonLayout="horizontal"
            :step="5"
            :min="0"
            mode="decimal"
            :minFractionDigits="0"
            :maxFractionDigits="2"
            incrementIcon="pi pi-plus"
            decrementIcon="pi pi-minus"
          />
        </div>
        <div class="flex flex-col gap-2 p-4 border rounded-md">
          <label for="weight-rare-graphemes" class="text-sm font-medium"
            >Seltene Grapheme
            <span class="text-surface-400 font-normal">(ä, ö, ü, ß, c, q, x, y)</span></label
          >
          <InputNumber
            id="weight-rare-graphemes"
            v-model="weightRareGraphemes"
            fluid
            showButtons
            buttonLayout="horizontal"
            :step="5"
            :min="0"
            mode="decimal"
            :minFractionDigits="0"
            :maxFractionDigits="2"
            incrementIcon="pi pi-plus"
            decrementIcon="pi pi-minus"
          />
        </div>
        <div class="flex flex-col gap-2 p-4 border rounded-md">
          <label for="weight-consonant-clusters" class="text-sm font-medium"
            >Konsonantenlauthäufung
            <span class="text-surface-400 font-normal">(z.B. Str-, Spr-, -nkt)</span></label
          >
          <InputNumber
            id="weight-consonant-clusters"
            v-model="weightConsonantClusters"
            fluid
            showButtons
            buttonLayout="horizontal"
            :step="5"
            :min="0"
            mode="decimal"
            :minFractionDigits="0"
            :maxFractionDigits="2"
            incrementIcon="pi pi-plus"
            decrementIcon="pi pi-minus"
          />
        </div>
      </div>
    </div>
```

After:

```vue
    <ConfigWeightsForm
      v-model:alpha="alpha"
      v-model:weight-complex-syllables="weightComplexSyllables"
      v-model:weight-multi-membered-graphemes="weightMultiMemberedGraphemes"
      v-model:weight-rare-graphemes="weightRareGraphemes"
      v-model:weight-consonant-clusters="weightConsonantClusters"
    />
```

- [ ] **Step 8: Drop the now-duplicated hydration from `admin.vue`'s script.** Two edits in `apps/frontend/app/pages/admin.vue`.

Edit 8a — imports. Before:

```ts
import { ref, computed, onMounted } from 'vue';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import { useApiClient } from '~/composables/useApiClient';
```

After:

```ts
import { ref, computed } from 'vue';
import Button from 'primevue/button';
import { useApiClient } from '~/composables/useApiClient';
```

Edit 8b — remove the `onMounted` block. Before:

```ts
onMounted(async () => {
  try {
    const config = await client.getConfig();
    alpha.value = config.alpha;
    weightComplexSyllables.value = config.weightComplexSyllables;
    weightMultiMemberedGraphemes.value = config.weightMultiMemberedGraphemes;
    weightRareGraphemes.value = config.weightRareGraphemes;
    weightConsonantClusters.value = config.weightConsonantClusters;
  } catch (e) {
    console.error('Konfiguration konnte nicht geladen werden', e);
  }
});

async function saveConfig() {
```

After:

```ts
async function saveConfig() {
```

- [ ] **Step 9: Run the full frontend unit suite — expect PASS.** The existing page tests must stay green: `admin.test.ts` asserts `getConfigMock` is called on mount (now via the child component) and that hydrated values reach `saveConfig`; `index.test.ts` reads refs via `wrapper.vm`, which still owns them. Run:

```bash
pnpm --filter frontend run test:unit
```

Expected outcome: all test files pass (including the 2 new ConfigWeightsForm tests, 4 index tests, 3 admin tests).

- [ ] **Step 10: Commit.**

```bash
git add apps/frontend/app/components/config-weights-form.vue apps/frontend/app/components/__tests__/config-weights-form.test.ts apps/frontend/app/pages/index.vue apps/frontend/app/pages/admin.vue
git commit -m "refactor(frontend): extract shared ConfigWeightsForm (Aufschlag + WK-Gewichte)" -m "Beide Seiten (Startseite, Admin) nutzen dieselbe Eingabemaske; die
getConfig-Hydration lebt nur noch an einer Stelle. Alpha-Eingabe vereinheitlicht
auf :max=10 (bisheriges Admin-Verhalten).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 17: Extract AppLogo component

**Covers findings:** F11
**Files:**
- Create: `apps/frontend/app/components/app-logo.vue`
- Modify: `apps/frontend/app/pages/login.vue`
- Modify: `apps/frontend/app/pages/logout.vue`
- Test: none new (no unit test covers these pages; e2e `login.spec.ts`/`auth-flow.spec.ts` do not reference the SVG)

**Interfaces:**
- Consumes: nothing
- Produces: Nuxt auto-registered component `AppLogo` (file `app/components/app-logo.vue`), no props, renders the 20-line logo SVG (`class="h-14 w-14"` kept inside the component).

- [ ] **Step 1: Run the suite green before (pure refactor).**

```bash
pnpm --filter frontend run test:unit
```

Expected outcome: PASS (same result as end of Task 16).

- [ ] **Step 2: Create the component.** Create `apps/frontend/app/components/app-logo.vue` with exactly this content (complete file — the SVG is byte-identical to the one currently duplicated in login.vue and logout.vue):

```vue
<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    class="h-14 w-14"
    width="33"
    height="32"
    viewBox="0 0 33 32"
    fill="none"
    aria-hidden="true"
  >
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M7.09219 2.87829C5.94766 3.67858 4.9127 4.62478 4.01426 5.68992C7.6857 5.34906 12.3501 5.90564 17.7655 8.61335C23.5484 11.5047 28.205 11.6025 31.4458 10.9773C31.1517 10.087 30.7815 9.23135 30.343 8.41791C26.6332 8.80919 21.8772 8.29127 16.3345 5.51998C12.8148 3.76014 9.71221 3.03521 7.09219 2.87829ZM28.1759 5.33332C25.2462 2.06 20.9887 0 16.25 0C14.8584 0 13.5081 0.177686 12.2209 0.511584C13.9643 0.987269 15.8163 1.68319 17.7655 2.65781C21.8236 4.68682 25.3271 5.34013 28.1759 5.33332ZM32.1387 14.1025C28.2235 14.8756 22.817 14.7168 16.3345 11.4755C10.274 8.44527 5.45035 8.48343 2.19712 9.20639C2.0292 9.24367 1.86523 9.28287 1.70522 9.32367C1.2793 10.25 0.939308 11.2241 0.695362 12.2356C0.955909 12.166 1.22514 12.0998 1.50293 12.0381C5.44966 11.161 11.0261 11.1991 17.7655 14.5689C23.8261 17.5991 28.6497 17.561 31.9029 16.838C32.0144 16.8133 32.1242 16.7877 32.2322 16.7613C32.2441 16.509 32.25 16.2552 32.25 16C32.25 15.358 32.2122 14.7248 32.1387 14.1025ZM31.7098 20.1378C27.8326 20.8157 22.5836 20.5555 16.3345 17.431C10.274 14.4008 5.45035 14.439 2.19712 15.1619C1.475 15.3223 0.825392 15.5178 0.252344 15.7241C0.250782 15.8158 0.25 15.9078 0.25 16C0.25 24.8366 7.41344 32 16.25 32C23.6557 32 29.8862 26.9687 31.7098 20.1378Z"
      class="fill-surface-700"
    />
  </svg>
</template>
```

- [ ] **Step 3: Use it in `login.vue`.** In `apps/frontend/app/pages/login.vue`, replace the inline SVG.

Before:

```vue
      <div class="flex items-center gap-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-14 w-14"
          width="33"
          height="32"
          viewBox="0 0 33 32"
          fill="none"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M7.09219 2.87829C5.94766 3.67858 4.9127 4.62478 4.01426 5.68992C7.6857 5.34906 12.3501 5.90564 17.7655 8.61335C23.5484 11.5047 28.205 11.6025 31.4458 10.9773C31.1517 10.087 30.7815 9.23135 30.343 8.41791C26.6332 8.80919 21.8772 8.29127 16.3345 5.51998C12.8148 3.76014 9.71221 3.03521 7.09219 2.87829ZM28.1759 5.33332C25.2462 2.06 20.9887 0 16.25 0C14.8584 0 13.5081 0.177686 12.2209 0.511584C13.9643 0.987269 15.8163 1.68319 17.7655 2.65781C21.8236 4.68682 25.3271 5.34013 28.1759 5.33332ZM32.1387 14.1025C28.2235 14.8756 22.817 14.7168 16.3345 11.4755C10.274 8.44527 5.45035 8.48343 2.19712 9.20639C2.0292 9.24367 1.86523 9.28287 1.70522 9.32367C1.2793 10.25 0.939308 11.2241 0.695362 12.2356C0.955909 12.166 1.22514 12.0998 1.50293 12.0381C5.44966 11.161 11.0261 11.1991 17.7655 14.5689C23.8261 17.5991 28.6497 17.561 31.9029 16.838C32.0144 16.8133 32.1242 16.7877 32.2322 16.7613C32.2441 16.509 32.25 16.2552 32.25 16C32.25 15.358 32.2122 14.7248 32.1387 14.1025ZM31.7098 20.1378C27.8326 20.8157 22.5836 20.5555 16.3345 17.431C10.274 14.4008 5.45035 14.439 2.19712 15.1619C1.475 15.3223 0.825392 15.5178 0.252344 15.7241C0.250782 15.8158 0.25 15.9078 0.25 16C0.25 24.8366 7.41344 32 16.25 32C23.6557 32 29.8862 26.9687 31.7098 20.1378Z"
            class="fill-surface-700"
          />
        </svg>
      </div>
```

After:

```vue
      <div class="flex items-center gap-4">
        <AppLogo />
      </div>
```

- [ ] **Step 4: Use it in `logout.vue`.** In `apps/frontend/app/pages/logout.vue`, replace the inline SVG (note the deeper indentation in this file).

Before:

```vue
        <div class="flex items-center gap-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-14 w-14"
            width="33"
            height="32"
            viewBox="0 0 33 32"
            fill="none"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M7.09219 2.87829C5.94766 3.67858 4.9127 4.62478 4.01426 5.68992C7.6857 5.34906 12.3501 5.90564 17.7655 8.61335C23.5484 11.5047 28.205 11.6025 31.4458 10.9773C31.1517 10.087 30.7815 9.23135 30.343 8.41791C26.6332 8.80919 21.8772 8.29127 16.3345 5.51998C12.8148 3.76014 9.71221 3.03521 7.09219 2.87829ZM28.1759 5.33332C25.2462 2.06 20.9887 0 16.25 0C14.8584 0 13.5081 0.177686 12.2209 0.511584C13.9643 0.987269 15.8163 1.68319 17.7655 2.65781C21.8236 4.68682 25.3271 5.34013 28.1759 5.33332ZM32.1387 14.1025C28.2235 14.8756 22.817 14.7168 16.3345 11.4755C10.274 8.44527 5.45035 8.48343 2.19712 9.20639C2.0292 9.24367 1.86523 9.28287 1.70522 9.32367C1.2793 10.25 0.939308 11.2241 0.695362 12.2356C0.955909 12.166 1.22514 12.0998 1.50293 12.0381C5.44966 11.161 11.0261 11.1991 17.7655 14.5689C23.8261 17.5991 28.6497 17.561 31.9029 16.838C32.0144 16.8133 32.1242 16.7877 32.2322 16.7613C32.2441 16.509 32.25 16.2552 32.25 16C32.25 15.358 32.2122 14.7248 32.1387 14.1025ZM31.7098 20.1378C27.8326 20.8157 22.5836 20.5555 16.3345 17.431C10.274 14.4008 5.45035 14.439 2.19712 15.1619C1.475 15.3223 0.825392 15.5178 0.252344 15.7241C0.250782 15.8158 0.25 15.9078 0.25 16C0.25 24.8366 7.41344 32 16.25 32C23.6557 32 29.8862 26.9687 31.7098 20.1378Z"
              class="fill-surface-700"
            />
          </svg>
        </div>
```

After:

```vue
        <div class="flex items-center gap-4">
          <AppLogo />
        </div>
```

- [ ] **Step 5: Run the suite green after.**

```bash
pnpm --filter frontend run test:unit
```

Expected outcome: PASS, same counts as Step 1.

- [ ] **Step 6: Commit.**

```bash
git add apps/frontend/app/components/app-logo.vue apps/frontend/app/pages/login.vue apps/frontend/app/pages/logout.vue
git commit -m "refactor(frontend): extract AppLogo component from login/logout" -m "Das byte-identische Inline-SVG-Logo lebt jetzt einmal in app-logo.vue.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 18: Replace Quill Editor with a plain Textarea

**Covers findings:** F20
**Files:**
- Modify: `apps/frontend/app/pages/index.vue` (state after Task 16), `apps/frontend/nuxt.config.ts`, `apps/frontend/package.json`, `pnpm-lock.yaml` (via `pnpm install`), `apps/frontend/e2e/homepage.spec.ts`, `apps/frontend/e2e/results.spec.ts`
- Test: `apps/frontend/app/pages/__tests__/index.test.ts` (new assertion added first)

**Interfaces:**
- Consumes: nothing (PrimeVue `Textarea` is auto-registered by `@primevue/nuxt-module`)
- Produces: nothing

Context: the PrimeVue `Editor` (Quill) is used as a plain-text input — only `event.textValue` is read, all formatting is discarded. A `Textarea` bound with `v-model="text"` does the same job without the `quill` dependency. `index.test.ts` does NOT stub the Editor (it only sets `vm.text` directly), so existing tests keep passing; the e2e specs however locate the input via `.ql-editor` and MUST be updated (they are re-verified post-merge against a running stack, since e2e needs `docker compose up`).

- [ ] **Step 1: Write the failing unit test.** In `apps/frontend/app/pages/__tests__/index.test.ts`, append a test at the end of the describe block.

Before:

```ts
    const body = calculateMock.mock.calls[0]![0];
    expect(body.textType).toBe('prose');
    // Die heuristische Erkennung bleibt unverändert sichtbar.
    expect(vm.detectedTextType).toBe('list');
  });
});
```

After:

```ts
    const body = calculateMock.mock.calls[0]![0];
    expect(body.textType).toBe('prose');
    // Die heuristische Erkennung bleibt unverändert sichtbar.
    expect(vm.detectedTextType).toBe('list');
  });

  it('bindet die Texteingabe als einfaches Textfeld (kein Rich-Text-Editor)', async () => {
    const wrapper = await mountSuspended(IndexPage);
    await flushPromises();

    const textarea = wrapper.find('textarea');
    expect(textarea.exists()).toBe(true);

    await textarea.setValue('Hund\nKatze\nVogel\nMaus');
    const vm = wrapper.vm as unknown as IndexVm;
    expect(vm.text).toBe('Hund\nKatze\nVogel\nMaus');
  });
});
```

- [ ] **Step 2: Run it — expect FAIL.**

```bash
pnpm --filter frontend run test:unit app/pages/__tests__/index.test.ts
```

Expected outcome: 4 tests pass, the new test FAILS with `expected false to be true` (no `<textarea>` exists while the Quill Editor is used).

- [ ] **Step 3: Swap the Editor for a Textarea in the template.** In `apps/frontend/app/pages/index.vue`:

Before:

```vue
    <Editor
      class="w-full"
      editorStyle="height: 280px; width: 100%;"
      aria-label="Text zur Lesbarkeitsanalyse eingeben"
      @text-change="(event) => (text = event.textValue)"
    />
```

After:

```vue
    <Textarea
      v-model="text"
      class="w-full"
      style="height: 280px"
      aria-label="Text zur Lesbarkeitsanalyse eingeben"
    />
```

(German aria-label preserved; same 280px height; `Textarea` is auto-registered — no import.)

- [ ] **Step 4: Remove the async Editor plumbing from the script.** In `apps/frontend/app/pages/index.vue` (state after Task 16):

Before:

```ts
import { ref, defineAsyncComponent, computed, watch } from 'vue';
import Button from 'primevue/button';
import Fieldset from 'primevue/fieldset';
import Checkbox from 'primevue/checkbox';
import SelectButton from 'primevue/selectbutton';
import { detectTextType, type TextType } from '@lesbarkeitsindex/api-client';

const Editor = defineAsyncComponent(() => import('primevue/editor'));
import { useApiClient, type ResultData } from '~/composables/useApiClient';
import ResultView from '~/components/result-view.vue';
```

After:

```ts
import { ref, computed, watch } from 'vue';
import Button from 'primevue/button';
import Fieldset from 'primevue/fieldset';
import Checkbox from 'primevue/checkbox';
import SelectButton from 'primevue/selectbutton';
import { detectTextType, type TextType } from '@lesbarkeitsindex/api-client';
import { useApiClient, type ResultData } from '~/composables/useApiClient';
import ResultView from '~/components/result-view.vue';
```

- [ ] **Step 5: Run the test file — expect PASS.**

```bash
pnpm --filter frontend run test:unit app/pages/__tests__/index.test.ts
```

Expected outcome: all 5 tests pass.

- [ ] **Step 6: Drop the quill optimizeDeps entry.** In `apps/frontend/nuxt.config.ts`:

Before:

```ts
  devServer: {
    port: 3001,
  },
  vite: {
    optimizeDeps: {
      include: ['quill'],
    },
  },
});
```

After:

```ts
  devServer: {
    port: 3001,
  },
});
```

- [ ] **Step 7: Remove the quill dependency.** In `apps/frontend/package.json`:

Before:

```json
    "primevue": "^4.5.2",
    "quill": "^2.0.3",
    "vue": "^3.5.25",
```

After:

```json
    "primevue": "^4.5.2",
    "vue": "^3.5.25",
```

- [ ] **Step 8: Reinstall.**

```bash
pnpm install
```

Expected outcome: exit 0, `pnpm-lock.yaml` updated (quill/quill-delta removed from the frontend importer).

- [ ] **Step 9: Update the e2e homepage spec (Quill locator is gone).** Four edits in `apps/frontend/e2e/homepage.spec.ts`.

Edit 9a — add a shared locator helper and use it in both helpers. Before:

```ts
/** Expand a collapsed PrimeVue Fieldset by clicking its legend toggle button. */
async function expandFieldset(page: Page, legend: string) {
  await page.getByRole('button', { name: legend }).click();
}

async function analyze(page: Page, text: string) {
  const editor = page.locator('.ql-editor');
  await editor.click();
  await editor.fill(text);
  await page.getByRole('button', { name: 'Text analysieren' }).click();
  await expect(page.getByRole('heading', { name: 'Ergebnis' })).toBeVisible({ timeout: 15000 });
}

/** Analyzes text and returns the parsed /calculate response (end-to-end through the API). */
async function analyzeAndCapture(page: Page, text: string) {
  const editor = page.locator('.ql-editor');
  await editor.click();
  await editor.fill(text);
```

After:

```ts
/** Expand a collapsed PrimeVue Fieldset by clicking its legend toggle button. */
async function expandFieldset(page: Page, legend: string) {
  await page.getByRole('button', { name: legend }).click();
}

/** The plain-text input for the text to analyze (formerly a Quill editor). */
const textInput = (page: Page) => page.getByLabel('Text zur Lesbarkeitsanalyse eingeben');

async function analyze(page: Page, text: string) {
  const editor = textInput(page);
  await editor.fill(text);
  await page.getByRole('button', { name: 'Text analysieren' }).click();
  await expect(page.getByRole('heading', { name: 'Ergebnis' })).toBeVisible({ timeout: 15000 });
}

/** Analyzes text and returns the parsed /calculate response (end-to-end through the API). */
async function analyzeAndCapture(page: Page, text: string) {
  const editor = textInput(page);
  await editor.fill(text);
```

Edit 9b — the visibility test. Before:

```ts
  test('renders the text editor', async ({ page }) => {
    await expect(page.locator('.ql-editor')).toBeVisible();
  });
```

After:

```ts
  test('renders the text input', async ({ page }) => {
    await expect(textInput(page)).toBeVisible();
  });
```

Edit 9c — the typing test (a textarea exposes its content via value, not text). Before:

```ts
  test('can type text into the editor', async ({ page }) => {
    const editor = page.locator('.ql-editor');
    await editor.click();
    await editor.fill('Dies ist ein Testtext für die Lesbarkeitsanalyse.');
    await expect(editor).toContainText('Dies ist ein Testtext');
  });
```

After:

```ts
  test('can type text into the editor', async ({ page }) => {
    const editor = textInput(page);
    await editor.fill('Dies ist ein Testtext für die Lesbarkeitsanalyse.');
    await expect(editor).toHaveValue('Dies ist ein Testtext für die Lesbarkeitsanalyse.');
  });
```

Edit 9d — the title test. Before:

```ts
  test('shows the detected title after analyzing a text with a title line', async ({ page }) => {
    const editor = page.locator('.ql-editor');
    await editor.click();
    await page.keyboard.type('Der Igel');
```

After:

```ts
  test('shows the detected title after analyzing a text with a title line', async ({ page }) => {
    const editor = textInput(page);
    await editor.click();
    await page.keyboard.type('Der Igel');
```

- [ ] **Step 10: Update the e2e results spec.** In `apps/frontend/e2e/results.spec.ts`:

Before:

```ts
async function analyzeAndSave(page: Page, text: string) {
  await page.goto('/');
  const editor = page.locator('.ql-editor');
  await editor.click();
  await editor.fill(text);
```

After:

```ts
async function analyzeAndSave(page: Page, text: string) {
  await page.goto('/');
  const editor = page.getByLabel('Text zur Lesbarkeitsanalyse eingeben');
  await editor.fill(text);
```

- [ ] **Step 11: Run the full unit suite — expect PASS.**

```bash
pnpm --filter frontend run test:unit
```

Expected outcome: all test files pass. Post-verification (needs the running docker stack, run after the whole plan): `pnpm --filter frontend run test:e2e` — `homepage.spec.ts` and `results.spec.ts` were adapted in Steps 9–10.

- [ ] **Step 12: Commit.**

```bash
git add apps/frontend/app/pages/index.vue apps/frontend/app/pages/__tests__/index.test.ts apps/frontend/nuxt.config.ts apps/frontend/package.json pnpm-lock.yaml apps/frontend/e2e/homepage.spec.ts apps/frontend/e2e/results.spec.ts
git commit -m "refactor(frontend): replace Quill editor with plain PrimeVue Textarea" -m "Der Editor wurde nur als Plain-Text-Eingabe genutzt (event.textValue);
Formatierung wurde verworfen. Textarea mit v-model ersetzt Quill komplett:
Dependency, optimizeDeps-Eintrag und Async-Import entfallen. E2E-Locators
von .ql-editor auf getByLabel umgestellt.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 19: results.vue — native date formatting, fixed page size

**Covers findings:** F37, F38
**Files:**
- Modify: `apps/frontend/app/pages/results.vue`, `apps/frontend/package.json`, `pnpm-lock.yaml` (via `pnpm install`)
- Test: none new (results.vue has no unit test; suite green before/after; e2e `results.spec.ts` is post-verification and asserts no date format)

**Interfaces:**
- Consumes: nothing
- Produces: nothing (`PAGE_SIZE` and `formatDate` are file-local)

Format decision (binding): `new Date(...).toLocaleString('de-DE', …)` yields `"02.07.2026, 14:30"` — with a comma, unlike the old dayjs `'DD.MM.YYYY HH:mm'` (`"02.07.2026 14:30"`). We KEEP the comma: it is the native German format, and no unit or e2e test asserts the date shape. Do not add a `.replace(',', '')`.

Dead flexibility being removed: `page` ref (written once at declaration, never updated), `rowsPerPage` ref (never reassigned), and `:rowsPerPageOptions="[10]"` (a dropdown with a single choice). A `PAGE_SIZE = 10` constant replaces all three.

- [ ] **Step 1: Run the suite green before (pure refactor).**

```bash
pnpm --filter frontend run test:unit
```

Expected outcome: PASS.

- [ ] **Step 2: Template — fixed rows, no single-choice dropdown.** In `apps/frontend/app/pages/results.vue`:

Before:

```vue
        :total-records="totalRecords"
        :first="first"
        :rows="rowsPerPage"
        :rowsPerPageOptions="[10]"
        @page="onPageEvent"
```

After:

```vue
        :total-records="totalRecords"
        :first="first"
        :rows="PAGE_SIZE"
        @page="onPageEvent"
```

- [ ] **Step 3: Template — native date formatting.** In `apps/frontend/app/pages/results.vue`:

Before:

```vue
        <Column field="createdAt" header="Datum">
          <template #body="slotProps">
            <div class="truncate">
              {{ dayjs(slotProps.data.createdAt).format('DD.MM.YYYY HH:mm') }}
            </div>
          </template>
        </Column>
```

After:

```vue
        <Column field="createdAt" header="Datum">
          <template #body="slotProps">
            <div class="truncate">
              {{ formatDate(slotProps.data.createdAt) }}
            </div>
          </template>
        </Column>
```

- [ ] **Step 4: Script — drop dayjs and the dead pagination refs.** In `apps/frontend/app/pages/results.vue`:

Before:

```ts
import { ref } from 'vue';
import { useApiClient, type ResultData, type ResultsData } from '~/composables/useApiClient';
import ResultView from '~/components/result-view.vue';
import type { DataTablePageEvent, DataTableRowSelectEvent } from 'primevue';
import dayjs from 'dayjs';

const client = useApiClient();

const loading = ref(false);
const errorMessage = ref('');
const results = ref<ResultsData | null>(null);
const selected = ref<ResultData | null>(null);
const page = ref(0);
const totalRecords = ref(0);
const rowsPerPage = ref(10);
const first = ref(0);

async function loadResults(pageToLoad: number, limit: number) {
  loading.value = true;
  errorMessage.value = '';
  try {
    const data = await client.getResults({
      page: pageToLoad,
      limit,
    });
```

After:

```ts
import { ref } from 'vue';
import { useApiClient, type ResultData, type ResultsData } from '~/composables/useApiClient';
import ResultView from '~/components/result-view.vue';
import type { DataTablePageEvent, DataTableRowSelectEvent } from 'primevue';

const client = useApiClient();

// Feste Seitengröße — die Tabelle bot ohnehin nur „10" zur Auswahl an.
const PAGE_SIZE = 10;

const loading = ref(false);
const errorMessage = ref('');
const results = ref<ResultsData | null>(null);
const selected = ref<ResultData | null>(null);
const totalRecords = ref(0);
const first = ref(0);

// Natives de-DE-Format, z.B. „02.07.2026, 14:30" (bewusst mit Komma).
const formatDate = (iso: string): string =>
  new Date(iso).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

async function loadResults(pageToLoad: number) {
  loading.value = true;
  errorMessage.value = '';
  try {
    const data = await client.getResults({
      page: pageToLoad,
      limit: PAGE_SIZE,
    });
```

- [ ] **Step 5: Script — call sites of `loadResults`.** In `apps/frontend/app/pages/results.vue`:

Before:

```ts
const onPageEvent = (e: DataTablePageEvent) => {
  first.value = e.first;
  loadResults(e.page, rowsPerPage.value);
};

const onRowSelectedEvent = (e: DataTableRowSelectEvent) => {
  selected.value = e.data as ResultData;
};

onMounted(() => {
  loadResults(page.value, rowsPerPage.value);
});
```

After:

```ts
const onPageEvent = (e: DataTablePageEvent) => {
  first.value = e.first;
  loadResults(e.page);
};

const onRowSelectedEvent = (e: DataTableRowSelectEvent) => {
  selected.value = e.data as ResultData;
};

onMounted(() => {
  loadResults(0);
});
```

- [ ] **Step 6: Remove the dayjs dependency.** In `apps/frontend/package.json`:

Before:

```json
    "chartjs-plugin-annotation": "^3.1.0",
    "dayjs": "^1.11.19",
    "nuxt": "^4.2.1",
```

After:

```json
    "chartjs-plugin-annotation": "^3.1.0",
    "nuxt": "^4.2.1",
```

- [ ] **Step 7: Reinstall.**

```bash
pnpm install
```

Expected outcome: exit 0, lockfile updated (dayjs removed from the frontend importer — verify no other workspace file imports dayjs; as of writing only results.vue did).

- [ ] **Step 8: Run the suite green after.**

```bash
pnpm --filter frontend run test:unit
```

Expected outcome: PASS. Post-verification (running stack required): `pnpm --filter frontend run test:e2e` — `results.spec.ts` asserts table headers/rows only, no date-format or paginator-dropdown assertions, so it must stay green unchanged.

- [ ] **Step 9: Commit.**

```bash
git add apps/frontend/app/pages/results.vue apps/frontend/package.json pnpm-lock.yaml
git commit -m "refactor(frontend): native de-DE date formatting and fixed page size on results page" -m "toLocaleString('de-DE') ersetzt dayjs (einzige Verwendung); Format nun
'02.07.2026, 14:30' (natives Komma, bewusst). Tote Paginierungs-Refs (page,
rowsPerPage) und die Ein-Element-Auswahl rowsPerPageOptions=[10] durch eine
PAGE_SIZE-Konstante ersetzt.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 20: Auto-imports sweep (runs over the file states after Tasks 16–19)

**Covers findings:** F6
**Files:**
- Modify: `apps/frontend/app/pages/index.vue`, `apps/frontend/app/pages/admin.vue`, `apps/frontend/app/pages/login.vue`, `apps/frontend/app/pages/logout.vue`, `apps/frontend/app/pages/results.vue`, `apps/frontend/app/components/result-view.vue`, `apps/frontend/app/components/config-weights-form.vue`, `apps/frontend/app/app.vue`
- Test: `apps/frontend/app/pages/__tests__/index.test.ts`, `apps/frontend/app/pages/__tests__/admin.test.ts`, `apps/frontend/app/components/__tests__/config-weights-form.test.ts` (migrated from `vi.mock` to `mockNuxtImport` — required, see below)

**Interfaces:**
- Consumes: `ConfigWeightsForm` (Task 16), `AppLogo` (Task 17) — both must exist for auto-registration.
- Produces: nothing.

Rules applied (verify each removal):
- Vue APIs (`ref`, `computed`, `watch`, `onMounted`, `defineAsyncComponent`) — auto-imported by Nuxt. Remove.
- PrimeVue components (`Button`, `InputNumber`, `Fieldset`, `Checkbox`, `SelectButton`, `InputText`, `Password`, `MeterGroup`) — auto-registered by `@primevue/nuxt-module` (precedent: `results.vue` already uses `DataTable`/`Column`, `result-view.vue` uses `Chip`, `app.vue` uses `Card`/`Menu` without imports). Remove.
- Local components (`ResultView`) — auto-registered from `app/components/`. Remove imports and normalize the template tags to PascalCase `<ResultView>` so the Nuxt components resolver matches unambiguously.
- Composables `useApiClient`/`useAuthClient` (from `app/composables/`) — auto-imported. Remove value imports; keep TYPE imports (`ResultData`, `ResultsData`, `TextType`, `Severity`, `DataTablePageEvent`, …) — types are NOT auto-imported.
- KEEP: `import { detectTextType, type TextType } from '@lesbarkeitsindex/api-client';` (external package — not auto-imported); `import 'primeicons/primeicons.css';` (side-effect import); the dynamic `import('primevue/chart')` / `import('chart.js')` / `import('chartjs-plugin-annotation')` calls inside `result-view.vue`'s async Chart factory (they are lazy-loading, not static imports).
- Test migration (required, not optional): once the pages/components no longer import `useApiClient` explicitly, `vi.mock('~/composables/useApiClient', …)` is not guaranteed to intercept the auto-imported reference. Migrate the three affected unit tests to `mockNuxtImport` from `@nuxt/test-utils/runtime` (the documented mechanism for mocking auto-imports), with mock fns hoisted via `vi.hoisted`.

- [ ] **Step 1: Run the suite green before.**

```bash
pnpm --filter frontend run test:unit
```

Expected outcome: PASS.

- [ ] **Step 2: index.vue script imports.** In `apps/frontend/app/pages/index.vue` (state after Tasks 16+18):

Before:

```ts
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Button from 'primevue/button';
import Fieldset from 'primevue/fieldset';
import Checkbox from 'primevue/checkbox';
import SelectButton from 'primevue/selectbutton';
import { detectTextType, type TextType } from '@lesbarkeitsindex/api-client';
import { useApiClient, type ResultData } from '~/composables/useApiClient';
import ResultView from '~/components/result-view.vue';

const client = useApiClient();
```

After:

```ts
<script setup lang="ts">
import { detectTextType, type TextType } from '@lesbarkeitsindex/api-client';
import type { ResultData } from '~/composables/useApiClient';

const client = useApiClient();
```

(Also removes the previously unused `computed` import.)

- [ ] **Step 3: index.vue template tag.** In `apps/frontend/app/pages/index.vue`:

Before:

```vue
      <result-view v-if="result" :result="result" />
```

After:

```vue
      <ResultView v-if="result" :result="result" />
```

- [ ] **Step 4: admin.vue.** In `apps/frontend/app/pages/admin.vue` (state after Task 16):

Before:

```ts
<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from 'primevue/button';
import { useApiClient } from '~/composables/useApiClient';

const WEIGHT_SUM_EPSILON = 0.01;
```

After:

```ts
<script setup lang="ts">
const WEIGHT_SUM_EPSILON = 0.01;
```

- [ ] **Step 5: login.vue.** In `apps/frontend/app/pages/login.vue`:

Before:

```ts
<script lang="ts" setup>
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import { ref } from 'vue';
import { useAuthClient } from '~/composables/useAuthClient';

const client = useAuthClient();
```

After:

```ts
<script lang="ts" setup>
const client = useAuthClient();
```

- [ ] **Step 6: logout.vue.** In `apps/frontend/app/pages/logout.vue`:

Before:

```ts
<script lang="ts" setup>
import { useAuthClient } from '~/composables/useAuthClient';

const client = useAuthClient();
```

After:

```ts
<script lang="ts" setup>
const client = useAuthClient();
```

(`useRouter` and `onMounted` in this file were already relying on auto-imports — precedent that the mechanism works.)

- [ ] **Step 7: results.vue.** Two edits in `apps/frontend/app/pages/results.vue` (state after Task 19).

Edit 7a — imports. Before:

```ts
import { ref } from 'vue';
import { useApiClient, type ResultData, type ResultsData } from '~/composables/useApiClient';
import ResultView from '~/components/result-view.vue';
import type { DataTablePageEvent, DataTableRowSelectEvent } from 'primevue';
```

After:

```ts
import type { ResultData, ResultsData } from '~/composables/useApiClient';
import type { DataTablePageEvent, DataTableRowSelectEvent } from 'primevue';
```

Edit 7b — template tag. Before:

```vue
    <result-view v-if="selected" :result="selected" />
```

After:

```vue
    <ResultView v-if="selected" :result="selected" />
```

- [ ] **Step 8: result-view.vue.** In `apps/frontend/app/components/result-view.vue`:

Before:

```ts
import MeterGroup from 'primevue/metergroup';
import { type ResultData } from '~/composables/useApiClient';
import { niveaustufe, type Severity } from '~/utils/niveaustufe';
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue';
import Fieldset from 'primevue/fieldset';
```

After:

```ts
import type { ResultData } from '~/composables/useApiClient';
import type { Severity } from '~/utils/niveaustufe';
```

(`niveaustufe` the function is auto-imported from `app/utils/`; the `Severity` type is not, so its type import stays. The `const Chart = defineAsyncComponent(async () => { … import('primevue/chart') … import('chart.js') … import('chartjs-plugin-annotation') … })` block directly below stays EXACTLY as is — dynamic imports, and `defineAsyncComponent` is auto-imported.)

- [ ] **Step 9: config-weights-form.vue.** In `apps/frontend/app/components/config-weights-form.vue` (created in Task 16):

Before:

```ts
<script setup lang="ts">
import { onMounted } from 'vue';
import InputNumber from 'primevue/inputnumber';
import { useApiClient } from '~/composables/useApiClient';

// Gemeinsame Eingabemaske für den Aufschlag α und die vier WK-Gewichte
```

After:

```ts
<script setup lang="ts">
// Gemeinsame Eingabemaske für den Aufschlag α und die vier WK-Gewichte
```

- [ ] **Step 10: app.vue.** In `apps/frontend/app/app.vue`:

Before:

```ts
<script setup lang="ts">
import { useAuthClient } from '~/composables/useAuthClient';
import 'primeicons/primeicons.css';
```

After:

```ts
<script setup lang="ts">
import 'primeicons/primeicons.css';
```

- [ ] **Step 11: Migrate index.test.ts to mockNuxtImport.** Two edits in `apps/frontend/app/pages/__tests__/index.test.ts`.

Edit 11a — import. Before:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
```

After:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
```

Edit 11b — mock block. Before:

```ts
const calculateMock = vi.fn();
const getConfigMock = vi.fn();

vi.mock('~/composables/useApiClient', () => ({
  useApiClient: () => ({
    getConfig: getConfigMock,
    updateConfig: vi.fn(),
    calculate: calculateMock,
    getResults: vi.fn(),
  }),
}));
```

After:

```ts
const { calculateMock, getConfigMock } = vi.hoisted(() => ({
  calculateMock: vi.fn(),
  getConfigMock: vi.fn(),
}));

// useApiClient wird von der Seite auto-importiert (kein expliziter Import mehr),
// daher wird der Auto-Import selbst gemockt statt des Modulpfads.
mockNuxtImport('useApiClient', () => () => ({
  getConfig: getConfigMock,
  updateConfig: vi.fn(),
  calculate: calculateMock,
  getResults: vi.fn(),
}));
```

- [ ] **Step 12: Migrate admin.test.ts to mockNuxtImport.** Two edits in `apps/frontend/app/pages/__tests__/admin.test.ts`.

Edit 12a — import. Before:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
```

After:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
```

Edit 12b — mock block. Before:

```ts
const updateConfigMock = vi.fn();
const getConfigMock = vi.fn();

vi.mock('~/composables/useApiClient', () => ({
  useApiClient: () => ({
    getConfig: getConfigMock,
    updateConfig: updateConfigMock,
    calculate: vi.fn(),
    getResults: vi.fn(),
  }),
}));
```

After:

```ts
const { updateConfigMock, getConfigMock } = vi.hoisted(() => ({
  updateConfigMock: vi.fn(),
  getConfigMock: vi.fn(),
}));

// useApiClient wird auto-importiert (kein expliziter Import mehr in der Seite
// bzw. in ConfigWeightsForm), daher wird der Auto-Import selbst gemockt.
mockNuxtImport('useApiClient', () => () => ({
  getConfig: getConfigMock,
  updateConfig: updateConfigMock,
  calculate: vi.fn(),
  getResults: vi.fn(),
}));
```

- [ ] **Step 13: Migrate config-weights-form.test.ts to mockNuxtImport.** Two edits in `apps/frontend/app/components/__tests__/config-weights-form.test.ts`.

Edit 13a — import. Before:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
```

After:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
```

Edit 13b — mock block. Before:

```ts
const getConfigMock = vi.fn();

vi.mock('~/composables/useApiClient', () => ({
  useApiClient: () => ({
    getConfig: getConfigMock,
    updateConfig: vi.fn(),
    calculate: vi.fn(),
    getResults: vi.fn(),
  }),
}));
```

After:

```ts
const { getConfigMock } = vi.hoisted(() => ({
  getConfigMock: vi.fn(),
}));

// useApiClient wird von der Komponente auto-importiert, daher wird der
// Auto-Import selbst gemockt statt des Modulpfads.
mockNuxtImport('useApiClient', () => () => ({
  getConfig: getConfigMock,
  updateConfig: vi.fn(),
  calculate: vi.fn(),
  getResults: vi.fn(),
}));
```

- [ ] **Step 14: Run the full unit suite — expect PASS.**

```bash
pnpm --filter frontend run test:unit
```

Expected outcome: all test files pass (this exercises auto-registered `ConfigWeightsForm`/`ResultView` and the `mockNuxtImport`-based mocks in the nuxt test environment).

- [ ] **Step 15: Build sanity — pages without unit coverage (login, logout, results, app.vue) must still bundle.**

```bash
pnpm --filter frontend run build
```

Expected outcome: exit 0, no "failed to resolve import" / unresolved component errors in the output.

- [ ] **Step 16: Commit.**

```bash
git add apps/frontend/app/pages/index.vue apps/frontend/app/pages/admin.vue apps/frontend/app/pages/login.vue apps/frontend/app/pages/logout.vue apps/frontend/app/pages/results.vue apps/frontend/app/components/result-view.vue apps/frontend/app/components/config-weights-form.vue apps/frontend/app/app.vue apps/frontend/app/pages/__tests__/index.test.ts apps/frontend/app/pages/__tests__/admin.test.ts apps/frontend/app/components/__tests__/config-weights-form.test.ts
git commit -m "refactor(frontend): rely on Nuxt auto-imports for Vue APIs, PrimeVue and composables" -m "Manuelle Imports für ref/computed/watch/onMounted/defineAsyncComponent,
PrimeVue-Komponenten, lokale Komponenten und useApiClient/useAuthClient
entfernt — Nuxt + @primevue/nuxt-module registrieren sie automatisch
(Präzedenz: DataTable/Column/Chip/Card/Menu waren nie importiert).
Typ-Imports und externe Pakete (api-client, chart.js-Dynamic-Imports,
primeicons-CSS) bleiben. Unit-Tests von vi.mock auf mockNuxtImport
migriert, da der Modulpfad-Mock Auto-Imports nicht abdeckt.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 21: Test & deps hygiene

**Covers findings:** F17, F43
**Files:**
- Delete: `apps/frontend/app/composables/__tests__/useAuthClient.test.ts`
- Modify: `apps/frontend/package.json`, `apps/frontend/nuxt.config.ts`, `pnpm-lock.yaml` (via `pnpm install`)
- Test: full frontend unit suite before/after

**Interfaces:**
- Consumes: nothing
- Produces: nothing

Context: the deleted test's sole assertion is `typeof useAuthClient === 'function'` — it can never catch a regression. `@nuxt/test-utils` sits in `dependencies` and in the `modules` array; the module registration only powers the DevTools test-runner UI. Neither `vitest.config.ts` (uses `@nuxt/test-utils/config`) nor the tests (use `@nuxt/test-utils/runtime`, incl. the `mockNuxtImport` calls from Task 20) need the module registered — they only need the package installed, which `devDependencies` covers. Leave `apps/frontend/.nuxtrc` (`setups.@nuxt/test-utils="3.23.0"`) untouched — it is bookkeeping written by test-utils, harmless either way.

- [ ] **Step 1: Run the suite green before.**

```bash
pnpm --filter frontend run test:unit
```

Expected outcome: PASS — note the total test-file count; after this task it must be exactly one file fewer.

- [ ] **Step 2: Delete the vacuous test.** The entire current content of `apps/frontend/app/composables/__tests__/useAuthClient.test.ts` (for identification — this asserts only that a function is a function):

```ts
import { describe, it, expect } from 'vitest';
import { useAuthClient } from '../useAuthClient';

describe('useAuthClient', () => {
  it('should be defined as a function', () => {
    expect(useAuthClient).toBeDefined();
    expect(typeof useAuthClient).toBe('function');
  });
});
```

Delete it:

```bash
git rm apps/frontend/app/composables/__tests__/useAuthClient.test.ts
```

Expected outcome: exit 0. (The `__tests__` directory under composables becomes empty and disappears from git.)

- [ ] **Step 3: Move `@nuxt/test-utils` to devDependencies.** Two edits in `apps/frontend/package.json`.

Edit 3a — remove from dependencies. Before:

```json
  "dependencies": {
    "@lesbarkeitsindex/api-client": "workspace:*",
    "@nuxt/test-utils": "^3.21.0",
    "@nuxtjs/tailwindcss": "^6.14.0",
```

After:

```json
  "dependencies": {
    "@lesbarkeitsindex/api-client": "workspace:*",
    "@nuxtjs/tailwindcss": "^6.14.0",
```

Edit 3b — add to devDependencies (alphabetical order). Before:

```json
  "devDependencies": {
    "@playwright/test": "^1.58.2",
    "@primevue/nuxt-module": "^4.5.2",
```

After:

```json
  "devDependencies": {
    "@nuxt/test-utils": "^3.21.0",
    "@playwright/test": "^1.58.2",
    "@primevue/nuxt-module": "^4.5.2",
```

- [ ] **Step 4: Remove the module registration.** In `apps/frontend/nuxt.config.ts`:

Before:

```ts
  modules: ['@nuxt/test-utils', '@primevue/nuxt-module', '@nuxtjs/tailwindcss'],
```

After:

```ts
  modules: ['@primevue/nuxt-module', '@nuxtjs/tailwindcss'],
```

- [ ] **Step 5: Reinstall.**

```bash
pnpm install
```

Expected outcome: exit 0, lockfile updated (dependency moved between sections).

- [ ] **Step 6: Run the suite green after.**

```bash
pnpm --filter frontend run test:unit
```

Expected outcome: PASS with exactly one test file fewer than Step 1 (`useAuthClient.test.ts` gone); `mountSuspended`/`mockNuxtImport`/`defineVitestConfig` all still resolve from the dev dependency.

- [ ] **Step 7: Build sanity.**

```bash
pnpm --filter frontend run build
```

Expected outcome: exit 0 (module removal does not affect the production build).

- [ ] **Step 8: Commit.** The deletion of `useAuthClient.test.ts` is already staged by the `git rm` in Step 2 — do NOT pass the (now nonexistent) `__tests__` directory to `git add`, that pathspec would match nothing and abort with exit 128.

```bash
git add apps/frontend/package.json apps/frontend/nuxt.config.ts pnpm-lock.yaml
git commit -m "chore(frontend): move @nuxt/test-utils to devDependencies, drop vacuous test" -m "Der useAuthClient-Test prüfte nur 'typeof === function' und kann keine
Regression fangen. @nuxt/test-utils wird nur von Vitest-Configs/-Tests
gebraucht (devDependency); die Modul-Registrierung diente allein der
DevTools-Testrunner-UI und entfällt.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```
## Section 4: R sidecar & calibration script simplification

### Task 22: api.R — idiomatic POS extraction and default plumber JSON serializer

**Covers findings:** F18, F47
**Files:**
- Modify: `r-sidecar/api.R`
- Test: `apps/backend/test/syllables.e2e-spec.ts` (existing, NOT modified — it is the live behavioral safety net for `POST /analyze`)

**Interfaces:** Consumes: nothing / Produces: nothing (the HTTP contract of `POST /analyze` — `{sentences: string[], words: string[], syllablesPerWord: number[], posTags: string[]}` — is byte-for-byte unchanged; both the old manual `jsonlite::toJSON(..., auto_unbox = FALSE)` and plumber's default `serializer_json()` call `jsonlite::toJSON` with identical defaults)

There is no R unit-test harness in this repo. Verification is behavioral: the backend e2e suite (which includes `syllables.e2e-spec.ts`, hitting the real sidecar at `http://localhost:8787`) must pass identically before and after, and a `curl` diff of `POST /analyze` on a fixed German sentence must be empty.

- [ ] **Step 1: Verify `.env` exists and start the R sidecar container.**
  The e2e spec falls back to `http://localhost:8787` if `R_SIDECAR_URL` is unset, but per project convention the root `.env` should exist with at least:

  ```
  DATABASE_URL=postgresql://admin:admin@localhost:5432/lesbarkeitsindex?schema=public
  R_SIDECAR_URL=http://localhost:8787
  BETTER_AUTH_SECRET=dev-secret
  BETTER_AUTH_URL=http://localhost:3000
  ADMIN_EMAILS=
  ```

  Run (bash, from repo root):

  ```bash
  test -f .env && echo ".env present" || echo "MISSING — create .env with the block above"
  docker compose up -d r-sidecar
  until curl -sf http://localhost:8787/health > /dev/null; do echo "waiting for r-sidecar..."; sleep 5; done; echo healthy
  ```

  Expected: `.env present`, container starts, and after up to ~60 s (the image's health `start_period`) the loop prints `healthy`. Only the `r-sidecar` service is required for this task — `calculate.e2e-spec.ts` and `config.e2e-spec.ts` mock Prisma and the R service, so Postgres is NOT needed for the e2e suite.

- [ ] **Step 2: Run the backend e2e suite BEFORE the change (baseline green).**

  ```bash
  pnpm --filter backend run test:e2e
  ```

  Expected: all three spec files pass (`calculate.e2e-spec.ts`, `config.e2e-spec.ts`, `syllables.e2e-spec.ts`), 0 failures, exit code 0. Do not proceed if this is red — the baseline must be green. If the suite fails to load with `Cannot find module '../src/generated/prisma/client.js'` (the generated Prisma client is gitignored), run `pnpm --filter backend run generate` once and retry.

- [ ] **Step 3: Capture the BEFORE response of `POST /analyze` for a fixed German sentence.**
  The sentence exercises a syllable-correction word (Familie), the initial-vowel rule (Abend), an umlaut (über), and the 7-syllable golden word (Radioaktivität). Write the body via heredoc to avoid Windows-shell umlaut mangling:

  ```bash
  cat > /tmp/analyze-body.json <<'EOF'
  {"text":"Die Familie liest am Abend über Radioaktivität."}
  EOF
  curl -s -X POST http://localhost:8787/analyze -H 'Content-Type: application/json' --data @/tmp/analyze-body.json > /tmp/analyze-pre.json
  cat /tmp/analyze-pre.json
  ```

  Expected: a single-line JSON object with keys `sentences`, `words`, `syllablesPerWord`, `posTags`; `words` has 7 entries (`"Die"` … `"Radioaktivität"`, the trailing `.` filtered out); `syllablesPerWord` ends in `7`; `posTags` has 7 entries and contains no `"UNKNOWN"`.

- [ ] **Step 4: Collapse the defensive POS-tag extraction into the documented openNLP idiom.**
  `Maxent_POS_Tag_Annotator` always emits `features = list(POS = tag)`, so the three-branch `sapply` with the `"UNKNOWN"` fallback is dead defensiveness.

  Before (`r-sidecar/api.R`):

  ```r
    # POS tagging (on all word annotations, before punctuation filtering)
    pos_annotations <- annotate(s, pos_annotator, word_annotations)
    word_pos_annots <- pos_annotations[pos_annotations$type == "word"]
    all_pos_tags <- sapply(word_pos_annots, function(a) {
      feats <- a$features
      if (length(feats) > 0 && is.list(feats[[1]]) && !is.null(feats[[1]]$POS)) {
        feats[[1]]$POS
      } else if (!is.null(feats$POS)) {
        feats$POS
      } else {
        "UNKNOWN"
      }
    })
  ```

  After:

  ```r
    # POS tagging (on all word annotations, before punctuation filtering).
    # Maxent_POS_Tag_Annotator always emits features = list(POS = tag), so the
    # documented openNLP idiom suffices.
    pos_annotations <- annotate(s, pos_annotator, word_annotations)
    word_pos_annots <- pos_annotations[pos_annotations$type == "word"]
    all_pos_tags <- sapply(word_pos_annots$features, `[[`, "POS")
  ```

- [ ] **Step 5: Drop the `@serializer` annotation and the first manual `toJSON` wrapper (empty-text return).**
  Plumber's default serializer for endpoints without a `@serializer` annotation is `serializer_json()`, which calls `jsonlite::toJSON` with jsonlite defaults (`auto_unbox = FALSE`) — exactly what the manual wrappers do. The `/health` endpoint already relies on this default.

  Before (`r-sidecar/api.R`):

  ```r
  #* Analyze text: sentence detection, word tokenization, syllable counting
  #* @post /analyze
  #* @serializer contentType list(type="application/json")
  function(req) {
    body <- fromJSON(req$postBody)
    text <- body$text

    # Handle empty or whitespace-only text
    if (is.null(text) || trimws(text) == "") {
      return(toJSON(list(
        sentences = character(0),
        words = character(0),
        syllablesPerWord = integer(0),
        posTags = character(0)
      ), auto_unbox = FALSE))
    }
  ```

  After:

  ```r
  #* Analyze text: sentence detection, word tokenization, syllable counting
  #* @post /analyze
  function(req) {
    body <- fromJSON(req$postBody)
    text <- body$text

    # Handle empty or whitespace-only text
    if (is.null(text) || trimws(text) == "") {
      return(list(
        sentences = character(0),
        words = character(0),
        syllablesPerWord = integer(0),
        posTags = character(0)
      ))
    }
  ```

  Note: `library(jsonlite)` stays — `fromJSON(req$postBody)` still uses it.

- [ ] **Step 6: Drop the second manual `toJSON` wrapper (no-words return).**

  Before (`r-sidecar/api.R`):

  ```r
    if (length(words_vec) == 0) {
      return(toJSON(list(
        sentences = sentences_vec,
        words = character(0),
        syllablesPerWord = integer(0),
        posTags = character(0)
      ), auto_unbox = FALSE))
    }
  ```

  After:

  ```r
    if (length(words_vec) == 0) {
      return(list(
        sentences = sentences_vec,
        words = character(0),
        syllablesPerWord = integer(0),
        posTags = character(0)
      ))
    }
  ```

- [ ] **Step 7: Drop the third manual `toJSON` wrapper (final return).**

  Before (`r-sidecar/api.R`, end of the `/analyze` function):

  ```r
    toJSON(list(
      sentences = sentences_vec,
      words = words_vec,
      syllablesPerWord = as.integer(syllable_counts),
      posTags = pos_tags_vec
    ), auto_unbox = FALSE)
  }
  ```

  After:

  ```r
    list(
      sentences = sentences_vec,
      words = words_vec,
      syllablesPerWord = as.integer(syllable_counts),
      posTags = pos_tags_vec
    )
  }
  ```

- [ ] **Step 8: Rebuild and restart the sidecar, wait until healthy.**
  The image copies `api.R` at build time, so a rebuild is mandatory:

  ```bash
  docker compose build r-sidecar && docker compose up -d r-sidecar
  until curl -sf http://localhost:8787/health > /dev/null; do echo "waiting for r-sidecar..."; sleep 5; done; echo healthy
  ```

  Expected: image rebuilds, container restarts, loop prints `healthy` within ~60 s. If the container flaps, check `docker compose logs r-sidecar` for an R parse error and fix the edit — do not proceed on a red container.

- [ ] **Step 9: Capture the AFTER response and diff against the baseline.**

  ```bash
  curl -s -X POST http://localhost:8787/analyze -H 'Content-Type: application/json' --data @/tmp/analyze-body.json > /tmp/analyze-post.json
  diff /tmp/analyze-pre.json /tmp/analyze-post.json && echo IDENTICAL
  ```

  Expected: no diff output, `IDENTICAL` printed, exit code 0. Both serialization paths are `jsonlite::toJSON` with `auto_unbox = FALSE`, so the bodies must be byte-identical. Any diff means the change is wrong — revert and re-check Steps 5–7.

- [ ] **Step 10: Run the backend e2e suite AFTER the change.**

  ```bash
  pnpm --filter backend run test:e2e
  ```

  Expected: identical result to Step 2 — all specs pass, 0 failures, exit code 0.

- [ ] **Step 11: Commit.**

  ```bash
  git add r-sidecar/api.R
  git commit -m "$(cat <<'EOF'
  refactor(r-sidecar): drop defensive POS extraction and manual JSON serialization

  Maxent_POS_Tag_Annotator always emits features = list(POS = tag), so the
  documented openNLP idiom sapply(features, `[[`, "POS") replaces the
  three-branch UNKNOWN fallback. Plumber's default JSON serializer already
  uses jsonlite defaults (auto_unbox = FALSE), so /analyze returns plain R
  lists like /health already does; the @serializer contentType annotation
  and the three toJSON wrappers are gone. POST /analyze responses are
  byte-identical (verified via curl diff + backend e2e suite).

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

### Task 23: run-calibration.mjs — replace hand-rolled pad() with String.prototype.padEnd

**Covers findings:** F33
**Files:**
- Modify: `docs/calibration/run-calibration.mjs`

**Interfaces:** Consumes: nothing / Produces: nothing (script-internal formatting only; output columns unchanged)

`String(value).padEnd(width)` is exactly equivalent to the hand-rolled `pad(value, width)` for every input in this script: it returns the string unchanged when its length is already `>= width` and pads with spaces otherwise. There is no test harness for this script; the gates are a `node --check` syntax pass and (when the full stack is up) an eyeball of unchanged column alignment.

- [ ] **Step 1: Syntax-check the script BEFORE the change (baseline).**

  ```bash
  node --check docs/calibration/run-calibration.mjs && echo SYNTAX-OK
  ```

  Expected: `SYNTAX-OK`, exit code 0.

- [ ] **Step 2: Delete the `pad` helper.**

  Before (`docs/calibration/run-calibration.mjs`):

  ```js
  function pad(value, width) {
    const s = String(value);
    return s.length >= width ? s : s + ' '.repeat(width - s.length);
  }

  function round(n, digits = 1) {
  ```

  After:

  ```js
  function round(n, digits = 1) {
  ```

- [ ] **Step 3: Replace the first header block's call sites.**

  Before:

  ```js
  console.log(
    pad('id', 7) +
      pad('title', 26) +
      pad('Stufe', 6) +
      pad('LÜ-LIX', 8) +
      pad('LIX', 6) +
      pad('WK', 6) +
      pad('Wörter', 8) +
      pad('Texttyp', 8) +
      pad('Leseeinheit', 13),
  );
  console.log('-'.repeat(96));
  ```

  After:

  ```js
  console.log(
    'id'.padEnd(7) +
      'title'.padEnd(26) +
      'Stufe'.padEnd(6) +
      'LÜ-LIX'.padEnd(8) +
      'LIX'.padEnd(6) +
      'WK'.padEnd(6) +
      'Wörter'.padEnd(8) +
      'Texttyp'.padEnd(8) +
      'Leseeinheit'.padEnd(13),
  );
  console.log('-'.repeat(96));
  ```

- [ ] **Step 4: Replace the first row loop's call sites.**
  Row fields are a mix of strings and numbers (`round()` returns numbers), so these keep the `String(...)` wrapper.

  Before:

  ```js
  for (const r of rows) {
    console.log(
      pad(r.id, 7) +
        pad(r.title, 26) +
        pad(r.level, 6) +
        pad(r.lueLix, 8) +
        pad(r.lix, 6) +
        pad(r.wk, 6) +
        pad(r.words, 8) +
        pad(r.textType, 8) +
        pad(r.readingUnit, 13),
    );
  }

  console.log('\nWK-Komponenten (Coverage in %)');
  ```

  After:

  ```js
  for (const r of rows) {
    console.log(
      String(r.id).padEnd(7) +
        String(r.title).padEnd(26) +
        String(r.level).padEnd(6) +
        String(r.lueLix).padEnd(8) +
        String(r.lix).padEnd(6) +
        String(r.wk).padEnd(6) +
        String(r.words).padEnd(8) +
        String(r.textType).padEnd(8) +
        String(r.readingUnit).padEnd(13),
    );
  }

  console.log('\nWK-Komponenten (Coverage in %)');
  ```

- [ ] **Step 5: Replace the second header block's call sites.**

  Before:

  ```js
  console.log(
    pad('id', 7) +
      pad('title', 26) +
      pad('Drei+', 8) +
      pad('Mehrgl.', 10) +
      pad('Selten', 9) +
      pad('Cluster', 9),
  );
  ```

  After:

  ```js
  console.log(
    'id'.padEnd(7) +
      'title'.padEnd(26) +
      'Drei+'.padEnd(8) +
      'Mehrgl.'.padEnd(10) +
      'Selten'.padEnd(9) +
      'Cluster'.padEnd(9),
  );
  ```

- [ ] **Step 6: Replace the second row loop's call sites (last remaining `pad(` usages).**

  Before:

  ```js
  for (const r of rows) {
    console.log(
      pad(r.id, 7) + pad(r.title, 26) + pad(r.cs, 8) + pad(r.mg, 10) + pad(r.rg, 9) + pad(r.cc, 9),
    );
  }
  ```

  After:

  ```js
  for (const r of rows) {
    console.log(
      String(r.id).padEnd(7) +
        String(r.title).padEnd(26) +
        String(r.cs).padEnd(8) +
        String(r.mg).padEnd(10) +
        String(r.rg).padEnd(9) +
        String(r.cc).padEnd(9),
    );
  }
  ```

- [ ] **Step 7: Confirm no `pad(` call sites remain and syntax-check AFTER.**

  ```bash
  grep -n 'pad(' docs/calibration/run-calibration.mjs || echo NO-PAD-LEFT
  node --check docs/calibration/run-calibration.mjs && echo SYNTAX-OK
  ```

  Expected: `NO-PAD-LEFT` then `SYNTAX-OK`. The literal `pad(` matches neither `padEnd(` (the `(` follows `End`) nor anything else once the helper and all call sites are gone — so the `grep` must find nothing (it exits 1, which the `|| echo` absorbs). Any printed `pad(...)` line means a call site was missed in Steps 3–6.

- [ ] **Step 8: Live verification IF the full stack is running; otherwise document it as the check.**
  The script POSTs to the backend's `/calculate`, which needs Postgres (config lookup) AND the R sidecar AND a running backend on port 3000 — Task 22 only brought up the sidecar. First probe:

  ```bash
  curl -sf http://localhost:3000/ > /dev/null && echo BACKEND-UP || echo BACKEND-DOWN
  ```

  If `BACKEND-UP`, run the script and eyeball that the two tables' columns still align exactly as before (all separators `=`/`-` at width 96, headers over their values):

  ```bash
  node docs/calibration/run-calibration.mjs
  ```

  Expected: exit code 0, two aligned tables plus the trailing JSON block — visually identical alignment to a pre-change run.

  If `BACKEND-DOWN`, do NOT spin up the whole stack just for this: the check on record is a stack-up run (`docker compose up -d`, `pnpm --filter backend exec prisma migrate deploy`, `pnpm --filter backend run dev`, then the `node` command above), and the equivalence argument in this task's preamble plus Step 7's syntax pass gate the commit.

- [ ] **Step 9: Commit.**

  ```bash
  git add docs/calibration/run-calibration.mjs
  git commit -m "$(cat <<'EOF'
  refactor(calibration): replace hand-rolled pad() with String.prototype.padEnd

  padEnd(width) has identical semantics for every call site (returns the
  string unchanged when already >= width, pads with spaces otherwise), so
  the helper is stdlib duplication.

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```
## Section 5 — CI/CD, Docker, Caddy & Root-Manifest (Tasks 24–31)

All commands below are bash (Git Bash on this Windows machine). Repo root: `/c/Users/info/projects/lesbarkeitsindex`. Scratchpad: `/c/Users/info/AppData/Local/Temp/claude/C--Users-info-projects-lesbarkeitsindex/b8bc38aa-edbf-45e0-b72c-2bf121628aa8/scratchpad` (referred to as `$SCRATCH`; set it at the top of each shell: `SCRATCH="/c/Users/info/AppData/Local/Temp/claude/C--Users-info-projects-lesbarkeitsindex/b8bc38aa-edbf-45e0-b72c-2bf121628aa8/scratchpad"`).

`.github/workflows/build.yml` is edited cumulatively by Tasks 24 → 25 → 26 → 27; every "Before" block below already reflects the After-state of the earlier tasks in this section.

---

### Task 24: Replace hand-rolled curl wait loops with `curl --retry` one-liners

**Covers findings:** F4
**Files:** Modify: `.github/workflows/build.yml`
**Interfaces:** Consumes: nothing / Produces: nothing

Four `for i in $(seq …); do … sleep …; done` polling loops become one `curl --retry` line each. Timeout budgets are preserved: the two r-sidecar health waits were 60 × 3 s = 180 s → `--retry 60 --retry-delay 3`; the backend and frontend start waits were 30 × 2 s = 60 s → `--retry 30 --retry-delay 2`. The inline `docker logs` / `cat *.log` dumps inside the loops are covered by the existing `Show r-sidecar logs on failure` (e2e-r-sidecar job) and `Show service logs on failure` (e2e-frontend job) steps, which stay untouched. One deliberate trade-off: the loops' early exit when the r-sidecar container died is gone — in that case curl now spends its full retry budget before failing (the on-failure log steps still show why).

- [ ] **Step 1: Record the actionlint baseline (pre-edit).**

  ```bash
  SCRATCH="/c/Users/info/AppData/Local/Temp/claude/C--Users-info-projects-lesbarkeitsindex/b8bc38aa-edbf-45e0-b72c-2bf121628aa8/scratchpad"
  cd /c/Users/info/projects/lesbarkeitsindex
  MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd):/repo" -w /repo rhysd/actionlint:latest > "$SCRATCH/actionlint-baseline.txt" 2>&1 || true
  cat "$SCRATCH/actionlint-baseline.txt"
  ```

  Expected: command completes (actionlint exits 1 because findings exist — the `|| true` absorbs it). Verified during plan review: the baseline contains exactly ONE pre-existing finding — `deploy.yml:14:15: the runner of "actions/checkout@v3" action is too old` — and `build.yml` itself is clean. That finding is untouched by this section (Task 28 edits deploy.yml's run steps, not the checkout action), so every post-edit diff in Tasks 24–27 must be empty (no NEW findings).

- [ ] **Step 2: Replace the e2e-r-sidecar health-wait loop.**

  In `.github/workflows/build.yml` (job `e2e-r-sidecar` — this is the variant whose loop ends with `exit 0` inside and a trailing `echo`/`exit 1` after the loop):

  Before:
  ```yaml
        - name: Wait for r-sidecar health
          run: |
            for i in $(seq 1 60); do
              if [ "$(docker inspect -f '{{.State.Running}}' r-sidecar)" != "true" ]; then
                echo "r-sidecar container exited unexpectedly" >&2
                docker logs r-sidecar >&2
                exit 1
              fi
              if curl -fsS http://localhost:8787/health > /dev/null 2>&1; then
                echo "r-sidecar healthy after ~$((i * 3))s"
                exit 0
              fi
              sleep 3
            done
            echo "r-sidecar did not become healthy within 180s" >&2
            docker logs r-sidecar >&2
            exit 1
  ```

  After:
  ```yaml
        - name: Wait for r-sidecar health
          run: curl -fsS --retry 60 --retry-delay 3 --retry-connrefused --retry-all-errors http://localhost:8787/health
  ```

- [ ] **Step 3: Replace the e2e-frontend r-sidecar health-wait loop.**

  In the `e2e-frontend` job (this variant uses `break` and an `-eq 60` check inside the loop):

  Before:
  ```yaml
        - name: Wait for r-sidecar health
          run: |
            for i in $(seq 1 60); do
              if [ "$(docker inspect -f '{{.State.Running}}' r-sidecar)" != "true" ]; then
                echo "r-sidecar container exited unexpectedly" >&2
                docker logs r-sidecar >&2
                exit 1
              fi
              if curl -fsS http://localhost:8787/health > /dev/null 2>&1; then
                echo "r-sidecar healthy after ~$((i * 3))s"
                break
              fi
              if [ "$i" -eq 60 ]; then
                echo "r-sidecar did not become healthy within 180s" >&2
                docker logs r-sidecar >&2
                exit 1
              fi
              sleep 3
            done
  ```

  After:
  ```yaml
        - name: Wait for r-sidecar health
          run: curl -fsS --retry 60 --retry-delay 3 --retry-connrefused --retry-all-errors http://localhost:8787/health
  ```

- [ ] **Step 4: Replace the backend start-wait loop.**

  Before:
  ```yaml
        # Backend self-seeds the default config (and test users) on boot.
        # Run from apps/backend to match the production Docker start command.
        - name: Start backend
          run: |
            cd apps/backend
            node dist/main.js > "$GITHUB_WORKSPACE/backend.log" 2>&1 &
            for i in $(seq 1 30); do
              if curl -fsS http://localhost:3000/ > /dev/null 2>&1; then
                echo "backend up after ~$((i * 2))s"
                break
              fi
              if [ "$i" -eq 30 ]; then
                echo "backend did not start within 60s" >&2
                cat "$GITHUB_WORKSPACE/backend.log" >&2
                exit 1
              fi
              sleep 2
            done
  ```

  After:
  ```yaml
        # Backend self-seeds the default config (and test users) on boot.
        # Run from apps/backend to match the production Docker start command.
        - name: Start backend
          run: |
            cd apps/backend
            node dist/main.js > "$GITHUB_WORKSPACE/backend.log" 2>&1 &
            curl -fsS --retry 30 --retry-delay 2 --retry-connrefused --retry-all-errors http://localhost:3000/
  ```

- [ ] **Step 5: Replace the frontend start-wait loop.**

  Before:
  ```yaml
        - name: Start frontend
          env:
            NITRO_PORT: 3001
            NITRO_HOST: 127.0.0.1
          run: |
            cd apps/frontend
            node .output/server/index.mjs > "$GITHUB_WORKSPACE/frontend.log" 2>&1 &
            for i in $(seq 1 30); do
              if curl -fsS http://localhost:3001/ > /dev/null 2>&1; then
                echo "frontend up after ~$((i * 2))s"
                break
              fi
              if [ "$i" -eq 30 ]; then
                echo "frontend did not start within 60s" >&2
                cat "$GITHUB_WORKSPACE/frontend.log" >&2
                exit 1
              fi
              sleep 2
            done
  ```

  After:
  ```yaml
        - name: Start frontend
          env:
            NITRO_PORT: 3001
            NITRO_HOST: 127.0.0.1
          run: |
            cd apps/frontend
            node .output/server/index.mjs > "$GITHUB_WORKSPACE/frontend.log" 2>&1 &
            curl -fsS --retry 30 --retry-delay 2 --retry-connrefused --retry-all-errors http://localhost:3001/
  ```

- [ ] **Step 6: Verify with actionlint (post-edit).**

  ```bash
  SCRATCH="/c/Users/info/AppData/Local/Temp/claude/C--Users-info-projects-lesbarkeitsindex/b8bc38aa-edbf-45e0-b72c-2bf121628aa8/scratchpad"
  cd /c/Users/info/projects/lesbarkeitsindex
  MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd):/repo" -w /repo rhysd/actionlint:latest > "$SCRATCH/actionlint-after24.txt" 2>&1 || true
  diff "$SCRATCH/actionlint-baseline.txt" "$SCRATCH/actionlint-after24.txt"
  ```

  Expected: `diff` prints nothing and exits 0 (no new findings).

- [ ] **Step 7: Commit.**

  ```bash
  cd /c/Users/info/projects/lesbarkeitsindex
  git add .github/workflows/build.yml
  git commit -m "$(cat <<'EOF'
  ci: replace hand-rolled wait loops with curl --retry one-liners

  Four for/seq/sleep polling loops (2x r-sidecar health, backend start,
  frontend start) each become a single curl call. Timeout budgets are
  unchanged (60x3s and 30x2s); failure diagnostics stay in the existing
  "Show ... logs on failure" steps.

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

  Expected: commit created on `chore/ponytail-audit`.

---

### Task 25: Drop drifted pnpm version pins and dead env vars

**Covers findings:** F25, F30, F26
**Files:** Modify: `.github/workflows/build.yml`, `Dockerfile.backend`, `Dockerfile.frontend`, `.env.example`, `CLAUDE.md`
**Interfaces:** Consumes: nothing / Produces: nothing

Root `package.json` declares `"packageManager": "pnpm@11.9.0"` (working tree). The CI pins (`version: 10.33.0` in three `pnpm/action-setup` steps) and the Dockerfile pins (`corepack prepare pnpm@10.33.0`) have drifted; both mechanisms resolve the version from the `packageManager` field natively when the pin is removed. Also: the unit-test job carries `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` (with the `produdction` typo) that no spec reads, and `ADMIN_EMAILS` has no consumer anywhere in the code.

- [ ] **Step 1: Confirm ADMIN_EMAILS has no code consumer.**

  ```bash
  cd /c/Users/info/projects/lesbarkeitsindex
  grep -rn "ADMIN_EMAILS" apps packages r-sidecar || echo "no code consumer"
  ```

  Expected: prints `no code consumer` (grep exits 1 — the only occurrences repo-wide are `CLAUDE.md`, `.env.example`, and `.github/workflows/build.yml`, all removed in this task). If a code hit appears, STOP and report — do not remove the variable.

- [ ] **Step 2: Confirm no backend spec touches AuthService/Better-Auth env.**

  ```bash
  cd /c/Users/info/projects/lesbarkeitsindex
  grep -rln -e "AuthService" -e "betterAuth" -e "BETTER_AUTH" --include='*spec.ts' apps/backend/src apps/backend/test || echo "no spec reads auth env"
  ```

  Expected: prints `no spec reads auth env` (grep exits 1). The `--include='*spec.ts'` covers both the eight `*.spec.ts` unit specs under `src/` and the three `*.e2e-spec.ts` integration specs under `test/` — none reference AuthService or the Better-Auth env.

- [ ] **Step 3: Drop the `version:` pin from all three `pnpm/action-setup` steps in `.github/workflows/build.yml`.**

  The three occurrences (jobs `test`, `e2e-r-sidecar`, `e2e-frontend`) are byte-identical — replace ALL occurrences:

  Before (×3):
  ```yaml
        - name: Install pnpm
          uses: pnpm/action-setup@v4
          with:
            version: 10.33.0
  ```

  After (×3):
  ```yaml
        - name: Install pnpm
          uses: pnpm/action-setup@v4
  ```

  (`pnpm/action-setup@v4` without `version` reads the `packageManager: pnpm@11.9.0` field from the root `package.json`.)

- [ ] **Step 4: Delete the dead env block from the `test` job.**

  Before:
  ```yaml
    test:
      runs-on: ubuntu-latest
      permissions:
        contents: read
      env:
        BETTER_AUTH_SECRET: 'lesbarkeitsindex-produdction-secret'
        BETTER_AUTH_URL: 'https://lix.florianbieck.com'

      steps:
  ```

  After:
  ```yaml
    test:
      runs-on: ubuntu-latest
      permissions:
        contents: read
      steps:
  ```

- [ ] **Step 5: Delete `ADMIN_EMAILS` from the `e2e-frontend` job env.**

  (Keep `BETTER_AUTH_*` here — the e2e-frontend job boots the real backend, which requires them.)

  Before:
  ```yaml
        BETTER_AUTH_SECRET: lesbarkeitsindex-e2e-secret
        BETTER_AUTH_URL: http://localhost:3000
        ADMIN_EMAILS: ''
        NUXT_PUBLIC_API_BASE: http://localhost:3000
  ```

  After:
  ```yaml
        BETTER_AUTH_SECRET: lesbarkeitsindex-e2e-secret
        BETTER_AUTH_URL: http://localhost:3000
        NUXT_PUBLIC_API_BASE: http://localhost:3000
  ```

- [ ] **Step 6: Un-pin pnpm in `Dockerfile.backend` (two edits: base stage + runner stage).**

  Base stage — Before:
  ```dockerfile
  # Enable corepack for pnpm
  RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
  ```

  Base stage — After:
  ```dockerfile
  # Enable corepack for pnpm (version resolved from the root packageManager field)
  RUN corepack enable
  ```

  Runner stage — the runtime `CMD` runs `pnpm exec prisma migrate deploy`, and `runner` is `FROM base`, which after the edit above no longer bakes a pnpm download into the image (the deps/build stages download pnpm on their first `pnpm install`, but those layers are not part of `runner`). Without a prepare step the container would fetch pnpm from the npm registry on EVERY start. (The pre-change image already has this bug latently after the 11.9.0 bump: base prepared 10.33.0 while `packageManager` demands 11.9.0, so corepack would re-download at runtime anyway — this edit fixes that too.) Bake it at build time, right after the root manifests are copied:

  Runner stage — Before:
  ```dockerfile
  # Copy root workspace config
  COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
  ```

  Runner stage — After:
  ```dockerfile
  # Copy root workspace config
  COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

  # Bake the packageManager-pinned pnpm into the runtime image so the start
  # CMD (pnpm exec prisma migrate deploy) never downloads pnpm at container start
  RUN corepack prepare --activate
  ```

  (The `COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./` line appears twice in the file — edit the one under `# Copy root workspace config` in the `runner` stage. `corepack prepare --activate` without a version argument resolves `packageManager: pnpm@11.9.0` from the just-copied root `package.json`; verified on `node:22-alpine`: `corepack enable && corepack prepare --activate && pnpm --version` → `11.9.0`.)

- [ ] **Step 7: Un-pin pnpm in `Dockerfile.frontend`.**

  Before:
  ```dockerfile
  # Enable corepack for pnpm
  RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
  ```

  After:
  ```dockerfile
  # Enable corepack for pnpm (version resolved from the packageManager field at first pnpm invocation)
  RUN corepack enable
  ```

  (No runner-stage prepare needed here, unlike the backend: this `corepack enable` sits in the `builder` stage, whose `pnpm install` runs after the root `package.json` COPY and downloads pnpm at build time; the frontend `runner` stage never invokes pnpm — its CMD is plain `node`.)

- [ ] **Step 8: Remove `ADMIN_EMAILS` from `.env.example`.**

  Before:
  ```
  BETTER_AUTH_SECRET=dev-secret
  BETTER_AUTH_URL=http://localhost:3000

  # Comma-separated admin emails. Empty = any logged-in user is admin.
  ADMIN_EMAILS=
  ```

  After:
  ```
  BETTER_AUTH_SECRET=dev-secret
  BETTER_AUTH_URL=http://localhost:3000
  ```

- [ ] **Step 9: Remove `ADMIN_EMAILS` from the CLAUDE.md env example.**

  In `CLAUDE.md`, section "### Environment":

  Before:
  ```
  BETTER_AUTH_SECRET=dev-secret
  BETTER_AUTH_URL=http://localhost:3000
  ADMIN_EMAILS=
  ```

  After:
  ```
  BETTER_AUTH_SECRET=dev-secret
  BETTER_AUTH_URL=http://localhost:3000
  ```

- [ ] **Step 10: Remove the ADMIN_EMAILS gotcha bullet from CLAUDE.md.**

  Before:
  ```markdown
  - **Same-origin routing in prod**: Caddy reverse proxy routes `/api/auth/*`, `/calculate`, `/config`, `/results` to backend; everything else to frontend. No CORS needed in production
  - **ADMIN_EMAILS**: Comma-separated list in root `.env`. If empty, any logged-in user gets admin access
  - **Better-Auth trustedOrigins**: Configured in `apps/backend/src/auth/auth.service.ts` — update when adding new domains
  ```

  After:
  ```markdown
  - **Same-origin routing in prod**: Caddy reverse proxy routes `/api/auth/*`, `/calculate`, `/config`, `/results` to backend; everything else to frontend. No CORS needed in production
  - **Better-Auth trustedOrigins**: Configured in `apps/backend/src/auth/auth.service.ts` — update when adding new domains
  ```

- [ ] **Step 11: Run the backend unit suite (proves the deleted test-job env was dead).**

  ```bash
  cd /c/Users/info/projects/lesbarkeitsindex
  pnpm --filter backend run test
  ```

  Expected: all tests PASS — currently 8 files / 221 tests (verified passing during plan review without any of these env vars set; the specs never read `BETTER_AUTH_*` / `ADMIN_EMAILS`).

- [ ] **Step 12: Verify corepack resolves pnpm 11.9.0 in the Docker build (deps stage only — fast enough).**

  ```bash
  cd /c/Users/info/projects/lesbarkeitsindex
  docker build -f Dockerfile.backend --target deps -t backend-deps-pincheck . 2>&1 | tail -30
  ```

  Expected: exit 0; the `pnpm install --frozen-lockfile` layer succeeds (corepack downloads pnpm 11.9.0 on first invocation; the committed lockfile is `lockfileVersion: '9.0'`, which pnpm 11.9.0 accepts frozen — the local install already runs on 11.9.0). The frontend Dockerfile uses the identical mechanism; both full images (including the backend runner stage's new `corepack prepare --activate` layer) are exercised end-to-end by CI in Task 27's verification.

- [ ] **Step 13: Re-run actionlint.**

  ```bash
  SCRATCH="/c/Users/info/AppData/Local/Temp/claude/C--Users-info-projects-lesbarkeitsindex/b8bc38aa-edbf-45e0-b72c-2bf121628aa8/scratchpad"
  cd /c/Users/info/projects/lesbarkeitsindex
  MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd):/repo" -w /repo rhysd/actionlint:latest > "$SCRATCH/actionlint-after25.txt" 2>&1 || true
  diff "$SCRATCH/actionlint-baseline.txt" "$SCRATCH/actionlint-after25.txt"
  ```

  Expected: no diff, exit 0.

- [ ] **Step 14: Commit.**

  ```bash
  cd /c/Users/info/projects/lesbarkeitsindex
  git add .github/workflows/build.yml Dockerfile.backend Dockerfile.frontend .env.example CLAUDE.md
  git commit -m "$(cat <<'EOF'
  ci: drop drifted pnpm pins and dead env vars

  - pnpm/action-setup and the Dockerfiles now resolve pnpm from the
    packageManager field (pnpm@11.9.0) instead of a stale 10.33.0 pin;
    the backend runner stage bakes it in via corepack prepare --activate
    so the container start CMD never downloads pnpm at runtime
  - remove BETTER_AUTH_* from the unit-test job (no spec reads them;
    also kills the 'produdction' typo)
  - remove ADMIN_EMAILS everywhere (.env.example, workflow env,
    CLAUDE.md) — nothing in the codebase consumes it

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

  Expected: commit created.

---

### Task 26: Merge e2e-r-sidecar into e2e-frontend

**Covers findings:** F3
**Files:** Modify: `.github/workflows/build.yml`
**Interfaces:** Consumes: nothing / Produces: nothing

The entire `e2e-r-sidecar` job duplicates `e2e-frontend`'s setup (buildx, r-sidecar image build with the same `type=gha,scope=r-sidecar` cache, `docker run`, pnpm/node setup, install, health wait) for ONE extra command: `pnpm --filter backend run test:e2e`. Condition reconciliation: the union of the two job conditions — (`r-sidecar || backend`) ∪ (`frontend || backend || r-sidecar`) — equals `e2e-frontend`'s existing condition, so its `if:` stays byte-identical. The backend e2e specs mock Prisma and the app; only the syllables spec talks to the sidecar via `R_SIDECAR_URL`, which is already set at the `e2e-frontend` job level. Prisma client generation (needed by the spec imports) is already an explicit step in `e2e-frontend`.

- [ ] **Step 1: Delete the whole `e2e-r-sidecar` job.**

  Before (this is the job state AFTER Tasks 24+25; the block ends right before `e2e-frontend:`):
  ```yaml
    e2e-r-sidecar:
      needs: [changes]
      if: needs.changes.outputs.r-sidecar == 'true' || needs.changes.outputs.backend == 'true'
      runs-on: ubuntu-latest
      permissions:
        contents: read
      steps:
        - name: Checkout
          uses: actions/checkout@v4

        - name: Set up Docker Buildx
          uses: docker/setup-buildx-action@v3

        - name: Build r-sidecar image
          uses: docker/build-push-action@v6
          with:
            context: .
            file: ./Dockerfile.r-sidecar
            load: true
            tags: r-sidecar:e2e
            cache-from: type=gha,scope=r-sidecar

        # Started before pnpm setup so the ~60s R startup overlaps with the install
        - name: Start r-sidecar
          run: docker run -d --name r-sidecar -p 8787:8787 r-sidecar:e2e

        - name: Install pnpm
          uses: pnpm/action-setup@v4

        - name: Setup Node.js
          uses: actions/setup-node@v4
          with:
            node-version: 22
            cache: pnpm

        - name: Install dependencies
          run: pnpm install --frozen-lockfile

        - name: Wait for r-sidecar health
          run: curl -fsS --retry 60 --retry-delay 3 --retry-connrefused --retry-all-errors http://localhost:8787/health

        - name: Run e2e tests
          env:
            R_SIDECAR_URL: http://localhost:8787
          run: pnpm --filter backend run test:e2e

        - name: Show r-sidecar logs on failure
          if: failure()
          run: docker logs r-sidecar

    e2e-frontend:
  ```

  After:
  ```yaml
    e2e-frontend:
  ```

- [ ] **Step 2: Add the backend e2e step to `e2e-frontend`, right after the health wait.**

  (After Step 1 there is exactly one `Wait for r-sidecar health` step left in the file.)

  Before:
  ```yaml
        - name: Wait for r-sidecar health
          run: curl -fsS --retry 60 --retry-delay 3 --retry-connrefused --retry-all-errors http://localhost:8787/health

        # Backend self-seeds the default config (and test users) on boot.
  ```

  After:
  ```yaml
        - name: Wait for r-sidecar health
          run: curl -fsS --retry 60 --retry-delay 3 --retry-connrefused --retry-all-errors http://localhost:8787/health

        # Backend e2e (Vitest): persistence is mocked; only the syllable spec talks to the sidecar.
        - name: Run backend e2e tests
          run: pnpm --filter backend run test:e2e

        # Backend self-seeds the default config (and test users) on boot.
  ```

- [ ] **Step 3: Verify the merged trigger condition is untouched.**

  ```bash
  cd /c/Users/info/projects/lesbarkeitsindex
  grep -A5 "e2e-frontend:" .github/workflows/build.yml | head -8
  grep -c "e2e-r-sidecar" .github/workflows/build.yml || true
  ```

  Expected: the `if:` is still the byte-identical folded block — `if: >-` followed by the three lines `needs.changes.outputs.frontend == 'true' ||`, `needs.changes.outputs.backend == 'true' ||`, `needs.changes.outputs.r-sidecar == 'true'` (unchanged — it is the union of both old conditions) — and the second grep prints `0` (no `e2e-r-sidecar` references remain anywhere, including in `needs:` lists — the build jobs only need `[test, changes]`).

- [ ] **Step 4: Re-run actionlint.**

  ```bash
  SCRATCH="/c/Users/info/AppData/Local/Temp/claude/C--Users-info-projects-lesbarkeitsindex/b8bc38aa-edbf-45e0-b72c-2bf121628aa8/scratchpad"
  cd /c/Users/info/projects/lesbarkeitsindex
  MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd):/repo" -w /repo rhysd/actionlint:latest > "$SCRATCH/actionlint-after26.txt" 2>&1 || true
  diff "$SCRATCH/actionlint-baseline.txt" "$SCRATCH/actionlint-after26.txt"
  ```

  Expected: no diff, exit 0.

- [ ] **Step 5: Commit.**

  ```bash
  cd /c/Users/info/projects/lesbarkeitsindex
  git add .github/workflows/build.yml
  git commit -m "$(cat <<'EOF'
  ci: merge e2e-r-sidecar job into e2e-frontend

  The whole job duplicated e2e-frontend's setup (buildx, image build with
  the same gha cache scope, docker run, pnpm/node, install, health wait)
  for one extra command. Backend e2e now runs as a step in e2e-frontend
  after the sidecar health wait; the merged trigger equals e2e-frontend's
  existing if-condition (union of both old conditions).

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

  Expected: commit created. Note: backend e2e now also runs on frontend-only changes (superset of the old trigger) — accepted trade-off of the merge.

---

### Task 27: Replace the three copy-pasted build jobs with one matrix job

**Covers findings:** F2
**Files:** Modify: `.github/workflows/build.yml`
**Interfaces:** Consumes: nothing / Produces: `changes` job output `services` (JSON array of changed service names, e.g. `["backend","r-sidecar"]`, from dorny/paths-filter's built-in `changes` output); job id `build` (matrix over `service: backend|frontend|r-sidecar`) replacing job ids `build-backend`, `build-frontend`, `build-r-sidecar`

`build-backend` / `build-frontend` / `build-r-sidecar` are byte-identical modulo the service-name substitution (image path suffix, Dockerfile path, cache scope, changes-condition). dorny/paths-filter already emits a `changes` output — a JSON array of all filter names that matched — and the filter names (`backend`, `frontend`, `r-sidecar`) are exactly the service names used in image paths, Dockerfile suffixes, and cache scopes. No jq needed. Tag/label/push/platform/cache semantics are preserved verbatim per service. `strategy.fail-fast: false` preserves the old jobs' independence (one failing build never cancelled the others). The `if:` guard on the job skips it when the array is empty (an empty matrix vector would otherwise fail the workflow).

- [ ] **Step 1: Expose the `services` array from the `changes` job.**

  Before:
  ```yaml
      outputs:
        backend: ${{ steps.filter.outputs.backend }}
        frontend: ${{ steps.filter.outputs.frontend }}
        r-sidecar: ${{ steps.filter.outputs.r-sidecar }}
  ```

  After:
  ```yaml
      outputs:
        backend: ${{ steps.filter.outputs.backend }}
        frontend: ${{ steps.filter.outputs.frontend }}
        r-sidecar: ${{ steps.filter.outputs.r-sidecar }}
        # Built-in paths-filter output: JSON array of all matching filter names, e.g. ["backend","r-sidecar"]
        services: ${{ steps.filter.outputs.changes }}
  ```

  (The per-service outputs stay — `e2e-frontend`'s `if:` still consumes them.)

- [ ] **Step 2: Replace all three build jobs with one matrix job.**

  Before (the entire tail of the file, from `build-backend:` to EOF — unchanged by Tasks 24–26):
  ```yaml
    build-backend:
      needs: [test, changes]
      if: needs.changes.outputs.backend == 'true'
      runs-on: ubuntu-latest
      steps:
        - name: Checkout
          uses: actions/checkout@v4

        - name: Log in to the Container registry
          uses: docker/login-action@v3
          with:
            registry: ${{ env.REGISTRY }}
            username: ${{ github.actor }}
            password: ${{ secrets.GITHUB_TOKEN }}

        - name: Set up QEMU
          uses: docker/setup-qemu-action@v3

        - name: Set up Docker Buildx
          uses: docker/setup-buildx-action@v3

        - name: Extract Docker metadata
          id: meta
          uses: docker/metadata-action@v5
          with:
            images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend
            tags: |
              type=sha
              type=ref,event=branch
              type=ref,event=tag
              type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}

        - name: Build and push backend
          uses: docker/build-push-action@v6
          with:
            context: .
            file: ./Dockerfile.backend
            platforms: ${{ github.ref == 'refs/heads/main' && 'linux/amd64,linux/arm64' || 'linux/amd64' }}
            push: ${{ github.event_name != 'pull_request' }}
            tags: ${{ steps.meta.outputs.tags }}
            labels: ${{ steps.meta.outputs.labels }}
            cache-from: type=gha,scope=backend
            cache-to: type=gha,mode=max,scope=backend

    build-frontend:
      needs: [test, changes]
      if: needs.changes.outputs.frontend == 'true'
      runs-on: ubuntu-latest
      steps:
        - name: Checkout
          uses: actions/checkout@v4

        - name: Log in to the Container registry
          uses: docker/login-action@v3
          with:
            registry: ${{ env.REGISTRY }}
            username: ${{ github.actor }}
            password: ${{ secrets.GITHUB_TOKEN }}

        - name: Set up QEMU
          uses: docker/setup-qemu-action@v3

        - name: Set up Docker Buildx
          uses: docker/setup-buildx-action@v3

        - name: Extract Docker metadata
          id: meta
          uses: docker/metadata-action@v5
          with:
            images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/frontend
            tags: |
              type=sha
              type=ref,event=branch
              type=ref,event=tag
              type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}

        - name: Build and push frontend
          uses: docker/build-push-action@v6
          with:
            context: .
            file: ./Dockerfile.frontend
            platforms: ${{ github.ref == 'refs/heads/main' && 'linux/amd64,linux/arm64' || 'linux/amd64' }}
            push: ${{ github.event_name != 'pull_request' }}
            tags: ${{ steps.meta.outputs.tags }}
            labels: ${{ steps.meta.outputs.labels }}
            cache-from: type=gha,scope=frontend
            cache-to: type=gha,mode=max,scope=frontend

    build-r-sidecar:
      needs: [test, changes]
      if: needs.changes.outputs.r-sidecar == 'true'
      runs-on: ubuntu-latest
      steps:
        - name: Checkout
          uses: actions/checkout@v4

        - name: Log in to the Container registry
          uses: docker/login-action@v3
          with:
            registry: ${{ env.REGISTRY }}
            username: ${{ github.actor }}
            password: ${{ secrets.GITHUB_TOKEN }}

        - name: Set up QEMU
          uses: docker/setup-qemu-action@v3

        - name: Set up Docker Buildx
          uses: docker/setup-buildx-action@v3

        - name: Extract Docker metadata
          id: meta
          uses: docker/metadata-action@v5
          with:
            images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/r-sidecar
            tags: |
              type=sha
              type=ref,event=branch
              type=ref,event=tag
              type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}

        - name: Build and push r-sidecar
          uses: docker/build-push-action@v6
          with:
            context: .
            file: ./Dockerfile.r-sidecar
            platforms: ${{ github.ref == 'refs/heads/main' && 'linux/amd64,linux/arm64' || 'linux/amd64' }}
            push: ${{ github.event_name != 'pull_request' }}
            tags: ${{ steps.meta.outputs.tags }}
            labels: ${{ steps.meta.outputs.labels }}
            cache-from: type=gha,scope=r-sidecar
            cache-to: type=gha,mode=max,scope=r-sidecar
  ```

  After (complete new job — the file now ends here):
  ```yaml
    build:
      needs: [test, changes]
      # Empty matrix vectors fail the workflow — skip the job when nothing changed.
      if: needs.changes.outputs.services != '[]'
      runs-on: ubuntu-latest
      strategy:
        # The old per-service jobs were independent; one failing build must not cancel the others.
        fail-fast: false
        matrix:
          service: ${{ fromJSON(needs.changes.outputs.services) }}
      steps:
        - name: Checkout
          uses: actions/checkout@v4

        - name: Log in to the Container registry
          uses: docker/login-action@v3
          with:
            registry: ${{ env.REGISTRY }}
            username: ${{ github.actor }}
            password: ${{ secrets.GITHUB_TOKEN }}

        - name: Set up QEMU
          uses: docker/setup-qemu-action@v3

        - name: Set up Docker Buildx
          uses: docker/setup-buildx-action@v3

        - name: Extract Docker metadata
          id: meta
          uses: docker/metadata-action@v5
          with:
            images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${{ matrix.service }}
            tags: |
              type=sha
              type=ref,event=branch
              type=ref,event=tag
              type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}

        - name: Build and push ${{ matrix.service }}
          uses: docker/build-push-action@v6
          with:
            context: .
            file: ./Dockerfile.${{ matrix.service }}
            platforms: ${{ github.ref == 'refs/heads/main' && 'linux/amd64,linux/arm64' || 'linux/amd64' }}
            push: ${{ github.event_name != 'pull_request' }}
            tags: ${{ steps.meta.outputs.tags }}
            labels: ${{ steps.meta.outputs.labels }}
            cache-from: type=gha,scope=${{ matrix.service }}
            cache-to: type=gha,mode=max,scope=${{ matrix.service }}
  ```

- [ ] **Step 3: Re-run actionlint.**

  ```bash
  SCRATCH="/c/Users/info/AppData/Local/Temp/claude/C--Users-info-projects-lesbarkeitsindex/b8bc38aa-edbf-45e0-b72c-2bf121628aa8/scratchpad"
  cd /c/Users/info/projects/lesbarkeitsindex
  MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd):/repo" -w /repo rhysd/actionlint:latest > "$SCRATCH/actionlint-after27.txt" 2>&1 || true
  diff "$SCRATCH/actionlint-baseline.txt" "$SCRATCH/actionlint-after27.txt"
  ```

  Expected: no diff, exit 0 (actionlint validates `fromJSON` matrix expressions and `matrix.service` references). The complete post-Task-27 build.yml — assembled from the exact After blocks of Tasks 24–27 — was actionlint-verified clean (zero findings) during plan review.

- [ ] **Step 4: Commit.**

  ```bash
  cd /c/Users/info/projects/lesbarkeitsindex
  git add .github/workflows/build.yml
  git commit -m "$(cat <<'EOF'
  ci: collapse three copy-pasted build jobs into one matrix job

  build-backend/build-frontend/build-r-sidecar were byte-identical modulo
  the service name. One matrix job now consumes dorny/paths-filter's
  built-in 'changes' output (JSON array of matched filter names) via
  fromJSON; an if-guard skips the job on an empty array. Tags, labels,
  platforms, push conditions and per-service gha cache scopes unchanged.

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

  Expected: commit created.

- [ ] **Step 5: CI verification — push the branch and open a draft PR (this is the highest-risk change; verify on a real run).**

  ```bash
  cd /c/Users/info/projects/lesbarkeitsindex
  git push -u origin chore/ponytail-audit
  gh pr create --draft --title "chore: ponytail audit" --body "$(cat <<'EOF'
  Draft PR to exercise CI for the audit branch (matrix build verification). Do not merge yet.

  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  EOF
  )"
  sleep 15
  gh run watch "$(gh run list --workflow build.yml --branch chore/ponytail-audit --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
  ```

  Expected: the run finishes green with jobs `changes`, `test`, `e2e-frontend` (including the new "Run backend e2e tests" step), and three matrix legs `build (backend)`, `build (frontend)`, `build (r-sidecar)` — all three services are flagged as changed because this branch touches `Dockerfile.backend`, `Dockerfile.frontend`, `Dockerfile.r-sidecar` and `package.json`. Because the event is `pull_request`, `push:` is `false` — the images build fully but nothing is pushed to ghcr.io. If any matrix leg fails, inspect it with `gh run view --log-failed`.

- [ ] **Step 6: Confirm the skip behavior for the empty-array guard (docs-only change).**

  This branch cannot demonstrate the skip (it touches all three services, and paths-filter diffs the whole PR, not the last commit). Verify the guard logic statically instead:

  ```bash
  cd /c/Users/info/projects/lesbarkeitsindex
  grep -n "services != '\[\]'" .github/workflows/build.yml
  ```

  Expected: one hit on the `build` job's `if:`. Expected runtime behavior (observe on the next docs-only PR, e.g. one touching only `*.md`): `changes.outputs.services` is `[]`, so the `build` job shows as **skipped** (as `e2e-frontend` and formerly the per-service jobs already did), while `test` still runs.

---

### Task 28: Restructure docker-compose-prod.yml as an overlay; drop container_name

**Covers findings:** F8, F21
**Files:** Modify: `docker-compose.yml`, `docker-compose-prod.yml`, `.github/workflows/deploy.yml`
**Interfaces:** Consumes: nothing / Produces: prod invocation contract `docker compose -f docker-compose.yml -f docker-compose-prod.yml <cmd>` (requires Docker Compose v2.24.4+ on the deploy host for the `!reset` YAML tags)

`docker-compose-prod.yml` re-declares `postgres` and the r-sidecar healthcheck verbatim — and has drifted: prod postgres LOST the healthcheck that the dev file has. As an overlay, prod holds only the diffs and postgres inherits everything (healthcheck included) from the base file. Compose merge APPENDS list-typed keys like `ports`, so the dev-published `8787:8787` on r-sidecar must be explicitly nulled with `ports: !reset []`; likewise `build: !reset null` removes the dev `build:` so prod purely pulls the ghcr image. All seven `container_name` declarations across both files (dev: r-sidecar, postgres; prod: caddy, backend, frontend, r-sidecar, postgres — five distinct services) are dropped — nothing references the fixed names: the Caddyfile uses service-DNS (`backend:3000`, `frontend:3000`), and CI's `docker logs r-sidecar` targets its own `docker run --name r-sidecar` container, which is independent of compose. The redundant `expose:` keys are dropped too (every Dockerfile already has the matching `EXPOSE`; same-network connectivity never depended on it).

- [ ] **Step 1: Baseline — the dev file renders standalone.**

  ```bash
  cd /c/Users/info/projects/lesbarkeitsindex
  docker compose -f docker-compose.yml config > /dev/null && echo DEV-OK
  ```

  Expected: prints `DEV-OK`.

- [ ] **Step 2: Remove `container_name` from the dev `r-sidecar` service.**

  In `docker-compose.yml`:

  Before:
  ```yaml
    r-sidecar:
      build:
        context: .
        dockerfile: Dockerfile.r-sidecar
      container_name: r-sidecar
      restart: unless-stopped
  ```

  After:
  ```yaml
    r-sidecar:
      build:
        context: .
        dockerfile: Dockerfile.r-sidecar
      restart: unless-stopped
  ```

- [ ] **Step 3: Remove `container_name` from the dev `postgres` service.**

  Before:
  ```yaml
    postgres:
      image: postgres:16
      container_name: postgres
      ports:
  ```

  After:
  ```yaml
    postgres:
      image: postgres:16
      ports:
  ```

- [ ] **Step 4: Rewrite `docker-compose-prod.yml` as a pure overlay (complete new file content).**

  ```yaml
  # Production overlay — ALWAYS use together with the base file:
  #   docker compose -f docker-compose.yml -f docker-compose-prod.yml up -d
  # Requires Docker Compose v2.24.4+ (for the !reset merge tags).
  services:
    caddy:
      image: caddy:2-alpine
      restart: unless-stopped
      ports:
        - '80:80'
        - '443:443'
        - '443:443/udp'
      volumes:
        - ./Caddyfile:/etc/caddy/Caddyfile
        - caddy_data:/data
        - caddy_config:/config
      depends_on:
        - backend
        - frontend

    backend:
      image: ghcr.io/florianbieck/lesbarkeitsindex/backend:latest
      restart: unless-stopped
      environment:
        - DATABASE_URL=postgresql://admin:admin@postgres:5432/lesbarkeitsindex
        # Public base URL used by Better-Auth (same-origin via Caddy)
        - BETTER_AUTH_URL=https://lix.florianbieck.com
        - BETTER_AUTH_SECRET=change-to-secret
        - NODE_ENV=production
        - R_SIDECAR_URL=http://r-sidecar:8787
      depends_on:
        postgres:
          condition: service_started
        r-sidecar:
          condition: service_healthy

    frontend:
      image: ghcr.io/florianbieck/lesbarkeitsindex/frontend:latest
      restart: unless-stopped
      environment:
        - NODE_ENV=production
        # Use same-origin API via Caddy to avoid third-party cookies and CORS
        # Base is the site origin; Better‑Auth appends /api/auth itself and app endpoints are at root
        - NUXT_PUBLIC_API_BASE=https://lix.florianbieck.com
      depends_on:
        - backend

    # Diffs against the base file only: pull the ghcr image instead of building,
    # and do not publish the dev port. restart/healthcheck are inherited.
    r-sidecar:
      image: ghcr.io/florianbieck/lesbarkeitsindex/r-sidecar:latest
      build: !reset null
      ports: !reset []

    # postgres: fully inherited from docker-compose.yml (image, env, volume,
    # healthcheck, published port, logging) — no overrides needed.

  volumes:
    caddy_data:
    caddy_config:
  ```

- [ ] **Step 5: Point the deploy workflow at the overlay pair.**

  In `.github/workflows/deploy.yml`:

  Before:
  ```yaml
        - name: Copy configuration files to server
          run: |
            ssh-keyscan ${{ secrets.SSH_HOST }} >> ~/.ssh/known_hosts
            ssh root@${{ secrets.SSH_HOST }} mkdir -p /opt/lesbarkeitsindex
            scp -r docker-compose-prod.yml Caddyfile root@${{ secrets.SSH_HOST }}:/opt/lesbarkeitsindex/

        - name: Deploy new docker stack at Hetzner Server
          run: |
            ssh-keyscan ${{ secrets.SSH_HOST }} >> known_hosts
            docker context create prod --docker "host=ssh://root@${{ secrets.SSH_HOST }}"
            docker context use prod
            docker compose pull
            docker compose up -d
  ```

  After:
  ```yaml
        - name: Copy configuration files to server
          run: |
            ssh-keyscan ${{ secrets.SSH_HOST }} >> ~/.ssh/known_hosts
            ssh root@${{ secrets.SSH_HOST }} mkdir -p /opt/lesbarkeitsindex
            scp -r docker-compose.yml docker-compose-prod.yml Caddyfile root@${{ secrets.SSH_HOST }}:/opt/lesbarkeitsindex/

        - name: Deploy new docker stack at Hetzner Server
          run: |
            ssh-keyscan ${{ secrets.SSH_HOST }} >> known_hosts
            docker context create prod --docker "host=ssh://root@${{ secrets.SSH_HOST }}"
            docker context use prod
            docker compose -f docker-compose.yml -f docker-compose-prod.yml pull
            docker compose -f docker-compose.yml -f docker-compose-prod.yml up -d
  ```

  (Note: previously the plain `docker compose pull/up` in the checkout directory silently read ONLY the dev `docker-compose.yml`; the explicit `-f` pair makes the prod stack the one that actually deploys.)

- [ ] **Step 6: Confirm no other docs reference the old single-file prod usage.**

  ```bash
  cd /c/Users/info/projects/lesbarkeitsindex
  grep -rn "docker-compose-prod" README.md CONTEXT.md docs .github 2>/dev/null
  ```

  Expected: exactly two kinds of hits — `.github/workflows/deploy.yml` (already updated in Step 5, now showing the `-f` pair) and `docs/superpowers/specs/2026-03-12-r-sidecar-text-analysis-design.md` (a dated, historical design spec — leave it unchanged). No other files.

- [ ] **Step 7: Verify the merged model renders as intended.**

  ```bash
  SCRATCH="/c/Users/info/AppData/Local/Temp/claude/C--Users-info-projects-lesbarkeitsindex/b8bc38aa-edbf-45e0-b72c-2bf121628aa8/scratchpad"
  cd /c/Users/info/projects/lesbarkeitsindex
  docker compose -f docker-compose.yml -f docker-compose-prod.yml config > "$SCRATCH/merged-prod.yml" && echo MERGE-OK
  grep -c "container_name" "$SCRATCH/merged-prod.yml" || echo "no container_name"
  grep -c "build:" "$SCRATCH/merged-prod.yml" || echo "no build key"
  grep -n "pg_isready" "$SCRATCH/merged-prod.yml"
  grep -n "ghcr.io/florianbieck/lesbarkeitsindex/r-sidecar:latest" "$SCRATCH/merged-prod.yml"
  ```

  Expected, in order:
  1. `MERGE-OK` — the overlay pair renders.
  2. `0` followed by `no container_name` (`grep -c` prints the zero count AND exits 1, so the fallback echo fires too) — dropped everywhere.
  3. `0` followed by `no build key` — `!reset` removed the dev `build:`; all four app services use `image:`.
  4. One hit inside the `postgres` service — the healthcheck is back in prod (this was the drift F21 fixed).
  5. One hit — prod r-sidecar pulls the ghcr image.

  (This exact merge was dry-run verified during plan review with Compose v5.1.4: exit 0, zero `container_name`, zero `build:`, `pg_isready` healthcheck rendered under postgres, r-sidecar has NO `ports` section, and only caddy 80/443/443-udp plus postgres 5432 are published.)

  Then inspect `"$SCRATCH/merged-prod.yml"` manually and confirm: `r-sidecar` has NO published `ports` (the dev `8787:8787` was reset), `postgres` publishes `5432` (unchanged vs old prod file), `caddy` publishes `80`, `443` and `443/udp`, and `backend`'s `depends_on` shows `r-sidecar: condition: service_healthy`.

  Also re-check the dev file standalone: `docker compose -f docker-compose.yml config > /dev/null && echo DEV-OK` → prints `DEV-OK`.

- [ ] **Step 8: Commit.**

  ```bash
  cd /c/Users/info/projects/lesbarkeitsindex
  git add docker-compose.yml docker-compose-prod.yml .github/workflows/deploy.yml
  git commit -m "$(cat <<'EOF'
  build: make docker-compose-prod.yml a pure overlay over the base file

  Prod no longer re-declares postgres and the r-sidecar healthcheck; it
  inherits them via docker compose -f docker-compose.yml -f
  docker-compose-prod.yml (this also restores the postgres healthcheck
  prod had silently lost). Dev-only keys are nulled with !reset (build,
  published 8787 port). Drop container_name from all services (service
  DNS covers every reference) and redundant expose keys (Dockerfiles
  already EXPOSE). deploy.yml now ships both files and addresses them
  explicitly with -f.

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

  Expected: commit created. Local note: the next `docker compose up -d` recreates the dev containers under project-prefixed names (e.g. `lesbarkeitsindex-postgres-1`) — data survives in the named volume.

---

### Task 29: Flatten Dockerfile.r-sidecar into one linear stage

**Covers findings:** F32, F46
**Files:** Modify: `Dockerfile.r-sidecar`
**Interfaces:** Consumes: nothing / Produces: nothing

The three named stages (`base`/`deps`/`runner`) form a straight chain — no `target:` and no `COPY --from` anywhere references them — so the stage names and the duplicated `WORKDIR /app` are pure noise. Layer caching is identical (same instruction sequence). `ENV PORT=8787` is dead: `r-sidecar/start.R` hardcodes `pr$run(host = "0.0.0.0", port = 8787)` and never reads the variable.

- [ ] **Step 1: Confirm no stage references exist.**

  ```bash
  cd /c/Users/info/projects/lesbarkeitsindex
  grep -rn -e '--from' -e 'target:' Dockerfile.r-sidecar docker-compose.yml docker-compose-prod.yml .github/workflows/build.yml || echo "no stage references"
  ```

  Expected: prints `no stage references` (exit 1 from grep). Also confirm the hardcoded port: `grep -n "port" r-sidecar/start.R` → shows `pr$run(host = "0.0.0.0", port = 8787)`.

- [ ] **Step 2: Rewrite `Dockerfile.r-sidecar` (complete new file content).**

  ```dockerfile
  FROM rocker/r-ver:4.4.0
  WORKDIR /app

  # Install system dependencies (Java for OpenNLP, zlib/sodium for plumber, wget for healthcheck)
  RUN apt-get update -y \
    && apt-get install -y --no-install-recommends \
      default-jdk \
      libxml2-dev \
      libcurl4-openssl-dev \
      libssl-dev \
      libsodium-dev \
      zlib1g-dev \
      libpcre2-dev \
      liblzma-dev \
      libbz2-dev \
      libdeflate-dev \
      make \
      g++ \
      wget \
    && rm -rf /var/lib/apt/lists/*

  # Configure R to find Java
  RUN R CMD javareconf

  # Install CRAN packages (fail build if any package fails to install)
  RUN R -e "\
    options(timeout = 300); \
    pkgs <- c('plumber', 'jsonlite', 'NLP', 'openNLP'); \
    install.packages(pkgs, repos='https://cloud.r-project.org/'); \
    for (p in pkgs) { if (!requireNamespace(p, quietly=TRUE)) stop(paste('Failed to install:', p)) }"

  # Install OpenNLP German models (datacube.wu.ac.at can be slow; retry with increased timeout)
  RUN R -e "\
    options(timeout = 300); \
    for (i in 1:3) { \
      tryCatch({ \
        install.packages('openNLPmodels.de', repos='http://datacube.wu.ac.at/', type='source'); \
        if (requireNamespace('openNLPmodels.de', quietly=TRUE)) break \
      }, error = function(e) if (i == 3) stop('Failed to install openNLPmodels.de after 3 attempts')) \
    }"

  # Install German hyphenation packages for syllable counting
  # (sylly from CRAN; sylly.de is NOT on CRAN — served from the author's l10n repository)
  RUN R -e "\
    options(timeout = 300); \
    pkgs <- c('sylly', 'sylly.de'); \
    install.packages(pkgs, repos=c('https://cloud.r-project.org/', 'https://undocumeantit.github.io/repos/l10n/')); \
    for (p in pkgs) { if (!requireNamespace(p, quietly=TRUE)) stop(paste('Failed to install:', p)) }"

  COPY r-sidecar/ .

  EXPOSE 8787

  CMD ["Rscript", "start.R"]
  ```

  (All RUN payloads are byte-identical to before; only the `FROM … AS` stage seams, the second `WORKDIR /app`, and `ENV PORT=8787` are gone.)

- [ ] **Step 3: Build the image.**

  ```bash
  cd /c/Users/info/projects/lesbarkeitsindex
  docker compose build r-sidecar
  ```

  Expected: exit 0. With a warm local layer cache this is fast; a cold build takes 15–30 min (R package compilation). Note: the flattened instruction chain invalidates the CI gha cache once — the first CI run after this lands rebuilds the r-sidecar layers, subsequent runs re-cache.

- [ ] **Step 4: Run the container and verify health.**

  ```bash
  cd /c/Users/info/projects/lesbarkeitsindex
  docker compose up -d r-sidecar
  curl -fsS --retry 40 --retry-delay 3 --retry-connrefused --retry-all-errors http://localhost:8787/health
  docker compose ps r-sidecar
  ```

  Expected: the curl succeeds (R startup takes ~60 s; budget is 120 s) and prints the health payload; `docker compose ps` shows the service `Up … (healthy)` once the compose healthcheck has run.

- [ ] **Step 5: Commit.**

  ```bash
  cd /c/Users/info/projects/lesbarkeitsindex
  git add Dockerfile.r-sidecar
  git commit -m "$(cat <<'EOF'
  build: flatten Dockerfile.r-sidecar into one linear stage

  The base/deps/runner stages formed a straight chain that nothing
  (target:, COPY --from) referenced. Flattening removes the stage seams
  and the duplicate WORKDIR; layer content and caching are unchanged.
  Also drop ENV PORT=8787 — start.R hardcodes the port and never reads it.

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

  Expected: commit created.

---

### Task 30: Collapse the four Caddy handle blocks into one named matcher

**Covers findings:** F16
**Files:** Modify: `Caddyfile`
**Interfaces:** Consumes: nothing / Produces: nothing

Four `handle` blocks all `reverse_proxy backend:3000`. One named path matcher covers all four path sets; the bare `reverse_proxy frontend:3000` stays as the fallback (Caddy keeps source order for same-named directives, so the matched proxy wins for backend paths). The Caddyfile uses TABS for indentation — keep them.

- [ ] **Step 1: Rewrite `Caddyfile` (complete new file content; indentation is tabs).**

  ```
  lix.florianbieck.com {
  	tls info@florianbieck.com
  	# Same-origin API proxy to avoid third-party cookies/CORS.
  	# Auth endpoints keep their /api/auth prefix in the backend; app API
  	# endpoints (/calculate, /config, /results) live at the backend root.
  	@backend path /api/auth/* /calculate* /config* /results*
  	reverse_proxy @backend backend:3000
  	# Everything else goes to the frontend
  	reverse_proxy frontend:3000
  }
  ```

- [ ] **Step 2: Validate the config with the caddy binary.**

  ```bash
  cd /c/Users/info/projects/lesbarkeitsindex
  MSYS_NO_PATHCONV=1 docker run --rm -v "C:/Users/info/projects/lesbarkeitsindex/Caddyfile:/etc/caddy/Caddyfile" caddy:2 caddy validate --config /etc/caddy/Caddyfile
  ```

  Expected: output contains `Valid configuration` (JSON log lines may follow it), exit 0. (On a Linux/WSL shell use `-v "$(pwd)/Caddyfile:/etc/caddy/Caddyfile"` without the `MSYS_NO_PATHCONV` prefix.) Optionally double-check route equivalence: `MSYS_NO_PATHCONV=1 docker run --rm -v "C:/Users/info/projects/lesbarkeitsindex/Caddyfile:/etc/caddy/Caddyfile" caddy:2 caddy adapt --config /etc/caddy/Caddyfile 2>/dev/null | grep -o '"/[a-z/*]*"' | sort -u` → shows exactly `"/api/auth/*"`, `"/calculate*"`, `"/config*"`, `"/results*"`. (Both commands were dry-run verified against caddy:2 with this exact file content during plan review.)

- [ ] **Step 3: Commit.**

  ```bash
  cd /c/Users/info/projects/lesbarkeitsindex
  git add Caddyfile
  git commit -m "$(cat <<'EOF'
  build: collapse four Caddy handle blocks into one named matcher

  @backend path matcher covers /api/auth/*, /calculate*, /config* and
  /results* with a single reverse_proxy to backend:3000; the bare
  frontend proxy stays as the fallback. Routing is unchanged.

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

  Expected: commit created.

---

### Task 31: Deduplicate the root manifest (pnpm settings + workspaces)

**Covers findings:** F13, F31
**Files:** Modify: `package.json`, `CLAUDE.md` (Test: verified via `pnpm install` + backend unit suite; `pnpm-lock.yaml` may be rewritten by pnpm — include it in the commit if so)
**Interfaces:** Consumes: nothing / Produces: `pnpm-workspace.yaml` `allowBuilds` map as the single source of truth for native build permissions (documented in the CLAUDE.md "Native build scripts" gotcha)

The working tree already carries the pnpm@11.9.0 bump: `pnpm-workspace.yaml` now holds the `allowBuilds` map (the pnpm 11 location; it is a superset of the old list — it adds `@scarf/scarf`). The root `package.json`'s `pnpm.onlyBuiltDependencies` block is not merely a duplicate — pnpm 11 no longer reads the `pnpm` field at all; verified: every pnpm invocation in this repo currently prints `[WARN] The "pnpm" field in package.json is no longer read by pnpm. The following keys were ignored: "pnpm.onlyBuiltDependencies".` — removing the block also silences that warning. The npm-style `workspaces` field has always been dead weight (pnpm reads `pnpm-workspace.yaml` exclusively). The orchestrator's preamble committed the working-tree state first — these Before blocks reflect it.

- [ ] **Step 1: Remove the npm-style `workspaces` field from root `package.json`.**

  Before:
  ```json
  {
    "name": "lesbarkeitsindex",
    "private": true,
    "workspaces": [
      "apps/*",
      "packages/*"
    ],
    "type": "module",
  ```

  After:
  ```json
  {
    "name": "lesbarkeitsindex",
    "private": true,
    "type": "module",
  ```

- [ ] **Step 2: Remove the duplicated `pnpm.onlyBuiltDependencies` block.**

  Before:
  ```json
    "packageManager": "pnpm@11.9.0",
    "pnpm": {
      "onlyBuiltDependencies": [
        "@prisma/engines",
        "prisma",
        "esbuild",
        "@parcel/watcher",
        "unrs-resolver",
        "@nestjs/core",
        "@swc/core"
      ]
    }
  }
  ```

  After:
  ```json
    "packageManager": "pnpm@11.9.0"
  }
  ```

- [ ] **Step 3: Update the CLAUDE.md "Native build scripts" gotcha.**

  Before:
  ```markdown
  - **Native build scripts**: Root `package.json` has `pnpm.onlyBuiltDependencies` — when adding deps with native code (e.g. `@swc/core`), add them to this list or `pnpm install` will skip their build scripts.
  ```

  After:
  ```markdown
  - **Native build scripts**: `pnpm-workspace.yaml` has an `allowBuilds` map — when adding deps with native code (e.g. `@swc/core`), add them there or `pnpm install` will skip their build scripts.
  ```

- [ ] **Step 4: Verify pnpm still builds the native deps.**

  ```bash
  cd /c/Users/info/projects/lesbarkeitsindex
  pnpm install 2>&1 | tee "/c/Users/info/AppData/Local/Temp/claude/C--Users-info-projects-lesbarkeitsindex/b8bc38aa-edbf-45e0-b72c-2bf121628aa8/scratchpad/pnpm-install-31.log"
  grep -i "ignored build" "/c/Users/info/AppData/Local/Temp/claude/C--Users-info-projects-lesbarkeitsindex/b8bc38aa-edbf-45e0-b72c-2bf121628aa8/scratchpad/pnpm-install-31.log" || echo "no skipped-build warnings"
  ```

  Expected: `pnpm install` exits 0 and the grep prints `no skipped-build warnings` — none of the `allowBuilds` packages (`@swc/core`, `esbuild`, `prisma`, `@prisma/engines`, `@parcel/watcher`, `unrs-resolver`, `@nestjs/core`, `@scarf/scarf`) appear in an "Ignored build scripts" warning. The log must also NO LONGER contain the `[WARN] The "pnpm" field in package.json is no longer read by pnpm` line that every pnpm command printed before this task. The backend `postinstall` (`prisma generate`) also runs, proving the prisma engine is usable.

- [ ] **Step 5: Run the backend unit suite as an end-to-end sanity check (esbuild/SWC/prisma-client all exercised).**

  ```bash
  cd /c/Users/info/projects/lesbarkeitsindex
  pnpm --filter backend run test
  ```

  Expected: all tests PASS.

- [ ] **Step 6: Commit (include the lockfile if pnpm rewrote it in Step 4).**

  ```bash
  cd /c/Users/info/projects/lesbarkeitsindex
  git status --porcelain pnpm-lock.yaml
  git add package.json CLAUDE.md pnpm-lock.yaml
  git commit -m "$(cat <<'EOF'
  chore: single source of truth for pnpm settings

  Remove the npm-style workspaces field (pnpm reads pnpm-workspace.yaml
  exclusively) and the pnpm.onlyBuiltDependencies block from root
  package.json — it duplicated the allowBuilds map that now lives in
  pnpm-workspace.yaml (pnpm 11 location). CLAUDE.md gotcha updated.

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

  Expected: commit created (`git add pnpm-lock.yaml` is a no-op if the lockfile was untouched).
### Task 32: Docs sweep and full build gate

**Covers findings:** none (closing sweep — stale docs left behind by Tasks 18/19, plus the full-repo type gate recommended because Vitest/SWC never type-checks)

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: the final state of all previous tasks (Tasks 11, 25, and 31 already edited other CLAUDE.md lines — the two lines below are untouched by them)
- Produces: nothing

- [ ] **Step 1: Remove the stale tech-stack lines from `CLAUDE.md`**

Task 18 removed Quill and Task 19 removed Day.js; their Tech Stack Rules entries are now false. Before:

```markdown
- **Charts**: Chart.js + `chartjs-plugin-annotation`
- **Rich text**: Quill
- **Dates**: Day.js
```

After:

```markdown
- **Charts**: Chart.js + `chartjs-plugin-annotation`
```

- [ ] **Step 2: Grep for other stale references to the removed deps**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && grep -rn --exclude-dir=node_modules --exclude-dir=.nuxt --exclude=pnpm-lock.yaml -iE 'quill|dayjs|day\.js' --include='*.md' --include='*.ts' --include='*.vue' --include='*.json' . || echo CLEAN
```

Expected: `CLEAN`, or only hits inside `docs/superpowers/` (dated historical specs/plans stay untouched — including this plan). Any hit in `CLAUDE.md`, `README.md`, `CONTEXT.md`, app code, or manifests means an earlier task was executed incompletely: STOP and report which.

- [ ] **Step 3: Full type gate — backend build**

Vitest (SWC) does not type-check, so the two builds are the only full type verification in the toolchain:

```bash
cd /c/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run build
```

Expected: `nest build --builder swc` exits 0, no type errors.

- [ ] **Step 4: Full type gate — frontend build**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && pnpm --filter frontend run build
```

Expected: `nuxt build` exits 0.

- [ ] **Step 5: Final full test pass**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && pnpm --filter backend run test && pnpm --filter frontend run test:unit
```

Expected: both suites PASS (backend ≈ 8 files, frontend suite green; exact counts shifted vs the Task 0 baseline because Tasks 1–21 updated and removed specs — what matters is zero failures).

- [ ] **Step 6: Commit**

```bash
cd /c/Users/info/projects/lesbarkeitsindex && git add CLAUDE.md && git commit -m "docs: drop Quill and Day.js from tech stack rules

Both dependencies were removed by the audit remediation
(Textarea replaces the Editor; Intl replaces dayjs).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## After the last task

- The branch already has a **draft PR** from Task 27 Step 5 (CI matrix verification) — mark it ready for review instead of opening a new one; do not merge before its CI run is green.
- E2E post-verification (needs the Docker stack): `pnpm --filter frontend run test:e2e` covers the `.ql-editor` → Textarea migration in `homepage.spec.ts`/`results.spec.ts` (updated in Task 18) and the results-page rendering after Tasks 1/19.
- First prod deploy after merge: confirm `docker compose version` ≥ 2.24.4 on the deploy host (Task 28 overlay uses `!reset`), and run the Task 1 migration via the existing deploy flow (`prisma migrate deploy` runs in the backend container CMD).
