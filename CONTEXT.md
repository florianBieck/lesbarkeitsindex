# Lesbarkeitsindex (LÜ-LIX)

Werkzeug zur Lesbarkeitsanalyse deutscher Texte für Lehrkräfte. Dieses Glossar hält die
verbindliche Domänensprache fest, abgestimmt mit der fachlichen Leitung (BL).

## Language

**LIX**:
Klassischer Lesbarkeitsindex nach Björnsson/Bamberger: durchschnittliche Satzlänge plus
Prozentanteil langer Wörter. Wird bewusst unverändert nach Literatur berechnet, um mit
Referenzwerkzeugen (RATTE, Psychometrica) vergleichbar zu bleiben.

**Wortkomplexität (WK)**:
Eigenständiger Wert auf einer Skala von 0–100, der ausdrückt, wie schwer die Wörter eines
Textes zu erlesen sind — unabhängig von der Satzlänge.
_Avoid_: Wortschwierigkeit

**LÜ-LIX**:
Der Gesamtwert der App: klassischer LIX plus ein Aufschlag aus der Wortkomplexität. Liegt
nie unter dem LIX — Wortkomplexität kann einen Text nur schwerer machen, nie leichter.
_Avoid_: Score, Gesamt-LIX

**WK-Komponente**:
Ein Einzelmerkmal der [[Wortkomplexität]], gemessen als Anteil der Wörter, die das Merkmal
mindestens einmal enthalten (0–100 %). Ein Wort zählt pro Komponente höchstens einmal.
_Avoid_: Vorkommenszählung (Vorkommen pro Wort)

**Niveaustufe**:
Fünfstufige Einordnung der Textschwierigkeit (1 = sehr leicht lesbar … 5 = schwer lesbar),
abgeleitet aus dem [[LÜ-LIX]] entlang der LIX-Bänder aus der Literatur.

**Umfang**:
Die Lesemenge eines Textes (Wortzahl), als eigene Dimension neben der Schwierigkeit.
Fließt bewusst nicht in den [[LÜ-LIX]] ein: Schwierigkeit sagt „wie schwer",
Umfang sagt „wie viel".
_Avoid_: Textlänge (als Score-Bestandteil)

**Leseeinheit**:
Die Einheit, in der ein Text gelesen wird und auf die sich satzbezogene Maße beziehen:
der Satz bei [[Fließtext]], die Zeile bei [[Liste]]n. Nur mit Leseeinheit Satz ist ein
[[LIX]] nach Bamberger vergleichbar.

**Fließtext**:
Texttyp, dessen Leseeinheit der Satz ist. Standardannahme für eingegebene Texte.

**Liste**:
Texttyp, dessen Leseeinheit die Zeile ist — etwa Leselisten mit Wörtern, Formulierungen
und ganzen Sätzen gemischt. Wird automatisch erkannt, bleibt aber vom Nutzer umschaltbar.
_Avoid_: Wörterliste (zu eng — Listen dürfen Sätze enthalten)

**Titel**:
Die erste Zeile eines Textes, wenn sie kurz ist (≤ 50 Zeichen), nicht mit Satzzeichen
endet und weiterer Text folgt. Wird im Ergebnis ausgewiesen, fließt aber in keine
Kennzahl ein.
_Avoid_: Überschrift, Titelzeile

## WK-Komponenten

**Drei- und Mehrsilber**:
Wörter mit drei oder mehr Silben. Die Häufung von Silben macht das Wort schwer —
nicht die einzelne Silbe (deren Schwierigkeit bilden Grapheme und Lauthäufungen ab).
_Avoid_: Komplexe Silben, Silbenkomplexität

**Konsonantenlauthäufung**:
Aufeinandertreffen mehrerer Konsonanten-Laute am Silbenanfang oder -ende. Lautbasiert,
nicht buchstabenbasiert: „schl" sind zwei Laute, „ng" ist einer.
_Avoid_: Schwierige Buchstabenfolgen, Konsonantenhäufung, Konsonantencluster
(buchstabenbasiert missverständlich); zulässiges Synonym: Konsonantenlautcluster

**Mehrgliedrige Grapheme**:
Grapheme aus mehreren Buchstaben: sch, ch, ck, ng, Diphthonge (ei, ie, eu, äu, au)
sowie sp/st am Wortanfang.
_Avoid_: Mehrteilige Buchstabengruppen

**Seltene Grapheme**:
Im Deutschen selten vorkommende Schriftzeichen: ä, ö, ü, ß, c, q, x, y.
_Avoid_: Seltene Buchstaben
