-- Texttyp & Leseeinheit (ADR 0002, Issue #30): Bei Listen ersetzt die
-- Zeilenzahl die Satzzahl als Nenner aller satzbezogenen Maße. Texttyp und
-- Leseeinheit werden je Ergebnis gespeichert, damit die Oberfläche „LIX nach
-- Bamberger" nur bei Leseeinheit Satz ausweist und Mischformen konsistent
-- behandelt werden. Bestehende Ergebnisse erhalten den Default Fließtext/Satz.
ALTER TABLE "Result"
  ADD COLUMN "textType" TEXT NOT NULL DEFAULT 'prose',
  ADD COLUMN "readingUnit" TEXT NOT NULL DEFAULT 'sentence',
  ADD COLUMN "detectedTextType" TEXT NOT NULL DEFAULT 'prose',
  ADD COLUMN "countReadingUnits" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- Backfill: für Altdaten entspricht countReadingUnits der bisher gespeicherten
-- Satzzahl, weil bisher ausschließlich Fließtext gerechnet wurde.
UPDATE "Result" SET "countReadingUnits" = "countPhrases" WHERE "countReadingUnits" = 0;
