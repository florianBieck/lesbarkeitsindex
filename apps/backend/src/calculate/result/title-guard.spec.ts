import { describe, test, expect } from 'vitest';
import { detectTitle, TITLE_MAX_LENGTH } from './title-guard.js';

describe('TITLE_MAX_LENGTH', () => {
  test('beträgt 50 Zeichen', () => {
    expect(TITLE_MAX_LENGTH).toBe(50);
  });
});

describe('detectTitle', () => {
  describe('erkennt echte Titel', () => {
    test('kurze erste Zeile ohne Satzzeichen vor Fließtext', () => {
      expect(detectTitle('Der Igel\nIgel sind nachtaktive Tiere. Sie schlafen am Tag.')).toEqual({
        title: 'Der Igel',
        bodyText: 'Igel sind nachtaktive Tiere. Sie schlafen am Tag.',
      });
    });

    test('trimmt Leerraum um die erste Zeile', () => {
      expect(detectTitle('  Der Igel  \nText hier.')).toEqual({
        title: 'Der Igel',
        bodyText: 'Text hier.',
      });
    });

    test('CRLF: kein \\r im Titel und kein \\r im Fließtext', () => {
      expect(detectTitle('Titel\r\nBody folgt hier.')).toEqual({
        title: 'Titel',
        bodyText: 'Body folgt hier.',
      });
    });

    test('Leerzeile nach dem Titel bleibt im Fließtext erhalten', () => {
      expect(detectTitle('Titel\n\nBody folgt hier.')).toEqual({
        title: 'Titel',
        bodyText: '\nBody folgt hier.',
      });
    });

    test('Satzzeichen im Inneren der Zeile stören nicht', () => {
      expect(detectTitle('Max und Moritz – Eine Bubengeschichte\nEs war einmal.')).toEqual({
        title: 'Max und Moritz – Eine Bubengeschichte',
        bodyText: 'Es war einmal.',
      });
    });

    test('Doppelpunkt am Ende disqualifiziert nicht', () => {
      expect(detectTitle('Kapitel 1:\nEs beginnt sofort.')).toEqual({
        title: 'Kapitel 1:',
        bodyText: 'Es beginnt sofort.',
      });
    });

    test('Unicode-Ellipse … am Ende disqualifiziert nicht', () => {
      expect(detectTitle('Tja…\nMehr Text folgt.')).toEqual({
        title: 'Tja…',
        bodyText: 'Mehr Text folgt.',
      });
    });

    test('schließendes Anführungszeichen nach Punkt disqualifiziert nicht', () => {
      expect(detectTitle('Er sagte „Halt.“\nDann ging er weiter.')).toEqual({
        title: 'Er sagte „Halt.“',
        bodyText: 'Dann ging er weiter.',
      });
    });

    test('eine einzelne Ziffer im Fließtext genügt als weiterer Text', () => {
      expect(detectTitle('Titel\n7')).toEqual({ title: 'Titel', bodyText: '7' });
    });

    test('genau 50 Zeichen sind noch ein Titel', () => {
      const fifty = 'A'.repeat(TITLE_MAX_LENGTH);
      expect(fifty).toHaveLength(50);
      expect(detectTitle(`${fifty}\nBody folgt hier.`)).toEqual({
        title: fifty,
        bodyText: 'Body folgt hier.',
      });
    });

    test('genau 50 Zeichen mit Umlauten zählen je 1 Zeichen', () => {
      const fiftyUmlauts = 'Ä'.repeat(TITLE_MAX_LENGTH);
      expect(fiftyUmlauts).toHaveLength(50);
      expect(detectTitle(`${fiftyUmlauts}\nBody folgt hier.`)).toEqual({
        title: fiftyUmlauts,
        bodyText: 'Body folgt hier.',
      });
    });

    test('Längengrenze gilt für die getrimmte Zeile', () => {
      const fifty = 'A'.repeat(TITLE_MAX_LENGTH);
      expect(detectTitle(`  ${fifty}  \nBody folgt hier.`)).toEqual({
        title: fifty,
        bodyText: 'Body folgt hier.',
      });
    });
  });

  describe('erkennt keinen Titel', () => {
    test('einzeiliger Text bleibt vollständig Fließtext', () => {
      expect(detectTitle('Nur eine Zeile')).toEqual({
        title: '',
        bodyText: 'Nur eine Zeile',
      });
    });

    test('leere Eingabe', () => {
      expect(detectTitle('')).toEqual({ title: '', bodyText: '' });
    });

    test('erste Zeile nur aus Leerraum', () => {
      expect(detectTitle('   \nText hier.')).toEqual({
        title: '',
        bodyText: '   \nText hier.',
      });
    });

    test('führende Leerzeile: erster Satz geht nicht verloren', () => {
      expect(detectTitle('\nText folgt.')).toEqual({
        title: '',
        bodyText: '\nText folgt.',
      });
    });

    test('51 Zeichen sind zu lang', () => {
      const fiftyOne = 'A'.repeat(TITLE_MAX_LENGTH + 1);
      const text = `${fiftyOne}\nBody folgt hier.`;
      expect(detectTitle(text)).toEqual({ title: '', bodyText: text });
    });

    test('erste Zeile endet mit Punkt', () => {
      const text = 'Der Igel schläft.\nMehr Text folgt.';
      expect(detectTitle(text)).toEqual({ title: '', bodyText: text });
    });

    test('erste Zeile endet mit Ausrufezeichen', () => {
      const text = 'Hurra!\nMehr Text folgt.';
      expect(detectTitle(text)).toEqual({ title: '', bodyText: text });
    });

    test('erste Zeile endet mit Fragezeichen', () => {
      const text = 'Wirklich?\nMehr Text folgt.';
      expect(detectTitle(text)).toEqual({ title: '', bodyText: text });
    });

    test('erste Zeile endet mit ?!', () => {
      const text = 'Was nun?!\nMehr Text folgt.';
      expect(detectTitle(text)).toEqual({ title: '', bodyText: text });
    });

    test('ASCII-Ellipse ... endet mit Punkt', () => {
      const text = 'Tja...\nMehr Text folgt.';
      expect(detectTitle(text)).toEqual({ title: '', bodyText: text });
    });

    test('Rest nur aus Leerraum ist kein weiterer Text', () => {
      const text = 'Titel\n   ';
      expect(detectTitle(text)).toEqual({ title: '', bodyText: text });
    });

    test('Rest nur aus Satzzeichen ist kein weiterer Text', () => {
      const text = 'Titel\n...';
      expect(detectTitle(text)).toEqual({ title: '', bodyText: text });
    });
  });
});
