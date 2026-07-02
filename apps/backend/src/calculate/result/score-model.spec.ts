import { describe, test, expect } from 'vitest';
import { calculateLueLix, calculateLevel } from './score-model.js';

describe('calculateLueLix (Aufschlagsmodell: LIX + α·WK)', () => {
  test('ist gleich dem LIX, wenn α = 0 (AC1)', () => {
    expect(calculateLueLix(42.5, 38.75, 0)).toBe(42.5);
    expect(calculateLueLix(20, 100, 0)).toBe(20);
  });

  test('schlägt α·WK auf den LIX auf', () => {
    // 40 + 0,3·50 = 55
    expect(calculateLueLix(40, 50, 0.3)).toBe(55);
  });

  test('ist nie kleiner als der LIX (AC1, beliebige Eingaben)', () => {
    for (const lix of [0, 12.3, 30, 47.8, 70]) {
      for (const wk of [0, 1, 38.75, 100]) {
        for (const alpha of [0, 0.3, 1]) {
          expect(calculateLueLix(lix, wk, alpha)).toBeGreaterThanOrEqual(lix);
        }
      }
    }
  });
});

describe('calculateLevel (Niveaustufe 1–5 aus LÜ-LIX, Bänder 30/40/50/60 — AC3)', () => {
  test('Stufe 1 unter 30', () => {
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(29.99)).toBe(1);
  });

  test('Stufe 2 im Band 30–<40', () => {
    expect(calculateLevel(30)).toBe(2);
    expect(calculateLevel(39.99)).toBe(2);
  });

  test('Stufe 3 im Band 40–<50', () => {
    expect(calculateLevel(40)).toBe(3);
    expect(calculateLevel(49.99)).toBe(3);
  });

  test('Stufe 4 im Band 50–<60', () => {
    expect(calculateLevel(50)).toBe(4);
    expect(calculateLevel(59.99)).toBe(4);
  });

  test('Stufe 5 ab 60', () => {
    expect(calculateLevel(60)).toBe(5);
    expect(calculateLevel(120)).toBe(5);
  });
});
