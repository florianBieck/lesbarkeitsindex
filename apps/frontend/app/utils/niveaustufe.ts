/**
 * Niveaustufe (1–5) → Anzeige: deutscher Text plus PrimeVue-Severity.
 *
 * Ampel-Gruppierung (ADR 0003): Stufe 1–2 grün (success), 3 amber (warn),
 * 4–5 rot (error). Werte außerhalb 1–5 fallen defensiv auf die schwerste Stufe
 * — das Backend liefert nur 1–5.
 *
 * Rein und DOM-frei: die konkrete Farbe leitet die Ergebnisansicht aus der
 * Severity ab (Theme-Token), daher steht sie nicht hier.
 */
export type Severity = 'success' | 'warn' | 'error';

export interface NiveaustufeInfo {
  readonly label: string;
  readonly severity: Severity;
}

export function niveaustufe(level: number): NiveaustufeInfo {
  switch (level) {
    case 1:
      return { label: 'Sehr leicht lesbar', severity: 'success' };
    case 2:
      return { label: 'Leicht lesbar', severity: 'success' };
    case 3:
      return { label: 'Mittelschwer', severity: 'warn' };
    case 4:
      return { label: 'Eher schwer lesbar', severity: 'error' };
    default:
      return { label: 'Schwer lesbar', severity: 'error' };
  }
}
