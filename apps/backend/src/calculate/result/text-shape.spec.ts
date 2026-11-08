import { describe, test, expect } from 'vitest';
import { resolveTextShape } from './text-shape.js';

describe('resolveTextShape — Textgestalt-Auflösung (ADR 0002)', () => {
  test('Fließtext mit Titel: Titel abgetrennt, bodyText ist der Rest', () => {
    const shape = resolveTextShape('Sommer\nDie Sonne scheint. Es ist warm.');
    expect(shape).toEqual({
      textType: 'prose',
      detectedTextType: 'prose',
      readingUnit: 'sentence',
      title: 'Sommer',
      bodyText: 'Die Sonne scheint. Es ist warm.',
    });
  });

  test('Fließtext ohne Titel (einzelne Zeile): title leer, bodyText === text', () => {
    const text = 'Der Hund läuft schnell.';
    const shape = resolveTextShape(text);
    expect(shape.textType).toBe('prose');
    expect(shape.title).toBe('');
    expect(shape.bodyText).toBe(text);
  });

  test('Liste: Zeile als Leseeinheit, kein Titel, bodyText ist der volle Text', () => {
    const text = 'Hund\nKatze\nVogel';
    const shape = resolveTextShape(text);
    expect(shape).toEqual({
      textType: 'list',
      detectedTextType: 'list',
      readingUnit: 'line',
      title: '',
      bodyText: text,
    });
  });

  test('Liste mit titelartiger erster Zeile: Titel-Guard wird NICHT angewandt', () => {
    // Erste Zeile sähe als Fließtext wie ein Titel aus — bei Liste bleibt sie im Text.
    const text = 'Tiere\nHund\nKatze';
    const shape = resolveTextShape(text);
    expect(shape.textType).toBe('list');
    expect(shape.title).toBe('');
    expect(shape.bodyText).toBe(text);
  });

  test('Override "list" auf Fließtext: detectedTextType bleibt die Heuristik', () => {
    const text = 'Sommer\nDie Sonne scheint. Es ist warm.';
    const shape = resolveTextShape(text, 'list');
    expect(shape.textType).toBe('list');
    expect(shape.detectedTextType).toBe('prose');
    expect(shape.readingUnit).toBe('line');
    expect(shape.title).toBe('');
    expect(shape.bodyText).toBe(text);
  });

  test('Override "prose" auf Liste: Titel-Guard greift wieder', () => {
    const text = 'Tiere\nHund\nKatze';
    const shape = resolveTextShape(text, 'prose');
    expect(shape.textType).toBe('prose');
    expect(shape.detectedTextType).toBe('list');
    expect(shape.readingUnit).toBe('sentence');
    expect(shape.title).toBe('Tiere');
    expect(shape.bodyText).toBe('Hund\nKatze');
  });

  test('Leerer Text: Fließtext-Default, title leer, bodyText === text', () => {
    const shape = resolveTextShape('');
    expect(shape.textType).toBe('prose');
    expect(shape.detectedTextType).toBe('prose');
    expect(shape.title).toBe('');
    expect(shape.bodyText).toBe('');
  });

  test('CRLF-Titelzeile: abschließendes \\r wird getrimmt', () => {
    const shape = resolveTextShape('Sommer\r\nDie Sonne scheint. Es ist warm.');
    expect(shape.title).toBe('Sommer');
    expect(shape.bodyText).toBe('Die Sonne scheint. Es ist warm.');
  });
});
