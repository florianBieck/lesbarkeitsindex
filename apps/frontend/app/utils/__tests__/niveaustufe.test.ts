import { describe, test, expect } from 'vitest';
import { niveaustufe } from '../niveaustufe';

describe('niveaustufe — Stufe → Label + Severity (ADR 0003)', () => {
  test('Stufe 1 und 2 sind grün (success)', () => {
    expect(niveaustufe(1)).toEqual({ label: 'Sehr leicht lesbar', severity: 'success' });
    expect(niveaustufe(2)).toEqual({ label: 'Leicht lesbar', severity: 'success' });
  });

  test('Stufe 3 ist amber (warn)', () => {
    expect(niveaustufe(3)).toEqual({ label: 'Mittelschwer', severity: 'warn' });
  });

  test('Stufe 4 und 5 sind rot (error)', () => {
    expect(niveaustufe(4)).toEqual({ label: 'Eher schwer lesbar', severity: 'error' });
    expect(niveaustufe(5)).toEqual({ label: 'Schwer lesbar', severity: 'error' });
  });

  test('Werte außerhalb 1–5 fallen defensiv auf die schwerste Stufe', () => {
    for (const level of [0, 6, -1, 99]) {
      expect(niveaustufe(level)).toEqual({ label: 'Schwer lesbar', severity: 'error' });
    }
  });
});
