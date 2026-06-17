/*
    Zwei-Werte-Score (ADR 0001, Aufschlagsmodell):
    - Wortkomplexität (WK) als eigenständiger Wert 0–100,
    - LÜ-LIX = LIX + α·WK,
    - Niveaustufe 1–5 aus dem LÜ-LIX.
 */

/** Die vier Coverage-Komponenten der Wortkomplexität, jeweils Anteil in [0, 1]. */
export interface WordComplexityComponents {
  readonly complexSyllables: number;
  readonly multiMemberedGraphemes: number;
  readonly rareGraphemes: number;
  readonly consonantClusters: number;
}

/** Fachliche Gewichte der vier Komponenten (Startwerte 50 / 25 / 12,5 / 12,5). */
export interface WordComplexityWeights {
  readonly complexSyllables: number;
  readonly multiMemberedGraphemes: number;
  readonly rareGraphemes: number;
  readonly consonantClusters: number;
}

/**
 * Wortkomplexität (WK), 0–100: gewichteter Mittelwert der vier Coverage-Komponenten,
 * normiert auf die Summe der Gewichte und auf 0–100 skaliert. Keine Streckung auf
 * Ankertexte — WK bleibt roh und direkt aus dem Text erklärbar (ADR 0001).
 */
export function calculateWordComplexity(
  components: WordComplexityComponents,
  weights: WordComplexityWeights,
): number {
  const totalWeight =
    weights.complexSyllables +
    weights.multiMemberedGraphemes +
    weights.rareGraphemes +
    weights.consonantClusters;
  if (totalWeight <= 0) return 0;

  const weightedSum =
    components.complexSyllables * weights.complexSyllables +
    components.multiMemberedGraphemes * weights.multiMemberedGraphemes +
    components.rareGraphemes * weights.rareGraphemes +
    components.consonantClusters * weights.consonantClusters;

  const wordComplexity = (weightedSum / totalWeight) * 100;
  return Math.round(wordComplexity * 100) / 100;
}

/**
 * LÜ-LIX = LIX + α·WK (Aufschlagsmodell). Die Wortkomplexität kann einen Text nur
 * schwerer machen, nie leichter: bei α ≥ 0 und WK ≥ 0 gilt LÜ-LIX ≥ LIX, bei α = 0
 * gilt LÜ-LIX = LIX. Die LIX-Berechnung selbst bleibt unverändert (Bamberger).
 */
export function calculateLueLix(lix: number, wordComplexity: number, alpha: number): number {
  return Math.round((lix + alpha * wordComplexity) * 100) / 100;
}

/**
 * Niveaustufe (1–5) aus dem LÜ-LIX, verankert an den LIX-Literatur-Bändern:
 * < 30 → 1, 30–<40 → 2, 40–<50 → 3, 50–<60 → 4, ≥ 60 → 5.
 */
export function calculateLevel(lueLix: number): number {
  if (lueLix < 30) return 1;
  if (lueLix < 40) return 2;
  if (lueLix < 50) return 3;
  if (lueLix < 60) return 4;
  return 5;
}
