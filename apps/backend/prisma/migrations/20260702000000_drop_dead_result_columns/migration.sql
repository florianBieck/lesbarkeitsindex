-- Drop dead Result columns (ponytail audit F7/F22/F34):
--   countPhrases:              written, never read (countReadingUnits is the used denominator)
--   countNumbersTwoDigit ..
--   countNumbersFivePlusDigit: digit-bucket breakdown, written, never read
--   hashText:                  sha256 of the input text, written, never read
-- DropColumn
ALTER TABLE "Result" DROP COLUMN "countPhrases",
DROP COLUMN "countNumbersTwoDigit",
DROP COLUMN "countNumbersThreeDigit",
DROP COLUMN "countNumbersFourDigit",
DROP COLUMN "countNumbersFivePlusDigit",
DROP COLUMN "hashText";
