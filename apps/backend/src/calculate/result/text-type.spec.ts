import { describe, test, expect } from 'vitest';
import {
  detectTextType,
  countNonEmptyLines,
  readingUnitForTextType,
} from './text-type.js';

describe('detectTextType — heuristische Texttyp-Erkennung (ADR 0002)', () => {
  test('einzelner Satz mit Punkt: Fließtext', () => {
    expect(detectTextType('Der Hund läuft.')).toBe('prose');
  });

  test('einzelnes Wort ohne Punkt: Liste', () => {
    expect(detectTextType('Hund')).toBe('list');
  });

  test('mehrere Wörter ohne Punkt: Liste', () => {
    expect(detectTextType('Hund\nKatze\nVogel')).toBe('list');
  });

  test('mehrere Sätze mit Punkten: Fließtext', () => {
    expect(detectTextType('Der Hund läuft.\nDie Katze schläft.\nEin Vogel singt.')).toBe('prose');
  });

  test('Mehrheit ohne Punkt → Liste', () => {
    expect(detectTextType('Hund\nKatze\nVogel\nDer Bär läuft.')).toBe('list');
  });

  test('genau die Hälfte ohne Punkt → Fließtext (Mehrheit nicht erreicht)', () => {
    expect(detectTextType('Hund\nKatze.\nVogel\nMaus.')).toBe('prose');
  });

  test('Liste "Sommer" (Wörter, Formulierungen, Sätze gemischt): Liste', () => {
    expect(detectTextType('Sonne\nEis essen\nIm Garten spielen.\nSchwimmen')).toBe('list');
  });

  test('Fließtext mit einer fehlenden Punkt-Stelle bleibt Fließtext', () => {
    expect(detectTextType('Der Hund läuft\nDie Katze schläft.')).toBe('prose');
  });

  test('leere Zeilen werden ignoriert', () => {
    expect(detectTextType('Hund\n\n\nKatze\nVogel')).toBe('list');
  });

  test('Whitespace-Zeilen werden ignoriert', () => {
    expect(detectTextType('Hund\n   \nKatze')).toBe('list');
  });

  test('! und ? zählen wie Punkte als Satzendzeichen', () => {
    expect(detectTextType('Wie heißt du?\nHallo!')).toBe('prose');
  });

  test('Doppelpunkt ist KEIN Satzendzeichen (Konsistenz mit Titel-Guard)', () => {
    expect(detectTextType('Vorgehen:')).toBe('list');
  });

  test('Unicode-Ellipse … ist KEIN Satzendzeichen (Konsistenz mit Titel-Guard)', () => {
    expect(detectTextType('Und dann…')).toBe('list');
  });

  test('leerer Text: Fließtext (Default)', () => {
    expect(detectTextType('')).toBe('prose');
  });

  test('nur Whitespace: Fließtext (Default)', () => {
    expect(detectTextType('   \n\n  ')).toBe('prose');
  });

  test('Trailing-Whitespace nach Satzzeichen zählt als Satzende', () => {
    expect(detectTextType('Der Hund läuft.   ')).toBe('prose');
  });

  test('Wörterliste (20 Wörter, eine pro Zeile, ohne Punkte) wird als Liste erkannt (AC1)', () => {
    const text =
      'Hund\nKatze\nVogel\nMaus\nFisch\nBär\nLöwe\nWolf\nTiger\nAdler\n' +
      'Hase\nIgel\nFrosch\nEule\nRabe\nElster\nMeise\nSpatz\nReh\nHirsch';
    expect(detectTextType(text)).toBe('list');
  });
});

describe('countNonEmptyLines — Zählung nicht-leerer Zeilen', () => {
  test('einzelne Zeile zählt 1', () => {
    expect(countNonEmptyLines('Hund')).toBe(1);
  });

  test('mehrere Zeilen werden gezählt', () => {
    expect(countNonEmptyLines('Hund\nKatze\nVogel')).toBe(3);
  });

  test('leere Zeilen werden nicht gezählt', () => {
    expect(countNonEmptyLines('Hund\n\n\nKatze')).toBe(2);
  });

  test('Whitespace-Zeilen werden nicht gezählt', () => {
    expect(countNonEmptyLines('Hund\n   \nKatze')).toBe(2);
  });

  test('leerer Text zählt 0', () => {
    expect(countNonEmptyLines('')).toBe(0);
  });

  test('CRLF-Zeilenenden werden wie LF behandelt', () => {
    expect(countNonEmptyLines('Hund\r\nKatze\r\nVogel')).toBe(3);
  });
});

describe('readingUnitForTextType', () => {
  test('Fließtext → Satz', () => {
    expect(readingUnitForTextType('prose')).toBe('sentence');
  });

  test('Liste → Zeile', () => {
    expect(readingUnitForTextType('list')).toBe('line');
  });
});
