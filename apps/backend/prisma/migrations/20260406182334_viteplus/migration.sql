-- AlterTable
ALTER TABLE "Result" ALTER COLUMN "averageCharsPerSyllable" DROP DEFAULT,
ALTER COLUMN "ttr" DROP DEFAULT,
ALTER COLUMN "countAbbreviations" DROP DEFAULT,
ALTER COLUMN "countNumbers" DROP DEFAULT,
ALTER COLUMN "countNumbersTwoDigit" DROP DEFAULT,
ALTER COLUMN "countNumbersThreeDigit" DROP DEFAULT,
ALTER COLUMN "countNumbersFourDigit" DROP DEFAULT,
ALTER COLUMN "countNumbersFivePlusDigit" DROP DEFAULT,
ALTER COLUMN "countSpecialCharacters" DROP DEFAULT,
ALTER COLUMN "proNIndex" DROP DEFAULT,
ALTER COLUMN "subordinateClauseRatio" DROP DEFAULT,
ALTER COLUMN "passiveCount" DROP DEFAULT,
ALTER COLUMN "nominalizationCount" DROP DEFAULT;
