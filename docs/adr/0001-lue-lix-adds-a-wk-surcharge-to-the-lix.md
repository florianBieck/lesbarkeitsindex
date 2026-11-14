# LÜ-LIX adds a WK surcharge to the LIX instead of a weighted blend

The previous blend formula (`0.6·LIX + weighted proportions`) mixed incompatible scales: the LIX
lies between 20 and 70, the Wortkomplexität proportions between 0 and 1. Wortkomplexität had a
nominal weight of 40 % but in practice ~1 % influence, so the LÜ-LIX always came out at ≈ 60 % of
the LIX and rated texts systematically too easy (the Marie Curie finding of BL, the project's
subject-matter lead).

Decision (2026-06-11, with BL's concept paper): two separate values plus a surcharge.

1. **The classic LIX after Bamberger**, unchanged (the long-word threshold stays at > 6 letters),
   so its values stay comparable with RATTE/Psychometrica and the bands in the literature.
2. **Wortkomplexität (WK)** as a value of its own, 0–100: the weighted mean of coverage
   components (the share of words that have a feature, each word counted at most once).
   Starting weights in BL's ratio: Drei-/Mehrsilber 50, Mehrgliedrige Grapheme 25, Seltene
   Grapheme 12.5, Konsonantenlauthäufung 12.5. WK stays raw (no stretching onto anchor texts):
   comparability comes from empirical interpretation bands.
3. **LÜ-LIX = LIX + α·WK** with a configurable α (starting at 0.3). Wortkomplexität can only
   make a text harder, never easier: the LÜ-LIX is never below the LIX.
4. **Niveaustufen** are anchored to the LIX bands in the literature (30/40/50/60 for levels 1–5).
5. **Text length deliberately plays no part**: Umfang is a dimension of its own, next to
   difficulty. A measure that mixes length and difficulty can say nothing about either.

## Considered options

- **The blend formula with repaired scales** (proportions ×100): it stays an average, so the
  LÜ-LIX could fall below the LIX, which contradicts BL's subject-matter constraint.
- **ChatGPT's recalibration** (long words > 5 letters, a base offset): it only compensated for
  the scale error and would have destroyed the LIX's comparability with Bamberger. These
  "adjustments" only ever existed in the chat history, never in the code.
- **Stretching WK onto anchor texts / percentile normalisation**: the number loses its direct
  explanation from the text and would depend on the reference corpus.

## Consequences

- Old stored results are deleted during the rework (this is the trial phase, and values from
  the old formula aren't comparable).
- α and the WK bands are calibrated with BL's trial texts after the syllable-counting fix
  (target sample: the Marie Curie text → level 3–4, short children's texts stay at the bottom).
- Further WK-Komponenten (abbreviations, numbers) are only added once BL has set their weights
  on subject-matter grounds.
