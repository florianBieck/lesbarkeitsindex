/*
    Aufschlagsmodell (ADR 0001):
    - LÜ-LIX = LIX + α·WK,
    - Niveaustufe 1–5 aus dem LÜ-LIX.

    Die Wortkomplexität (WK) selbst lebt in word-complexity.ts — sie ist ein
    eigenständiger Wert, dieses Modul setzt nur den Aufschlag darauf.
 */

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
