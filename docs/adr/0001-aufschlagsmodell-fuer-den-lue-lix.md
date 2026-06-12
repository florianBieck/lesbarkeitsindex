# Aufschlagsmodell für den LÜ-LIX statt gewichteter Mischformel

Die bisherige Mischformel (`0,6·LIX + gewichtete Anteile`) war skalen-inkompatibel: Der LIX
liegt bei 20–70, die Wortkomplexitäts-Anteile bei 0–1. Die Wortkomplexität hatte nominell
40 % Gewicht, faktisch ~1 % Einfluss; der LÜ-LIX lag dadurch immer bei ≈ 60 % des LIX und
stufte Texte systematisch zu leicht ein (Marie-Curie-Befund der fachlichen Leitung, BL).

Entscheidung (2026-06-11, mit BLs Konzeptpapier): Zwei getrennte Werte plus Aufschlag.

1. **LIX klassisch nach Bamberger**, unverändert (Langwortgrenze bleibt > 6 Buchstaben),
   damit Werte mit RATTE/Psychometrica und den Literatur-Bändern vergleichbar bleiben.
2. **Wortkomplexität (WK)** als eigenständiger Wert 0–100: gewichteter Mittelwert von
   Coverage-Komponenten (Anteil der Wörter mit Merkmal, je Wort max. einmal gezählt).
   Startgewichte im BL-Verhältnis: Drei-/Mehrsilber 50, mehrgliedrige Grapheme 25,
   seltene Grapheme 12,5, Konsonantenlauthäufung 12,5. WK bleibt roh (keine Streckung
   auf Ankertexte) — Vergleichbarkeit entsteht über empirische Interpretationsbänder.
3. **LÜ-LIX = LIX + α·WK** mit konfigurierbarem α (Start 0,3). Wortkomplexität kann einen
   Text nur schwerer machen, nie leichter — der LÜ-LIX liegt nie unter dem LIX.
4. **Niveaustufen** an den LIX-Literatur-Bändern verankert (30/40/50/60 für Stufen 1–5).
5. **Textlänge fließt bewusst nicht ein** — Umfang ist eine eigene Dimension neben der
   Schwierigkeit. Ein Maß, das Länge und Schwierigkeit mischt, kann beides nicht aussagen.

## Verworfene Alternativen

- **Mischformel mit reparierten Skalen** (Anteile ×100): bleibt ein Durchschnitt — der
  LÜ-LIX könnte unter den LIX fallen, was BLs fachlicher Randbedingung widerspricht.
- **ChatGPT-Rekalibrierung** (Langwörter > 5 Buchstaben, Basis-Offset): kompensierte nur
  den Skalenfehler und hätte die Bamberger-Vergleichbarkeit des LIX zerstört. Diese
  „Anpassungen" existierten ohnehin nur im Chatverlauf, nie im Code.
- **WK auf Ankertexte strecken / Perzentil-Normierung**: Zahl verliert ihre direkte
  Erklärbarkeit aus dem Text und hinge am Referenzkorpus.

## Konsequenzen

- Alte gespeicherte Results werden beim Umbau gelöscht (Erprobungsphase, Werte nach
  alter Formel sind nicht vergleichbar).
- α und die WK-Bänder werden nach dem Silbenzählungs-Fix mit BLs Erprobungstexten
  kalibriert (Zielprobe: Marie-Curie-Text → Stufe 3–4, Kinderkurztexte bleiben unten).
- Weitere WK-Komponenten (Abkürzungen, Zahlen) kommen erst dazu, wenn BL deren
  Gewichte fachlich gesetzt hat.
