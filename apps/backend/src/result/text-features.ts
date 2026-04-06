/*
    Type-Token-Relation (TTR)
    Formula: (Types / Tokens) * 100
    Types = unique words (case-insensitive), Tokens = total word count.
    Measures vocabulary diversity — higher TTR means more varied vocabulary.
 */
export function calculateTTR(words: readonly string[]): number {
    if (words.length === 0) return 0;
    const types = new Set(words.map(w => w.toLowerCase()));
    return Math.round((types.size / words.length) * 10000) / 100;
}

/*
    Abkürzungen erkennen — three categories per PDF parameter list:
    1. Unit abbreviations (km, kg, cm, etc.)
    2. Common abbreviations with dots (z.B., d.h., etc.)
    3. Acronyms (EU, USA, ADAC, etc.)
 */

const UNIT_ABBREVIATIONS = new Set([
    'km', 'm', 'cm', 'mm', 'g', 'kg', 'l', 'ml',
    'h', 'min', 'sec', 's',
    '€', 'km/h',
]);

const DOTTED_ABBREVIATIONS = new Set([
    'z.b.', 'd.h.', 'u.a.', 'bzw.', 'etc.', 'usw.', 'ca.', 'evtl.',
    'nr.', 'str.', 'i.d.r.', 'v.a.', 'dr.', 'prof.', 'mind.', 'max.',
    'std.', 'min.', 'sek.', 'ct.', 'tsd.', 'mio.', 'mrd.',
    'm²', 'km²', '°c',
]);

const ACRONYMS = new Set([
    'UNO', 'UNICEF', 'UNESCO', 'EU', 'USA', 'ADAC', 'NASA',
    'DRK', 'DB', 'IC', 'ICE', 'WWF', 'ARD', 'ZDF', 'TV',
    'EM', 'WM', 'FIFA', 'DFB', 'LKW', 'PKW',
    'G7', 'G20', 'OECD', 'GPS', 'AI', 'KI',
    'NABU', 'BUND',
]);

export function calculateAbbreviations(words: readonly string[]): { count: number; matches: string[] } {
    if (words.length === 0) return { count: 0, matches: [] };
    const matches: string[] = [];
    for (const word of words) {
        const lower = word.toLowerCase().replace(/[,;:!?]$/, '');
        if (UNIT_ABBREVIATIONS.has(lower)) {
            matches.push(word);
        } else if (DOTTED_ABBREVIATIONS.has(lower)) {
            matches.push(word);
        } else if (ACRONYMS.has(word.replace(/[,;:!?]$/, ''))) {
            matches.push(word);
        }
    }
    return { count: matches.length, matches };
}

/*
    Sonderzeichen erkennen — per PDF (section b, Zeichen):
    ?, !, quotation marks (various styles), parentheses,
    %, &, §, #, @, em-dash (–), slash (/)
    Excludes standard punctuation (. , : ;) which is expected in text.
    Operates on raw text since tokenization strips many of these.
 */
const SPECIAL_CHAR_REGEX = /[?!""„"»«'‚'()%&§#@–—\/]/g;

export function calculateSpecialCharacters(text: string): { count: number; matches: string[] } {
    if (!text) return { count: 0, matches: [] };
    const found = text.match(SPECIAL_CHAR_REGEX);
    if (!found) return { count: 0, matches: [] };
    return { count: found.length, matches: found };
}

/*
    Zahlen erkennen — categorized by digit count per PDF:
    - 2-digit: difficult for beginning readers
    - 3-digit: somewhat difficult
    - 4-digit: more difficult
    - 5+ digit: very difficult
    Numbers with dot separators (e.g. 5.289) are treated as one number,
    digits only counted (dots stripped).
    Single-digit numbers are ignored (not difficult).
 */
export type NumberResult = {
    count: number;
    twoDigit: number;
    threeDigit: number;
    fourDigit: number;
    fivePlusDigit: number;
};

export function calculateNumbers(words: readonly string[]): NumberResult {
    const result: NumberResult = { count: 0, twoDigit: 0, threeDigit: 0, fourDigit: 0, fivePlusDigit: 0 };
    if (words.length === 0) return result;
    for (const word of words) {
        // Match tokens that are purely numeric (with optional dot separators)
        const cleaned = word.replace(/[,;:!?]$/, '');
        if (!/^\d[\d.]*\d$|^\d{2,}$/.test(cleaned)) continue;
        const digitsOnly = cleaned.replace(/\./g, '');
        if (!/^\d+$/.test(digitsOnly)) continue;
        const len = digitsOnly.length;
        if (len < 2) continue;
        result.count++;
        if (len === 2) result.twoDigit++;
        else if (len === 3) result.threeDigit++;
        else if (len === 4) result.fourDigit++;
        else result.fivePlusDigit++;
    }
    return result;
}
