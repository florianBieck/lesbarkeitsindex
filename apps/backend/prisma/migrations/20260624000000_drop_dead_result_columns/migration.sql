-- Drop dead result columns (architecture review, candidate D):
--   countMultipleWords: duplicate of countPhrases, never read
--   ratteLevel:         hardcoded 0, never read
--   syllables:          repeated whole words mislabelled as syllables; countSyllables suffices
-- DropColumn
ALTER TABLE "Result" DROP COLUMN "countMultipleWords",
DROP COLUMN "ratteLevel",
DROP COLUMN "syllables";
