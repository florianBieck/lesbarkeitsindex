-- Aufschlagsmodell (ADR 0001): Umstellung auf den Zwei-Werte-Score.
-- Erprobungsphase, bewusste Entscheidung: Alt-Ergebnisse nach der alten
-- Mischformel sind nicht vergleichbar und werden gelöscht. Die Konfiguration
-- wird auf α + vier WK-Gewichte umgestellt und beim nächsten Start neu geseedet.
DELETE FROM "Result";
DELETE FROM "Config";

-- AlterTable: Config — die zwölf ungenutzten Gewichtsspalten sowie die alte
-- LIX-/Anteils-Gewichtung entfallen ersatzlos; α plus vier WK-Gewichte kommen hinzu.
ALTER TABLE "Config"
  DROP COLUMN "parameterCountWords",
  DROP COLUMN "parameterCountPhrases",
  DROP COLUMN "parameterCountMultipleWords",
  DROP COLUMN "parameterCountWordsWithComplexSyllables",
  DROP COLUMN "parameterCountWordsWithConsonantClusters",
  DROP COLUMN "parameterCountWordsWithMultiMemberedGraphemes",
  DROP COLUMN "parameterCountWordsWithRareGraphemes",
  DROP COLUMN "parameterAverageWordLength",
  DROP COLUMN "parameterAveragePhraseLength",
  DROP COLUMN "parameterAverageSyllablesPerWord",
  DROP COLUMN "parameterAverageSyllablesPerPhrase",
  DROP COLUMN "parameterProportionOfLongWords",
  DROP COLUMN "parameterLix",
  DROP COLUMN "parameterProportionOfWordsWithComplexSyllables",
  DROP COLUMN "parameterProportionOfWordsWithConsonantClusters",
  DROP COLUMN "parameterProportionOfWordsWithMultiMemberedGraphemes",
  DROP COLUMN "parameterProportionOfWordsWithRareGraphemes",
  ADD COLUMN "alpha" DECIMAL(65,30) NOT NULL,
  ADD COLUMN "weightComplexSyllables" DECIMAL(65,30) NOT NULL,
  ADD COLUMN "weightMultiMemberedGraphemes" DECIMAL(65,30) NOT NULL,
  ADD COLUMN "weightRareGraphemes" DECIMAL(65,30) NOT NULL,
  ADD COLUMN "weightConsonantClusters" DECIMAL(65,30) NOT NULL;

-- AlterTable: Result — score/scoreLevel entfallen; Wortkomplexität, LÜ-LIX und
-- Niveaustufe (im Backend bestimmt) kommen hinzu.
ALTER TABLE "Result"
  DROP COLUMN "score",
  DROP COLUMN "scoreLevel",
  ADD COLUMN "wordComplexity" DECIMAL(65,30) NOT NULL,
  ADD COLUMN "lueLix" DECIMAL(65,30) NOT NULL,
  ADD COLUMN "level" DECIMAL(65,30) NOT NULL;
