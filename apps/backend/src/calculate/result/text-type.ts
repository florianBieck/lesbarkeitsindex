/**
 * Texttyp und Leseeinheit (ADR 0002):
 * Texte sind entweder Fließtext (Leseeinheit Satz) oder Liste (Leseeinheit Zeile).
 * Die Heuristik liest die Mehrheit der nicht-leeren Zeilen ohne Satzendzeichen
 * als Liste — bei Listen ersetzt die Zeilenzahl die Satzzahl als Nenner aller
 * satzbezogenen Maße. Nur mit Leseeinheit Satz berechnete Werte heißen
 * „LIX nach Bamberger".
 */

export type TextType = 'prose' | 'list';
export type ReadingUnit = 'sentence' | 'line';

/**
 * Eine Zeile, die mit '.', '!' oder '?' endet, gilt als Satz —
 * konsistent mit dem Titel-Guard. Unicode-Ellipse '…' und Doppelpunkt
 * disqualifizieren NICHT.
 */
const TERMINAL_PUNCTUATION = /[.!?]$/;

function nonEmptyTrimmedLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Zählt nicht-leere Zeilen (nach Trimmen). CRLF wird wie LF behandelt. */
export function countNonEmptyLines(text: string): number {
  return nonEmptyTrimmedLines(text).length;
}

/**
 * Erkennt den Texttyp heuristisch: Listen sind Texte, deren Mehrheit der
 * nicht-leeren Zeilen kein Satzendzeichen am Ende trägt. Bei genau der Hälfte
 * (kein strikter Mehrheitsüberhang) oder ohne nicht-leere Zeilen wird Fließtext
 * zurückgegeben — der konservative Default, der das bestehende Verhalten erhält.
 */
export function detectTextType(text: string): TextType {
  const lines = nonEmptyTrimmedLines(text);
  if (lines.length === 0) return 'prose';

  let withoutTerminal = 0;
  let withTerminal = 0;
  for (const line of lines) {
    if (TERMINAL_PUNCTUATION.test(line)) {
      withTerminal++;
    } else {
      withoutTerminal++;
    }
  }

  return withoutTerminal > withTerminal ? 'list' : 'prose';
}

/** Leseeinheit aus dem Texttyp: Fließtext → Satz, Liste → Zeile. */
export function readingUnitForTextType(textType: TextType): ReadingUnit {
  return textType === 'list' ? 'line' : 'sentence';
}
