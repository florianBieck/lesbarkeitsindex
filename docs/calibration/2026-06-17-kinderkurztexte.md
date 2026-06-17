# Kalibrierungsprotokoll — Kinderkurztexte

**Datum:** 2026-06-17
**Issue:** [#31](https://github.com/florianBieck/lesbarkeitsindex/issues/31) (Kalibrierungsrunde
mit BL — α, Niveaustufen, WK-Interpretationsbänder, HITL)
**Zweck:** Erstabnahme der Pipeline am leichten Ende. Solange BL die offiziellen
Erprobungstexte (Marie-Curie, „Sommer", Original-Kinderkurztexte) nicht geliefert hat,
prüfen synthetische Kurztexte für Klasse 1–3, ob die Zielprobe „Kinderkurztexte bleiben
unten" mit den Startparametern überhaupt erreichbar ist.

> **HITL-Hinweis:** Die endgültige Kalibrierung erfordert BLs Originaltexte und ihre
> Einschätzung. Dieses Protokoll ersetzt keine Abstimmung mit BL — es schafft eine
> Vorab-Evidenz, dass die aktuelle Konfiguration für leichte Texte plausibel ist.

## Konfiguration

| Parameter | Wert | Quelle |
|---|---|---|
| α (Aufschlagskoeffizient) | 0,3 | Standardkonfiguration aus #28 |
| Gewicht Drei- und Mehrsilber | 50 | Standardkonfiguration |
| Gewicht Mehrgliedrige Grapheme | 25 | Standardkonfiguration |
| Gewicht Seltene Grapheme | 12,5 | Standardkonfiguration |
| Gewicht Konsonantenlauthäufung | 12,5 | Standardkonfiguration |
| Niveaustufen-Bänder (LÜ-LIX) | <30 = 1, <40 = 2, <50 = 3, <60 = 4, ≥60 = 5 | #28 |

## Erprobungstexte (synthetisch, Klasse 1–3)

### kt-01 — „Mein Hund" (Klasse 1)

```
Mein Hund

Ich habe einen Hund. Er heißt Bello. Bello ist braun. Wir spielen jeden Tag im Garten.
Er fängt den Ball. Ich werfe weit. Bello rennt schnell. Er ist mein bester Freund.
```

### kt-02 — „Im Herbst" (Klasse 1–2)

```
Im Herbst

Es ist Herbst. Die Blätter werden bunt. Manche sind rot. Manche sind gelb. Der Wind
weht. Die Blätter fallen vom Baum. Ich sammle sie auf. Mama bastelt daraus ein Bild.
```

### kt-03 — „Der Apfel" (Klasse 2)

```
Der Apfel

Auf dem Tisch liegt ein Apfel. Er ist rot und rund. Der Apfel schmeckt süß. Ich beiße
hinein. Es knackt. Der Saft läuft mir übers Kinn. Mama lacht und gibt mir ein Tuch.
```

### kt-04 — „Ein schöner Schultag" (Klasse 2–3, Präteritum)

```
Ein schöner Schultag

Heute war ein schöner Tag in der Schule. Wir haben gerechnet und gelesen. In der Pause
spielten wir Fangen. Anna fiel hin, aber sie weinte nicht. Am Ende sangen wir ein Lied.
Dann ging ich nach Hause.
```

### kt-05 — „Wörterliste: Tiere" (Liste)

```
Hund
Katze
Maus
Pferd
Kuh
Hase
Vogel
Fisch
Schaf
Ziege
```

## Ergebnisse

Lauf gegen den lokalen Stack (`docker compose up -d` + Backend auf :3000), via
`node docs/calibration/run-calibration.mjs`.

| ID | Titel | Niveaustufe | LÜ-LIX | LIX | WK | Wörter | Texttyp | Leseeinheit |
|---|---|---|---|---|---|---|---|---|
| kt-01 | Mein Hund | **1** | 14,0 | 10,3 | 12,1 | 31 | prose | sentence |
| kt-02 | Im Herbst | **1** | 17,3 | 13,8 | 11,7 | 30 | prose | sentence |
| kt-03 | Der Apfel | **1** | 12,1 | 7,7 | 14,4 | 33 | prose | sentence |
| kt-04 | Ein schöner Schultag | **1** | 22,3 | 17,0 | 17,6 | 37 | prose | sentence |
| kt-05 | Wörterliste: Tiere | **1** | 5,1 | 1,0 | 13,8 | 10 | list | line |

### WK-Komponenten (Coverage in %)

| ID | Drei- und Mehrsilber | Mehrgliedrige Grapheme | Seltene Grapheme | Konsonantenlauthäufung |
|---|---|---|---|---|
| kt-01 | 0,0 | 35,5 | 16,1 | 9,7 |
| kt-02 | 0,0 | 33,3 | 16,7 | 10,0 |
| kt-03 | 0,0 | 39,4 | 30,3 | 6,1 |
| kt-04 | 5,4 | 51,4 | 16,2 | 0,0 |
| kt-05 | 0,0 | 40,0 | 20,0 | 10,0 |

## Beobachtungen

1. **Zielprobe „bleiben unten" wird mit den Startparametern erfüllt.** Alle fünf Texte
   landen auf Niveaustufe 1 (LÜ-LIX < 30). Selbst der schwerste der fünf
   („Ein schöner Schultag", Präteritum, längere Satz-Konstruktionen) liegt mit 22,3
   deutlich unter der Grenze zu Stufe 2 (30).

2. **Texttyp-Heuristik aus #30 funktioniert in beide Richtungen.** Die Wörterliste
   (kt-05) wird als `list` erkannt, Leseeinheit ist `line`. Die vier Fließtexte werden
   als `prose` erkannt. `detectedTextType` stimmt überall mit `textType` überein — kein
   Override nötig.

3. **WK-Aufschlag ist gutmütig.** Α·WK liegt zwischen 3,5 (kt-02) und 5,3 (kt-04). Der
   Aufschlag verschiebt keinen Text über eine Stufengrenze. Das ist im leichten Bereich
   gewollt: Stufe-Sprung durch Wortkomplexität soll erst bei mittlerem LIX greifen.

4. **Mehrgliedrige Grapheme dominieren die WK-Komponenten bei einfacher Sprache.**
   33–51 % Coverage ist normal für deutsche Kindersätze (sch, ch, ck, ei, au …).
   Mit Startgewicht 25 % trägt diese Komponente 8–13 Punkte zur WK bei — plausibel.

5. **Liste hat LIX = 1,0 (kt-05).** Bei Leseeinheit Zeile wird der LIX nicht mehr als
   „LIX nach Bamberger" bezeichnet (#30); die Anzeige muss das kennzeichnen. Hier nur
   als Erinnerung — UI ist nicht Gegenstand dieses Protokolls.

## Offen — auf BL wartend

- **Marie-Curie-Text** für die obere Probe (Stufe 3–4 angestrebt). Erst damit lässt sich
  feststellen, ob α = 0,3 die richtige Steigung hat oder ob die WK-Komponenten
  umgewichtet werden müssen.
- **Originale Kinderkurztexte von BL** zum Abgleich gegen diese synthetischen Proben.
- **Liste „Sommer"** als Misch-Stress-Test (Wörter, Formulierungen, Sätze).
- **Parameter-Dokument** für Abkürzungen/Zahlen — Entscheidung vertagt, bis Marie-Curie
  und „Sommer" durchgerechnet sind.
- **WK-Interpretationsbänder** (leicht / mittel / schwer) sind ohne den oberen
  Erprobungspunkt nicht ableitbar.

## Wiederholung des Laufs

```sh
# Stack hochfahren (falls nicht schon)
docker compose up -d
vp exec --filter backend nest start --watch  # Hintergrund

# Kalibrierung wiederholen
node docs/calibration/run-calibration.mjs
```

Die Texte stehen im Skript `docs/calibration/run-calibration.mjs`; Erweiterungen
(Marie-Curie, „Sommer") dort als zusätzlichen `TEXTS`-Eintrag ergänzen.
