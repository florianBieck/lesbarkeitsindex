/*
    Pronominalisierungsindex (ProNIndex) — R 5
    Formula: Number of pronouns / Number of nouns
    Uses STTS tagset from OpenNLP German POS tagger.
 */
const PRONOUN_TAGS = /^(PPER|PPOSAT|PPOSS|PRELS|PRELAT|PRF|PDS|PDAT|PIS|PIAT|PWS|PWAT|PWAV)$/;
const NOUN_TAGS = /^(NN|NE)$/;

export function calculateProNIndex(posTags: readonly string[]): number {
    if (posTags.length === 0) return 0;
    let pronouns = 0;
    let nouns = 0;
    for (const tag of posTags) {
        if (PRONOUN_TAGS.test(tag)) pronouns++;
        if (NOUN_TAGS.test(tag)) nouns++;
    }
    if (nouns === 0) return 0;
    return Math.round((pronouns / nouns) * 100) / 100;
}

/*
    Anteil Nebensätze — R 5
    Counts subordinating conjunctions (KOUS, KOUI) as proxy for subordinate clauses.
    Returns ratio of subordinate clauses per sentence.
 */
export function calculateSubordinateClauseRatio(
    posTags: readonly string[],
    sentences: readonly string[]
): number {
    if (sentences.length === 0) return 0;
    let subordinateClauses = 0;
    for (const tag of posTags) {
        if (tag === "KOUS" || tag === "KOUI") subordinateClauses++;
    }
    return Math.round((subordinateClauses / sentences.length) * 100) / 100;
}

/*
    Passivkonstruktionen — R (RATTE)
    German passive: conjugated form of "werden" + past participle (VVPP).
    Looks back up to 10 tokens from each VVPP for a "werden" form.
 */
const WERDEN_FORMS = new Set([
    "wird", "werde", "werden", "werdet", "wirst",
    "wurde", "wurden", "wurdest", "wurdet",
    "würde", "würden", "würdest", "würdet",
]);

export function calculatePassiveCount(
    words: readonly string[],
    posTags: readonly string[]
): number {
    let passiveCount = 0;
    for (let i = 0; i < posTags.length; i++) {
        if (posTags[i] === "VVPP") {
            for (let j = Math.max(0, i - 10); j < i; j++) {
                if (WERDEN_FORMS.has(words[j].toLowerCase())) {
                    passiveCount++;
                    break;
                }
            }
        }
    }
    return passiveCount;
}

/*
    Substantivierungen — R (RATTE)
    Detects nominalized adjectives: article + adjective with no following noun.
    E.g., "das Leichte", "der Alte", "die Kranken".
 */
export function calculateNominalizations(
    words: readonly string[],
    posTags: readonly string[]
): number {
    let count = 0;
    for (let i = 0; i < posTags.length - 1; i++) {
        if (posTags[i] === "ART") {
            if (posTags[i + 1] === "ADJA" || posTags[i + 1] === "ADJD") {
                const hasNounAfter =
                    (i + 2 < posTags.length && posTags[i + 2] === "NN") ||
                    (i + 3 < posTags.length && posTags[i + 3] === "NN");
                if (!hasNounAfter) count++;
            }
        }
    }
    return count;
}
