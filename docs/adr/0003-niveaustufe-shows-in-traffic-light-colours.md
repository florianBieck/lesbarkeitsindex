# Ampelfarben der Niveaustufe

Die [[Niveaustufe]] (1–5, ADR 0001 Punkt 4) braucht für Lehrkräfte eine schnelle visuelle
Einordnung. Die fünf Stufen werden dafür auf drei Ampelfarben gruppiert.

Entscheidung (2026-06-24): Stufe 1–2 → grün (PrimeVue-Severity `success`), Stufe 3 →
amber (`warn`), Stufe 4–5 → rot (`error`). Die Gruppierung und die deutschen
Stufen-Bezeichnungen leben in einem reinen Frontend-Modul (`utils/niveaustufe.ts`) als
einzige Quelle; Gauge-, Text- und Icon-Farbe in der Ergebnisansicht leiten sich aus der
einen `severity` ab.

Stufe 3 ist **amber**, nicht reines Gelb: besserer Kontrast auf Weiß (WCAG AA, Markenvorgabe)
und einheitlich über Gauge und Label. Zuvor widersprachen sich Gauge (`--p-yellow-500`) und
Hero-Text (`text-amber-700`) für dieselbe Stufe.

Stufen-Bezeichnungen: 1 „Sehr leicht lesbar", 2 „Leicht lesbar", 3 „Mittelschwer",
4 „Eher schwer lesbar", 5 „Schwer lesbar". Werte außerhalb 1–5 fallen defensiv auf Stufe 5
(rot) — das Backend liefert nur 1–5.

## Verworfene Alternativen

- **Gelb für Stufe 3** (Ampel grün/gelb/rot wörtlich): schwächerer Kontrast auf Weiß, und
  der Gauge/Label-Mismatch bliebe bestehen.
- **Eigene Farbe je Stufe** (fünf Farben): überladen; die Drei-Farben-Ampel ist die
  etablierte Lese-Heuristik und farbenblind-sicher gruppierbar.
- **Severity im Backend / api-client ablegen**: `success/warn/error` ist PrimeVue-Vokabular,
  die Bezeichnungen sind deutsche UI-Texte — beides gehört in die Oberfläche, nicht in den
  Datenvertrag. Das Backend vergibt nur die Zahl.

## Konsequenzen

- Die Gruppierung ist eine fachliche Entscheidung; bei Bedarf mit der fachlichen Leitung (BL)
  nachjustierbar — dann ändert sich nur die Tabelle in `utils/niveaustufe.ts`.
- Die Gauge-Farbe für Stufe 3 wechselt sichtbar von Gelb zu Amber.
- WCAG AA: Amber und Rot müssen auf weißem Grund den Kontrast erfüllen.
