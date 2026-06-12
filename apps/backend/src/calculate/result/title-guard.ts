/**
 * Titel-Guard (Glossar-Begriff "Titel"):
 * Die erste Zeile eines Textes gilt nur dann als Titel, wenn sie kurz ist
 * (<= {@link TITLE_MAX_LENGTH} Zeichen), nicht mit Satzzeichen endet und
 * weiterer Text folgt. Ein erkannter Titel fließt in keine Kennzahl ein.
 */

/** Maximale Länge (getrimmt, UTF-16-Einheiten) einer Titelzeile. */
export const TITLE_MAX_LENGTH = 50;

/** Ergebnis der Titel-Erkennung: erkannter Titel und der zu analysierende Fließtext. */
export interface TitleSplit {
  /** Getrimmte erste Zeile, oder '' wenn kein Titel erkannt wurde. */
  readonly title: string;
  /** Fließtext ohne Titelzeile; bei nicht erkanntem Titel der volle Originaltext. */
  readonly bodyText: string;
}

/** Eine Zeile, die mit '.', '!' oder '?' endet, ist ein Satz — kein Titel. */
const TERMINAL_PUNCTUATION = /[.!?]$/;

/** "Weiterer Text folgt" = der Rest enthält mindestens einen Buchstaben oder eine Ziffer. */
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

/**
 * Erkennt einen Titel in der ersten Zeile eines Textes.
 *
 * Die erste Zeile ist genau dann ein Titel, wenn alle Bedingungen gelten:
 * - der Text hat mindestens zwei Zeilen (enthält ein '\n'),
 * - die getrimmte erste Zeile ist nicht leer und höchstens
 *   {@link TITLE_MAX_LENGTH} Zeichen lang (JS-`.length`; Umlaute/ß zählen 1,
 *   Astral-Zeichen wie Emoji zählen 2 — akzeptierte Einschränkung),
 * - das letzte Zeichen der getrimmten Zeile ist keines von '.', '!', '?'
 *   (glossar-wörtlich: die Unicode-Ellipse '…', Doppelpunkt oder ein
 *   schließendes Anführungszeichen disqualifizieren NICHT; ASCII '...'
 *   endet mit '.' und disqualifiziert),
 * - der Rest nach dem ersten '\n' enthält mindestens einen Buchstaben oder
 *   eine Ziffer (ein nur aus Leerraum oder Satzzeichen bestehender Rest wäre
 *   kein Fließtext und würde den R-Sidecar mit leerer Satzliste antworten lassen).
 *
 * Rückgabe-Invariante: `title === ''` impliziert `bodyText === text`
 * (voller Originaltext); bei erkanntem Titel ist `bodyText` der Rest nach dem
 * ersten '\n' — wörtlich, inklusive eventuell führender Leerzeilen. Ein
 * abschließendes '\r' der ersten Zeile (CRLF) wird durch das Trimmen entfernt
 * und gelangt weder in den Titel noch in den Fließtext.
 *
 * Pure und total: mutiert nichts, wirft nie, liefert für jeden String ein Ergebnis.
 */
export function detectTitle(text: string): TitleSplit {
  const newlineIndex = text.indexOf('\n');
  if (newlineIndex === -1) {
    return { title: '', bodyText: text };
  }

  const candidate = text.slice(0, newlineIndex).trim();
  const remainder = text.slice(newlineIndex + 1);

  const isTitle =
    candidate.length > 0 &&
    candidate.length <= TITLE_MAX_LENGTH &&
    !TERMINAL_PUNCTUATION.test(candidate) &&
    LETTER_OR_DIGIT.test(remainder);

  if (isTitle) {
    return { title: candidate, bodyText: remainder };
  }

  return { title: '', bodyText: text };
}
