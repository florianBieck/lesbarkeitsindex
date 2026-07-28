/*
    Type-Token-Relation (TTR)
    Formula: (Types / Tokens) * 100
    Types = unique words (case-insensitive), Tokens = total word count.
    Measures vocabulary diversity — higher TTR means more varied vocabulary.
 */
export function calculateTTR(words: readonly string[]): number {
  if (words.length === 0) return 0;
  const types = new Set(words.map((w) => w.toLowerCase()));
  return Math.round((types.size / words.length) * 10000) / 100;
}

/*
    Abkürzungen erkennen — three categories per PDF parameter list:
    1. Unit abbreviations (km, kg, cm, etc.)
    2. Common abbreviations with dots (z.B., d.h., etc.)
    3. Acronyms (EU, USA, ADAC, etc.)
 */

const UNIT_ABBREVIATIONS = new Set([
  'km',
  'm',
  'cm',
  'mm',
  'g',
  'kg',
  'l',
  'ml',
  'h',
  'min',
  'sec',
  's',
  '€',
  'km/h',
]);

const DOTTED_ABBREVIATIONS = new Set([
  'z.b.',
  'd.h.',
  'u.a.',
  'bzw.',
  'etc.',
  'usw.',
  'ca.',
  'evtl.',
  'nr.',
  'str.',
  'i.d.r.',
  'v.a.',
  'dr.',
  'prof.',
  'mind.',
  'max.',
  'std.',
  'min.',
  'sek.',
  'ct.',
  'tsd.',
  'mio.',
  'mrd.',
  'm²',
  'km²',
  '°c',
]);

const ACRONYMS = new Set([
  'UNO',
  'UNICEF',
  'UNESCO',
  'EU',
  'USA',
  'ADAC',
  'NASA',
  'DRK',
  'DB',
  'IC',
  'ICE',
  'WWF',
  'ARD',
  'ZDF',
  'TV',
  'EM',
  'WM',
  'FIFA',
  'DFB',
  'LKW',
  'PKW',
  'G7',
  'G20',
  'OECD',
  'GPS',
  'AI',
  'KI',
  'NABU',
  'BUND',
]);

export function calculateAbbreviations(words: readonly string[]): number {
  let count = 0;
  for (const word of words) {
    const lower = word.toLowerCase().replace(/[,;:!?]$/, '');
    if (
      UNIT_ABBREVIATIONS.has(lower) ||
      DOTTED_ABBREVIATIONS.has(lower) ||
      ACRONYMS.has(word.replace(/[,;:!?]$/, ''))
    ) {
      count++;
    }
  }
  return count;
}

/*
    Sonderzeichen erkennen — per PDF (section b, Zeichen):
    ?, !, quotation marks (various styles), parentheses,
    %, &, §, #, @, em-dash (–), slash (/)
    Excludes standard punctuation (. , : ;) which is expected in text.
    Operates on raw text since tokenization strips many of these.
 */
const SPECIAL_CHAR_REGEX = /[?!""„"»«'‚'()%&§#@–—/]/g;

export function calculateSpecialCharacters(text: string): number {
  return (text.match(SPECIAL_CHAR_REGEX) ?? []).length;
}

/*
    Zahlen erkennen — per PDF parameter list.
    Numbers with dot separators (e.g. 5.289) are treated as one number.
    Single-digit numbers are ignored (not difficult).
 */
export function calculateNumbers(words: readonly string[]): number {
  let count = 0;
  for (const word of words) {
    // Purely numeric tokens (with optional dot separators): the pattern requires
    // a digit at both ends, so at least two digits remain after stripping dots.
    const cleaned = word.replace(/[,;:!?]$/, '');
    if (/^\d[\d.]*\d$|^\d{2,}$/.test(cleaned)) count++;
  }
  return count;
}
