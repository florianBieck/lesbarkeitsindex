import { describe, test, expect } from 'vitest';
import { extractHeadingText, filterHeadingSentences } from './heading-extraction.js';

describe('extractHeadingText', () => {
  test('returns the first line of multi-line text', () => {
    expect(extractHeadingText('Überschrift\nErster Satz. Zweiter Satz.')).toBe('Überschrift');
  });

  test('trims whitespace from the first line', () => {
    expect(extractHeadingText('  Überschrift  \nText hier.')).toBe('Überschrift');
  });

  test('returns the full text if there is no newline', () => {
    expect(extractHeadingText('Nur eine Zeile')).toBe('Nur eine Zeile');
  });

  test('returns empty string for empty input', () => {
    expect(extractHeadingText('')).toBe('');
  });

  test('returns empty string for whitespace-only first line', () => {
    expect(extractHeadingText('   \nText hier.')).toBe('');
  });

  test('handles Windows-style line endings', () => {
    expect(extractHeadingText('Überschrift\r\nText hier.')).toBe('Überschrift');
  });
});

describe('filterHeadingSentences', () => {
  const sentences = ['Überschrift', 'Erster Satz.', 'Zweiter Satz.'];

  test('filters exact heading match from sentences', () => {
    const result = filterHeadingSentences(sentences, 'Überschrift');
    expect(result.bodySentences).toEqual(['Erster Satz.', 'Zweiter Satz.']);
    expect(result.headingSentences).toEqual(['Überschrift']);
  });

  test('matches heading even when R adds trailing punctuation', () => {
    const withPunct = ['Überschrift.', 'Erster Satz.', 'Zweiter Satz.'];
    const result = filterHeadingSentences(withPunct, 'Überschrift');
    expect(result.bodySentences).toEqual(['Erster Satz.', 'Zweiter Satz.']);
    expect(result.headingSentences).toEqual(['Überschrift.']);
  });

  test('returns all sentences as body when heading is empty', () => {
    const result = filterHeadingSentences(sentences, '');
    expect(result.bodySentences).toEqual(sentences);
    expect(result.headingSentences).toEqual([]);
  });

  test('returns all sentences as body when no match found', () => {
    const result = filterHeadingSentences(sentences, 'Nicht vorhanden');
    expect(result.bodySentences).toEqual(sentences);
    expect(result.headingSentences).toEqual([]);
  });

  test('only removes the first matching sentence', () => {
    const duplicated = ['Titel', 'Titel', 'Ein Satz.'];
    const result = filterHeadingSentences(duplicated, 'Titel');
    expect(result.bodySentences).toEqual(['Titel', 'Ein Satz.']);
    expect(result.headingSentences).toEqual(['Titel']);
  });

  test('handles whitespace in sentence matching', () => {
    const withSpaces = ['  Überschrift  ', 'Ein Satz.'];
    const result = filterHeadingSentences(withSpaces, 'Überschrift');
    expect(result.bodySentences).toEqual(['Ein Satz.']);
    expect(result.headingSentences).toEqual(['  Überschrift  ']);
  });
});
