import { stripNonLetters } from './basic-metrics.js';

/*
    Mehrgliedrige Grapheme — following Brügelmann (Br 10).

    Categories:
    1. Digraphs/trigraphs: sch, ch, ck, ng
    2. Diphthongs: ie, ei, eu, äu, au (au included per BL, contrary to Br who excludes it)
    3. sp/st at word beginning (treated as graphemes per Br 10, not consonant clusters)

    Order matters: longer patterns first to prevent partial matches
    (e.g., "sch" before "ch", "äu" before "au").
 */

// Digraphs/trigraphs + diphthongs — matched anywhere in the word
const graphemeRegex = /(sch|ch|ck|ng|äu|au|eu|ei|ie)/i;

// sp/st only at word beginning (syllable-onset grapheme per Br 10)
const onsetGraphemeRegex = /\b(sp|st)/i;

export function countWordsWithMultiMemberedGraphemes(words: readonly string[]): number {
  // Coverage: Anzahl der Wörter mit mindestens einem Vorkommen (je Wort max. einmal).
  return words.filter((rawWord) => {
    const word = stripNonLetters(rawWord);
    return graphemeRegex.test(word) || onsetGraphemeRegex.test(word);
  }).length;
}

/*
    seltene Grapheme (ä, ö, ü, ß, c, q, x, y)
 */
const rareGraphemeRegex = /[äöüÄÖÜßcqxyCQXY]/;

export function countWordsWithRareGraphemes(words: readonly string[]): number {
  // Coverage: Anzahl der Wörter mit mindestens einem seltenen Graphem (je Wort max. einmal).
  return words.filter((rawWord) => rareGraphemeRegex.test(stripNonLetters(rawWord))).length;
}

/*
    Konsonantencluster — following Brügelmann/BRELIX PDF parameter list.

    Two categories:
    1. Onset clusters (2+ consonant sounds at syllable/word beginning)
       - Excludes st/sp at onset (counted as multi-membered graphemes per Br 10)
    2. Coda clusters (3+ consonant sounds at syllable/word end)
       - Excludes patterns with only 2 sounds (tz, rk, rt, rch) and
         double consonants (only 1 sound)
       - ng counts as 1 sound, so "ngt" = 2 sounds (not a cluster)

    Longer patterns are listed first to prevent partial matches.
 */

// Onset: at word boundary — 2+ consonant sounds at syllable start
const onsetClusterRegex =
  /\b(schl|schm|schn|schr|str|spr|bl|br|cl|cr|dr|fl|fr|gl|gn|gr|kl|kn|kr|pf|pl|pr|tr)/i;

// Coda: at word boundary — 3+ consonant sounds at word/syllable end
// Ordered longest-first to avoid partial matches
const codaClusterRegex =
  /(rchst|mpfst|rbst|chst|chts|rcht|ckst|lfst|rfst|mpft|mpst|ngst|nkst|rnst|rbt|bst|ckt|dst|fst|rft|gst|lfs|mpf|mpt|nft|nkt|nst|nzt|rnt|rkt|rzt|rts|tzt)\b/i;

export function countWordsWithConsonantClusters(words: readonly string[]): number {
  // Coverage: Anzahl der Wörter mit mindestens einem Cluster (je Wort max. einmal).
  return words.filter((rawWord) => {
    const word = stripNonLetters(rawWord);
    return onsetClusterRegex.test(word) || codaClusterRegex.test(word);
  }).length;
}
