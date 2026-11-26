<template>
  <article class="flex flex-col gap-10 leading-relaxed text-surface-700">
    <header class="flex flex-col gap-3">
      <RouterLink to="/" class="text-sm text-primary-700 hover:underline">
        <i class="pi pi-arrow-left text-xs" aria-hidden="true" /> Zur Textanalyse
      </RouterLink>
      <h2 class="text-2xl leading-tight font-semibold text-surface-900">
        So wird der LÜ-LIX berechnet
      </h2>
      <p>
        Der LÜ-LIX sagt, wie schwer ein Text zu lesen ist. Er besteht aus zwei Teilen: dem
        klassischen Lesbarkeitsindex (LIX), der Satzlänge und lange Wörter misst, und einem
        Aufschlag für die Wortkomplexität (WK), die misst, wie schwer die einzelnen Wörter zu
        erlesen sind.
      </p>
      <p :class="FORMULA_CLASS">LÜ-LIX = LIX + α · WK</p>
      <p>
        Die Wortkomplexität kann einen Text nur schwerer machen, nie leichter: Der LÜ-LIX liegt nie
        unter dem LIX.
      </p>
    </header>

    <section class="flex flex-col gap-3" aria-labelledby="doc-text">
      <h3 id="doc-text" :class="HEADING_CLASS">1. Der Text wird vorbereitet</h3>
      <p>
        Zuerst bestimmt das Werkzeug den <strong>Texttyp</strong>, denn er legt die Leseeinheit
        fest, auf die sich alle satzbezogenen Werte beziehen:
      </p>
      <ul class="flex list-disc flex-col gap-2 pl-6">
        <li><strong>Fließtext:</strong> Die Leseeinheit ist der Satz. Das ist der Normalfall.</li>
        <li>
          <strong>Liste:</strong> Die Leseeinheit ist die Zeile, etwa bei Leselisten mit Wörtern,
          Formulierungen und ganzen Sätzen. Ein Text gilt als Liste, wenn die Mehrheit seiner nicht
          leeren Zeilen nicht mit Punkt, Ausrufezeichen oder Fragezeichen endet.
        </li>
      </ul>
      <p>
        Der Texttyp wird automatisch erkannt. Mit dem Schalter &bdquo;Texttyp&ldquo; unter dem
        Textfeld können Sie ihn ändern.
      </p>
      <p>
        Bei Fließtext gilt die erste Zeile als <strong>Titel</strong>, wenn sie höchstens 50 Zeichen
        lang ist, nicht mit Punkt, Ausrufezeichen oder Fragezeichen endet und weiterer Text folgt.
        Der Titel steht im Ergebnis, fließt aber in keine Kennzahl ein.
      </p>
    </section>

    <section class="flex flex-col gap-3" aria-labelledby="doc-lix">
      <h3 id="doc-lix" :class="HEADING_CLASS">2. Der LIX</h3>
      <p>
        Der LIX zählt zwei Dinge zusammen: wie viele Wörter im Durchschnitt in einer Leseeinheit
        stehen und wie viel Prozent der Wörter lang sind.
      </p>
      <p :class="FORMULA_CLASS">LIX = Wörter ÷ Leseeinheiten + lange Wörter × 100 ÷ Wörter</p>
      <p>
        Lang ist ein Wort mit mehr als sechs Buchstaben. Bindestriche zählen dabei nicht mit,
        Ziffern zählen wie Buchstaben.
      </p>
      <p>
        Bei Fließtext ist das der LIX nach Bamberger, unverändert nach der Literatur berechnet und
        mit anderen Werkzeugen vergleichbar. Bei einer Liste tritt die Zeile an die Stelle des
        Satzes; dieser Wert ist nicht mit einem LIX nach Bamberger vergleichbar.
      </p>
    </section>

    <section class="flex flex-col gap-3" aria-labelledby="doc-wk">
      <h3 id="doc-wk" :class="HEADING_CLASS">3. Die Wortkomplexität (WK)</h3>
      <p>
        Die Wortkomplexität ist ein Wert zwischen 0 und 100. Sie setzt sich aus vier Merkmalen
        zusammen. Für jedes Merkmal wird bestimmt, wie viel Prozent der Wörter es mindestens einmal
        enthalten. Ein Wort zählt je Merkmal höchstens einmal.
      </p>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-surface-200 text-surface-900">
              <th scope="col" class="py-2 pr-4 font-semibold">Merkmal</th>
              <th scope="col" class="py-2 font-semibold">Was zählt</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="component in WK_COMPONENTS"
              :key="component.key"
              class="border-b border-surface-200 align-top"
            >
              <th scope="row" class="py-2 pr-4 font-medium text-surface-900">
                {{ component.label }}
              </th>
              <td class="py-2">{{ component.description }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Jedes Merkmal hat ein Gewicht. Die Wortkomplexität ist der gewichtete Mittelwert der vier
        Anteile:
      </p>
      <p :class="FORMULA_CLASS">WK = Summe aus Gewicht × Anteil in Prozent ÷ Summe der Gewichte</p>
      <p>
        Es kommt auf das Verhältnis der Gewichte zueinander an, nicht auf ihre Summe: Die Gewichte
        50, 25, 12,5 und 12,5 ergeben dasselbe wie 4, 2, 1 und 1.
      </p>
    </section>

    <section class="flex flex-col gap-3" aria-labelledby="doc-alpha">
      <h3 id="doc-alpha" :class="HEADING_CLASS">4. Der Aufschlag α</h3>
      <p>
        Der Aufschlag α legt fest, wie stark die Wortkomplexität den LIX erhöht. Bei α = 0 ist der
        LÜ-LIX gleich dem LIX; je größer α, desto mehr zählt die Wortkomplexität.
      </p>
      <p :class="FORMULA_CLASS">LÜ-LIX = LIX + α · WK</p>
    </section>

    <section class="flex flex-col gap-3" aria-labelledby="doc-level">
      <h3 id="doc-level" :class="HEADING_CLASS">5. Die Niveaustufe</h3>
      <p>
        Aus dem LÜ-LIX ergibt sich eine von fünf Niveaustufen. Die Grenzen folgen den Bändern, die
        die Literatur für den LIX nennt.
      </p>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-surface-200 text-surface-900">
              <th scope="col" class="py-2 pr-4 font-semibold">LÜ-LIX</th>
              <th scope="col" class="py-2 pr-4 font-semibold">Niveaustufe</th>
              <th scope="col" class="py-2 font-semibold">Bedeutung</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in LEVELS"
              :key="row.level"
              data-testid="level-row"
              class="border-b border-surface-200"
            >
              <td class="py-2 pr-4">{{ row.range }}</td>
              <td class="py-2 pr-4 font-medium text-surface-900">{{ row.level }}</td>
              <td class="py-2"><Tag :value="row.label" :severity="row.severity" /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Der Umfang eines Textes, also seine Wortzahl, fließt bewusst nicht in den LÜ-LIX ein: Der
        LÜ-LIX sagt, wie schwer ein Text ist, der Umfang sagt, wie viel zu lesen ist. Auch die
        weiteren Indizes im Ergebnis (gSMOG, WST4, Flesch-Kincaid, RIX) stehen nur zum Vergleich
        dort.
      </p>
    </section>

    <section class="flex flex-col gap-3" aria-labelledby="doc-example">
      <h3 id="doc-example" :class="HEADING_CLASS">Ein Rechenbeispiel</h3>
      <p>
        Der Text &bdquo;Igel sind nachtaktive Tiere. Sie schlafen am Tag.&ldquo; hat 8 Wörter in 2
        Sätzen. Zwei Wörter haben mehr als sechs Buchstaben: &bdquo;nachtaktive&ldquo; und
        &bdquo;schlafen&ldquo;.
      </p>
      <p :class="FORMULA_CLASS">LIX = 8 ÷ 2 + 2 × 100 ÷ 8 = 29</p>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-surface-200 text-surface-900">
              <th scope="col" class="py-2 pr-4 font-semibold">Merkmal</th>
              <th scope="col" class="py-2 pr-4 font-semibold">Wörter mit dem Merkmal</th>
              <th scope="col" class="py-2 pr-4 font-semibold">Anteil</th>
              <th scope="col" class="py-2 font-semibold">Gewicht</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in EXAMPLE_ROWS"
              :key="row.label"
              class="border-b border-surface-200 align-top"
            >
              <th scope="row" class="py-2 pr-4 font-medium text-surface-900">{{ row.label }}</th>
              <td class="py-2 pr-4">{{ row.words }}</td>
              <td class="py-2 pr-4 whitespace-nowrap">{{ row.share }}</td>
              <td class="py-2">{{ row.weight }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p :class="FORMULA_CLASS">
        WK = (50 × 12,5 + 25 × 50 + 12,5 × 25 + 12,5 × 12,5) ÷ 100 = 23,44
      </p>
      <p>Mit dem Aufschlag α = 0,3 ergibt sich:</p>
      <p :class="FORMULA_CLASS">LÜ-LIX = 29 + 0,3 × 23,44 = 36,03</p>
      <p>Das ist Niveaustufe 2, &bdquo;Leicht lesbar&ldquo;.</p>
    </section>

    <section class="flex flex-col gap-3" aria-labelledby="doc-adjust">
      <h3 id="doc-adjust" :class="HEADING_CLASS">Die Berechnung anpassen</h3>

      <h4 class="mt-2 font-semibold text-surface-900">Für eine einzelne Analyse</h4>
      <p>
        Auf der Startseite finden Sie unter dem Textfeld den Bereich &bdquo;Erweiterte
        Einstellungen&ldquo;. Dort können Sie den Aufschlag α (0 bis 10) und die vier Gewichte (ab
        0) ändern und den Text damit analysieren.
      </p>
      <ul class="flex list-disc flex-col gap-2 pl-6">
        <li>Ein größerer Aufschlag α lässt die Wortkomplexität stärker zählen.</li>
        <li>Mit α = 0 erhalten Sie den reinen LIX.</li>
        <li>
          Ein größeres Gewicht lässt ein Merkmal im Vergleich zu den anderen stärker zählen. Mit dem
          Gewicht 0 fließt es nicht ein.
        </li>
        <li>Stehen alle vier Gewichte auf 0, ist die Wortkomplexität 0.</li>
      </ul>
      <p>
        Geänderte Werte gelten, bis Sie die Seite neu laden; gespeichert wird nichts. Mit
        &bdquo;Zurücksetzen auf Standard&ldquo; stellen Sie die Standardwerte sofort wieder her. Ein
        Ergebnis, das nicht mit den Standardwerten berechnet wurde, trägt den Hinweis
        &bdquo;Abweichende Einstellungen&ldquo;. Womit gerechnet wurde, steht im Ergebnis unter
        &bdquo;Verwendete Gewichtung&ldquo;.
      </p>
      <p>
        Auch der Schalter &bdquo;Texttyp&ldquo; ändert die Berechnung: Er bestimmt, ob Sätze oder
        Zeilen als Leseeinheit zählen.
      </p>

      <h4 class="mt-2 font-semibold text-surface-900">Dauerhaft für alle</h4>
      <p>
        Die Standardwerte stehen in der Datei <code>config.json</code> auf dem Server. Wer das
        Werkzeug betreut, kann sie dort ändern; die neuen Werte gelten sofort für die nächste
        Analyse.
      </p>
      <div class="rounded-md border border-surface-200 p-4">
        <h5 class="mb-2 font-medium text-surface-900">Aktuelle Standardwerte</h5>
        <dl v-if="defaults" class="flex flex-col">
          <div
            v-for="entry in defaults"
            :key="entry.label"
            data-testid="default-value"
            class="flex items-center justify-between gap-4 py-1"
          >
            <dt>{{ entry.label }}</dt>
            <dd class="font-medium text-surface-900">{{ entry.value }}</dd>
          </div>
        </dl>
        <p v-else-if="configState === 'unavailable'" class="text-sm">
          Die Standardwerte konnten gerade nicht geladen werden.
        </p>
        <p v-else class="text-sm">Die Standardwerte werden geladen …</p>
      </div>
    </section>

    <RouterLink to="/" class="text-primary-700 hover:underline">
      <i class="pi pi-arrow-left text-xs" aria-hidden="true" /> Zur Textanalyse
    </RouterLink>
  </article>
</template>
<script setup lang="ts">
import type { ConfigWeights } from '@lesbarkeitsindex/api-client';
import Tag from 'primevue/tag';
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useApiClient } from '@/composables/useApiClient';
import { niveaustufe, type Severity } from '@/utils/niveaustufe';

// Erklärt die Berechnung (ADR 0001, 0002) und ihre Anpassung (ADR 0008). Die Zahlen des
// Rechenbeispiels sichert apps/backend/src/calculate/result/documentation-example.spec.ts.

const HEADING_CLASS = 'text-lg font-semibold text-surface-900';
const FORMULA_CLASS =
  'rounded-md bg-surface-100 px-4 py-3 text-center font-medium text-surface-900';

const WK_COMPONENTS = [
  {
    key: 'weightComplexSyllables',
    label: 'Drei- und Mehrsilber',
    description: 'Wörter mit drei oder mehr Silben.',
  },
  {
    key: 'weightMultiMemberedGraphemes',
    label: 'Mehrgliedrige Grapheme',
    description:
      'Grapheme aus mehreren Buchstaben: sch, ch, ck, ng, die Diphthonge ie, ei, eu, äu und au sowie sp und st am Wortanfang.',
  },
  {
    key: 'weightRareGraphemes',
    label: 'Seltene Grapheme',
    description: 'Im Deutschen seltene Schriftzeichen: ä, ö, ü, ß, c, q, x, y.',
  },
  {
    key: 'weightConsonantClusters',
    label: 'Konsonantenlauthäufung',
    description:
      'Mehrere Konsonantenlaute hintereinander: mindestens zwei am Wortanfang (etwa Schl-, Str-, Kn-) oder mindestens drei am Wortende (etwa -nkt, -rbst).',
  },
] as const satisfies readonly { key: keyof ConfigWeights; label: string; description: string }[];

// Die Bänder der Niveaustufe; das Backend rechnet sie in score-model.ts.
const LEVEL_RANGES = ['unter 30', '30 bis unter 40', '40 bis unter 50', '50 bis unter 60', 'ab 60'];

const TAG_SEVERITY: Record<Severity, 'success' | 'warn' | 'danger'> = {
  success: 'success',
  warn: 'warn',
  error: 'danger',
};

const LEVELS = LEVEL_RANGES.map((range, index) => {
  const level = index + 1;
  const { label, severity } = niveaustufe(level);
  return { range, level, label, severity: TAG_SEVERITY[severity] };
});

const EXAMPLE_ROWS = [
  { label: 'Drei- und Mehrsilber', words: 'nachtaktive', share: '1 von 8 = 12,5 %', weight: '50' },
  {
    label: 'Mehrgliedrige Grapheme',
    words: 'nachtaktive (ch), Tiere (ie), Sie (ie), schlafen (sch)',
    share: '4 von 8 = 50 %',
    weight: '25',
  },
  {
    label: 'Seltene Grapheme',
    words: 'nachtaktive (c), schlafen (c)',
    share: '2 von 8 = 25 %',
    weight: '12,5',
  },
  {
    label: 'Konsonantenlauthäufung',
    words: 'schlafen (Schl-)',
    share: '1 von 8 = 12,5 %',
    weight: '12,5',
  },
];

const formatNumber = (value: number): string => value.toLocaleString('de-DE');

const client = useApiClient();

type ConfigState = 'loading' | 'ready' | 'unavailable';
const configState = ref<ConfigState>('loading');
const config = ref<ConfigWeights | null>(null);

const defaults = computed(() => {
  const loaded = config.value;
  if (!loaded) return null;
  return [
    { label: 'Aufschlag α', value: formatNumber(loaded.alpha) },
    ...WK_COMPONENTS.map(({ key, label }) => ({ label, value: formatNumber(loaded[key]) })),
  ];
});

onMounted(async () => {
  try {
    config.value = await client.getConfig();
    configState.value = 'ready';
  } catch (e) {
    // Die Erklärung steht auch ohne die aktuellen Werte; die Startseite meldet eine
    // fehlerhafte config.json selbst.
    console.error('Standardwerte konnten nicht geladen werden', e);
    configState.value = 'unavailable';
  }
});
</script>
