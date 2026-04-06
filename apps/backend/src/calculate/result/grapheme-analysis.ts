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
const graphemeRegex = /(sch|ch|ck|ng|äu|au|eu|ei|ie)/gi;

// sp/st only at word beginning (syllable-onset grapheme per Br 10)
const onsetGraphemeRegex = /\b(sp|st)/gi;

export function calculateMultiMemberedGraphemes(words: readonly string[]): number {
  let totalCount = 0;
  for (const rawWord of words) {
    const word = rawWord.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
    if (!word) continue;
    const graphemeMatches = word.match(graphemeRegex);
    if (graphemeMatches) {
      totalCount += graphemeMatches.length;
    }
    const onsetMatches = word.match(onsetGraphemeRegex);
    if (onsetMatches) {
      totalCount += onsetMatches.length;
    }
  }
  return totalCount;
}

/*
    seltene Grapheme (ä, ö, ü, ß, c, q, x, y)
 */
export function calculateRareGraphemes(words: readonly string[]): number {
  const rareGraphemeRegex = /[äöüÄÖÜßcqxyCQXY]/g;
  let totalCount = 0;
  for (const rawWord of words) {
    const word = rawWord.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
    if (!word) continue;
    const matches = word.match(rareGraphemeRegex);
    if (matches) {
      totalCount += matches.length;
    }
  }
  return totalCount;
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
  /\b(schl|schm|schn|schr|str|spr|bl|br|cl|cr|dr|fl|fr|gl|gn|gr|kl|kn|kr|pf|pl|pr|tr)/gi;

// Coda: at word boundary — 3+ consonant sounds at word/syllable end
// Ordered longest-first to avoid partial matches
const codaClusterRegex =
  /(rchst|mpfst|rbst|chst|chts|rcht|ckst|lfst|rfst|mpft|mpst|ngst|nkst|rnst|rbt|bst|ckt|dst|fst|rft|gst|lfs|mpf|mpt|nft|nkt|nst|nzt|rnt|rkt|rzt|rts|tzt)\b/gi;

export function calculateConsonantClusters(words: readonly string[]): number {
  let totalCount = 0;
  for (const rawWord of words) {
    const word = rawWord.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
    if (!word) continue;
    const onsetMatches = word.match(onsetClusterRegex);
    if (onsetMatches) {
      totalCount += onsetMatches.length;
    }
    const codaMatches = word.match(codaClusterRegex);
    if (codaMatches) {
      totalCount += codaMatches.length;
    }
  }
  return totalCount;
}
