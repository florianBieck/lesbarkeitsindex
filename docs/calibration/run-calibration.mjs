#!/usr/bin/env node
// Calibration runner: posts each text to the live /calculate endpoint and prints
// a compact table (Niveaustufe, LÜ-LIX, LIX, WK, Umfang, Texttyp, Leseeinheit).
// Usage: node docs/calibration/run-calibration.mjs [http://localhost:3000]

const baseUrl = process.argv[2] ?? 'http://localhost:3000';

const TEXTS = [
  {
    id: 'kt-01',
    title: 'Mein Hund',
    note: 'Klasse 1 — kurze Sätze, einfacher Wortschatz',
    text: `Mein Hund

Ich habe einen Hund. Er heißt Bello. Bello ist braun. Wir spielen jeden Tag im Garten. Er fängt den Ball. Ich werfe weit. Bello rennt schnell. Er ist mein bester Freund.`,
  },
  {
    id: 'kt-02',
    title: 'Im Herbst',
    note: 'Klasse 1–2 — Beschreibung mit Naturbegriffen',
    text: `Im Herbst

Es ist Herbst. Die Blätter werden bunt. Manche sind rot. Manche sind gelb. Der Wind weht. Die Blätter fallen vom Baum. Ich sammle sie auf. Mama bastelt daraus ein Bild.`,
  },
  {
    id: 'kt-03',
    title: 'Der Apfel',
    note: 'Klasse 2 — sinnliche Beschreibung',
    text: `Der Apfel

Auf dem Tisch liegt ein Apfel. Er ist rot und rund. Der Apfel schmeckt süß. Ich beiße hinein. Es knackt. Der Saft läuft mir übers Kinn. Mama lacht und gibt mir ein Tuch.`,
  },
  {
    id: 'kt-04',
    title: 'Ein schöner Schultag',
    note: 'Klasse 2–3 — Präteritum, mehr Verben',
    text: `Ein schöner Schultag

Heute war ein schöner Tag in der Schule. Wir haben gerechnet und gelesen. In der Pause spielten wir Fangen. Anna fiel hin, aber sie weinte nicht. Am Ende sangen wir ein Lied. Dann ging ich nach Hause.`,
  },
  {
    id: 'kt-05',
    title: 'Wörterliste: Tiere',
    note: 'Liste — Texttyp-Erkennung muss „list" liefern',
    text: `Hund
Katze
Maus
Pferd
Kuh
Hase
Vogel
Fisch
Schaf
Ziege`,
  },
];

function pad(value, width) {
  const s = String(value);
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

function round(n, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

const rows = [];
for (const sample of TEXTS) {
  const response = await fetch(`${baseUrl}/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: sample.text, saveResult: false }),
  });
  if (!response.ok) {
    console.error(`✗ ${sample.id} failed: ${response.status} ${await response.text()}`);
    process.exit(1);
  }
  const r = await response.json();
  rows.push({
    id: sample.id,
    title: sample.title,
    note: sample.note,
    level: r.level,
    lueLix: round(r.lueLix),
    lix: round(r.lix),
    wk: round(r.wordComplexity),
    words: r.countWords,
    textType: r.textType,
    readingUnit: r.readingUnit,
    detectedTextType: r.detectedTextType,
    cs: round(r.proportionOfWordsWithComplexSyllables * 100),
    mg: round(r.proportionOfWordsWithMultiMemberedGraphemes * 100),
    rg: round(r.proportionOfWordsWithRareGraphemes * 100),
    cc: round(r.proportionOfWordsWithConsonantClusters * 100),
  });
}

console.log('\nCalibration — Kinderkurztexte');
console.log('='.repeat(96));
console.log(
  pad('id', 7) +
    pad('title', 26) +
    pad('Stufe', 6) +
    pad('LÜ-LIX', 8) +
    pad('LIX', 6) +
    pad('WK', 6) +
    pad('Wörter', 8) +
    pad('Texttyp', 8) +
    pad('Leseeinheit', 13),
);
console.log('-'.repeat(96));
for (const r of rows) {
  console.log(
    pad(r.id, 7) +
      pad(r.title, 26) +
      pad(r.level, 6) +
      pad(r.lueLix, 8) +
      pad(r.lix, 6) +
      pad(r.wk, 6) +
      pad(r.words, 8) +
      pad(r.textType, 8) +
      pad(r.readingUnit, 13),
  );
}

console.log('\nWK-Komponenten (Coverage in %)');
console.log('-'.repeat(96));
console.log(
  pad('id', 7) +
    pad('title', 26) +
    pad('Drei+', 8) +
    pad('Mehrgl.', 10) +
    pad('Selten', 9) +
    pad('Cluster', 9),
);
for (const r of rows) {
  console.log(
    pad(r.id, 7) + pad(r.title, 26) + pad(r.cs, 8) + pad(r.mg, 10) + pad(r.rg, 9) + pad(r.cc, 9),
  );
}

// Maschinenlesbarer Block fürs Protokoll.
console.log('\n```json');
console.log(JSON.stringify(rows, null, 2));
console.log('```');
