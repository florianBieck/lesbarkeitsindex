import {
  detectTextType,
  readingUnitForTextType,
  type ReadingUnit,
  type TextType,
} from './text-type.js';
import { detectTitle } from './title-guard.js';

/**
 * Textgestalt (CONTEXT.md): wie ein Text vor jeder Kennzahl in Leseeinheiten
 * zerfällt — Texttyp (heuristisch erkannt und ggf. übersteuert), Leseeinheit,
 * Titel und der titelbereinigte Fließtext, auf dem die NLP-Analyse läuft.
 */
export interface TextShape {
  /** Effektiver Texttyp: Override falls gesetzt, sonst die Heuristik. */
  readonly textType: TextType;
  /** Heuristisch erkannter Texttyp — bleibt erhalten, auch wenn übersteuert. */
  readonly detectedTextType: TextType;
  /** Leseeinheit zum effektiven Texttyp: Satz bei Fließtext, Zeile bei Liste. */
  readonly readingUnit: ReadingUnit;
  /** Erkannter Titel, oder '' (bei Liste oder ohne Titel). */
  readonly title: string;
  /** Fließtext ohne Titel; bei Liste der volle Originaltext. */
  readonly bodyText: string;
}

/**
 * Löst die {@link TextShape} aus dem Originaltext und einem optionalen
 * Texttyp-Override auf. Pure und total.
 *
 * Einzige Quelle der Auflösung: sowohl die Sidecar-Eingabe (über `bodyText`)
 * als auch die Kennzahlen-Berechnung lesen das Ergebnis dieser Funktion, statt
 * die Herleitung zu duplizieren.
 *
 * Reihenfolge ist load-bearing: Der Texttyp wird zuerst bestimmt, denn der
 * Titel-Guard ist ein Fließtext-Konzept (ADR 0002) und würde sonst das erste
 * Listenelement als Titel ausweisen.
 */
export function resolveTextShape(text: string, textTypeOverride?: TextType): TextShape {
  const detectedTextType = detectTextType(text);
  const textType: TextType = textTypeOverride ?? detectedTextType;
  const readingUnit = readingUnitForTextType(textType);
  const { title, bodyText } =
    textType === 'list' ? { title: '', bodyText: text } : detectTitle(text);
  return { textType, detectedTextType, readingUnit, title, bodyText };
}
