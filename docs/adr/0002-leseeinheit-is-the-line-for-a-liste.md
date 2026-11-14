# Leseeinheit Zeile für Listen

Der LIX braucht den Satz als Bezugsgröße — Leselisten (Wörter, Formulierungen, teils ganze
Sätze gemischt) haben aber keine durchgängige Satzstruktur. Ohne Sonderbehandlung liefern
alle Werkzeuge Absurdes: Unsere Satzerkennung sieht eine ganze Liste als einen einzigen
Riesensatz (LIX explodiert), RATTE zählt jedes Wort als Satz (LIX kollabiert).

Entscheidung (2026-06-11, nach BLs Vorschlag): Texte haben einen **Texttyp** (Fließtext
oder Liste) mit zugehöriger **Leseeinheit** — Satz bei Fließtext, Zeile bei Listen, denn in
einer Liste liest das Kind Zeile für Zeile. Der Texttyp wird heuristisch erkannt (viele
Zeilen ohne Satzendzeichen → Liste), ist aber als sichtbarer Schalter vom Nutzer
übersteuerbar. Bei Leseeinheit Zeile werden alle satzbezogenen Werte entsprechend
gekennzeichnet; nur mit Leseeinheit Satz berechnete Werte heißen „LIX nach Bamberger".

## Verworfene Alternativen

- **Kein LIX für Listen** (nur Einzelfaktoren anzeigen): ehrlich, aber Lehrkräfte verlieren
  jede Gesamteinordnung, und Mischformen wie die Liste „Sommer" fallen ganz durchs Raster.
- **Nur manueller Schalter ohne Erkennung**: wer ihn übersieht, bekommt weiter absurde
  Werte — zu unverzeihend für die Zielgruppe.
