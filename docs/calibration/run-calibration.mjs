#!/usr/bin/env node
// Calibration runner: posts each text to the live /api/calculate endpoint and prints
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

function round(n, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

const rows = [];
for (const sample of TEXTS) {
  const response = await fetch(`${baseUrl}/api/calculate`, {
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
  'id'.padEnd(7) +
    'title'.padEnd(26) +
    'Stufe'.padEnd(6) +
    'LÜ-LIX'.padEnd(8) +
    'LIX'.padEnd(6) +
    'WK'.padEnd(6) +
    'Wörter'.padEnd(8) +
    'Texttyp'.padEnd(8) +
    'Leseeinheit'.padEnd(13),
);
console.log('-'.repeat(96));
for (const r of rows) {
  console.log(
    String(r.id).padEnd(7) +
      String(r.title).padEnd(26) +
      String(r.level).padEnd(6) +
      String(r.lueLix).padEnd(8) +
      String(r.lix).padEnd(6) +
      String(r.wk).padEnd(6) +
      String(r.words).padEnd(8) +
      String(r.textType).padEnd(8) +
      String(r.readingUnit).padEnd(13),
  );
}

console.log('\nWK-Komponenten (Coverage in %)');
console.log('-'.repeat(96));
console.log(
  'id'.padEnd(7) +
    'title'.padEnd(26) +
    'Drei+'.padEnd(8) +
    'Mehrgl.'.padEnd(10) +
    'Selten'.padEnd(9) +
    'Cluster'.padEnd(9),
);
for (const r of rows) {
  console.log(
    String(r.id).padEnd(7) +
      String(r.title).padEnd(26) +
      String(r.cs).padEnd(8) +
      String(r.mg).padEnd(10) +
      String(r.rg).padEnd(9) +
      String(r.cc).padEnd(9),
  );
}

// Maschinenlesbarer Block fürs Protokoll.
console.log('\n```json');
console.log(JSON.stringify(rows, null, 2));
console.log('```');
