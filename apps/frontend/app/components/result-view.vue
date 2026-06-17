<script setup lang="ts">
import MeterGroup from 'primevue/metergroup';
import { type ResultData } from '~/composables/useApiClient';
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue';
import Fieldset from 'primevue/fieldset';

const Chart = defineAsyncComponent(async () => {
  const [chartModule, { Chart: ChartJs }, annotationPlugin] = await Promise.all([
    import('primevue/chart'),
    import('chart.js'),
    import('chartjs-plugin-annotation'),
  ]);
  ChartJs.register(annotationPlugin.default);
  return chartModule;
});

const chartColors = ref({
  lix: '',
  complexSyllables: '',
  consonantClusters: '',
  multiGraphemes: '',
  rareGraphemes: '',
  avgWordLength: '',
  avgPhraseLength: '',
  avgSyllablesPerWord: '',
  avgSyllablesPerPhrase: '',
  proportions: '',
  counts: '',
});

const props = defineProps<{
  result: ResultData;
}>();

const chartData = ref();
const chartOptions = ref();

const round2 = (value: unknown) => Math.round(Number(value) * 100) / 100;

// Schwierigkeit: LÜ-LIX als Kopfzahl, WK und Niveaustufe kommen aus dem Backend.
const lueLix = computed(() => round2(props.result.lueLix));
const lix = computed(() => round2(props.result.lix));
const wordComplexity = computed(() => round2(props.result.wordComplexity));
const level = computed(() => Math.round(Number(props.result.level)));
const alpha = computed(() => round2(props.result.config.alpha));
// Doughnut-Gauge auf 0–100 begrenzt; die Mitte zeigt den echten LÜ-LIX-Wert.
const gauge = computed(() => Math.min(100, Math.max(0, lueLix.value)));

// Niveaustufe-Interpretation ausschließlich aus dem Backend-Wert — keine eigene
// Stufen-Logik mehr in der Oberfläche (Issue #28).
const levelInfo = computed(() => {
  switch (level.value) {
    case 1:
      return { description: 'Sehr leicht lesbar', severity: 'success' };
    case 2:
      return { description: 'Leicht lesbar', severity: 'success' };
    case 3:
      return { description: 'Mittelschwer', severity: 'warn' };
    case 4:
      return { description: 'Eher schwer lesbar', severity: 'error' };
    default:
      return { description: 'Schwer lesbar', severity: 'error' };
  }
});

const meters = computed(() => {
  const colors = chartColors.value;
  return [
    {
      label: 'Drei- und Mehrsilber',
      color: colors.complexSyllables,
      value: Number(props.result.config.weightComplexSyllables),
    },
    {
      label: 'Mehrgliedrige Grapheme',
      color: colors.multiGraphemes,
      value: Number(props.result.config.weightMultiMemberedGraphemes),
    },
    {
      label: 'Seltene Grapheme',
      color: colors.rareGraphemes,
      value: Number(props.result.config.weightRareGraphemes),
    },
    {
      label: 'Konsonantenlauthäufung',
      color: colors.consonantClusters,
      value: Number(props.result.config.weightConsonantClusters),
    },
  ];
});

// Texttyp & Leseeinheit (ADR 0002): nur mit Leseeinheit Satz heißt der LIX
// „LIX nach Bamberger". Bei Liste werden „Sätze" zu „Zeilen" umetikettiert.
const isList = computed(() => props.result.textType === 'list');
const textTypeLabel = computed(() => (isList.value ? 'Liste' : 'Fließtext'));
const readingUnitLabel = computed(() => (isList.value ? 'Zeile' : 'Satz'));
const readingUnitPlural = computed(() => (isList.value ? 'Zeilen' : 'Sätze'));
const lixLabel = computed(() => (isList.value ? 'LIX' : 'LIX nach Bamberger'));
const readingUnitCount = computed(() => Number(props.result.countReadingUnits));

const readabilityIndices = computed(() => [
  { label: 'LÜ-LIX', value: lueLix.value },
  { label: 'Wortkomplexität (WK)', value: wordComplexity.value },
  { label: lixLabel.value, value: lix.value },
  { label: 'gSMOG', value: round2(props.result.gsmog) },
  { label: 'WST4', value: round2(props.result.wst4) },
  { label: 'Flesch-Kincaid', value: round2(props.result.fleschKincaid) },
  { label: 'RIX', value: round2(props.result.ratte) },
  {
    label: 'TTR',
    value: `${round2(props.result.ttr)}%`,
    tooltip: 'Type-Token-Relation: Anteil verschiedener Wörter an der Gesamtzahl',
  },
]);

const textStats = computed(() => [
  {
    label: 'Wortlänge',
    value: `${round2(props.result.averageWordLength)} Buchstaben`,
  },
  {
    label: isList.value ? 'Zeilenlänge' : 'Satzlänge',
    value: `${round2(props.result.averagePhraseLength)} Wörter`,
  },
  {
    label: 'Buchstaben pro Silbe',
    value: round2(props.result.averageCharsPerSyllable),
  },
  {
    label: 'Silben pro Wort',
    value: round2(props.result.averageSyllablesPerWord),
  },
  {
    label: isList.value ? 'Silben pro Zeile' : 'Silben pro Satz',
    value: round2(props.result.averageSyllablesPerPhrase),
  },
]);

// Die vier WK-Komponenten messen als Coverage den Anteil der Wörter mit dem
// Merkmal (je Wort höchstens einmal), daher stets ≤ 100 %.
const complexityFactors = computed(() => [
  {
    label: 'Lange Wörter (6+ Buchstaben)',
    value: `${Math.round(Number(props.result.proportionOfLongWords) * 10000) / 100}%`,
    count: null,
  },
  {
    label: 'Drei- und Mehrsilber',
    value: `${Math.round(Number(props.result.proportionOfWordsWithComplexSyllables) * 10000) / 100}%`,
    count: Number(props.result.countWordsWithComplexSyllables),
  },
  {
    label: 'Konsonantenlauthäufung',
    value: `${Math.round(Number(props.result.proportionOfWordsWithConsonantClusters) * 10000) / 100}%`,
    count: Number(props.result.countWordsWithConsonantClusters),
  },
  {
    label: 'Mehrgliedrige Grapheme',
    value: `${Math.round(Number(props.result.proportionOfWordsWithMultiMemberedGraphemes) * 10000) / 100}%`,
    count: Number(props.result.countWordsWithMultiMemberedGraphemes),
  },
  {
    label: 'Seltene Grapheme',
    value: `${Math.round(Number(props.result.proportionOfWordsWithRareGraphemes) * 10000) / 100}%`,
    count: Number(props.result.countWordsWithRareGraphemes),
  },
  { label: 'Abkürzungen', value: null, count: Number(props.result.countAbbreviations) },
  { label: 'Zahlen (2+ Ziffern)', value: null, count: Number(props.result.countNumbers) },
  { label: 'Sonderzeichen', value: null, count: Number(props.result.countSpecialCharacters) },
]);

const sentenceComplexity = computed(() => [
  {
    label: 'Pronominalisierungsindex',
    value: round2(props.result.proNIndex),
  },
  {
    label: 'Nebensätze pro Satz',
    value: round2(props.result.subordinateClauseRatio),
  },
  { label: 'Passivkonstruktionen', value: Number(props.result.passiveCount) },
  { label: 'Substantivierungen', value: Number(props.result.nominalizationCount) },
]);

const syllableGroups = computed(() => [
  {
    label: '1 Silbe',
    count: Number(props.result.countWordsWithOneSyllable),
    words: props.result.wordsWithOneSyllable,
  },
  {
    label: '2 Silben',
    count: Number(props.result.countWordsWithTwoSyllable),
    words: props.result.wordsWithTwoSyllables,
  },
  {
    label: '3 Silben',
    count: Number(props.result.countWordsWithThreeSyllable),
    words: props.result.wordsWithThreeSyllables,
  },
  {
    label: '4 Silben',
    count: Number(props.result.countWordsWithFourSyllable),
    words: props.result.wordsWithFourSyllables,
  },
  {
    label: '5+ Silben',
    count: Number(props.result.countWordsWithFiveSyllable),
    words: props.result.wordsWithFiveSyllables,
  },
]);

const levelColor = (documentStyle: CSSStyleDeclaration): string => {
  if (levelInfo.value.severity === 'success')
    return documentStyle.getPropertyValue('--p-green-500');
  if (levelInfo.value.severity === 'warn') return documentStyle.getPropertyValue('--p-yellow-500');
  return documentStyle.getPropertyValue('--p-red-500');
};

const setChartData = () => {
  if (typeof document === 'undefined') return { datasets: [] };
  const documentStyle = getComputedStyle(document.body);

  const g = gauge.value;
  const color = levelColor(documentStyle);

  return {
    datasets: [
      {
        data: [g, 100 - g],
        backgroundColor: [color, documentStyle.getPropertyValue('--p-surface-0')],
        hoverBackgroundColor: [color, documentStyle.getPropertyValue('--p-surface-0')],
        borderColor: color,
        borderWidth: 1,
      },
    ],
  };
};

const setChartOptions = () => {
  if (typeof document === 'undefined') return {};
  const documentStyle = getComputedStyle(document.documentElement);
  const textColor = documentStyle.getPropertyValue('--p-text-color');

  return {
    hover: {
      mode: null,
    },
    plugins: {
      tooltip: {
        enabled: false,
      },
      annotation: {
        annotations: {
          dLabel: {
            type: 'doughnutLabel',
            content: () => [String(lueLix.value), 'LÜ-LIX'],
            font: [{ size: 60 }, { size: 30 }],
            color: [textColor, textColor],
          },
        },
      },
    },
  };
};

watch(
  () => props.result,
  () => {
    chartData.value = setChartData();
    chartOptions.value = setChartOptions();
  },
);

onMounted(() => {
  const s = getComputedStyle(document.documentElement);
  chartColors.value = {
    lix: s.getPropertyValue('--p-blue-500'),
    complexSyllables: s.getPropertyValue('--p-amber-500'),
    consonantClusters: s.getPropertyValue('--p-green-500'),
    multiGraphemes: s.getPropertyValue('--p-red-500'),
    rareGraphemes: s.getPropertyValue('--p-violet-500'),
    avgWordLength: s.getPropertyValue('--p-amber-700'),
    avgPhraseLength: s.getPropertyValue('--p-amber-600'),
    avgSyllablesPerWord: s.getPropertyValue('--p-pink-500'),
    avgSyllablesPerPhrase: s.getPropertyValue('--p-green-600'),
    proportions: s.getPropertyValue('--p-cyan-500'),
    counts: s.getPropertyValue('--p-surface-500'),
  };
  chartData.value = setChartData();
  chartOptions.value = setChartOptions();
});
</script>

<template>
  <div class="flex flex-col">
    <!-- Hero: Schwierigkeit (LÜ-LIX + Niveaustufe) -->
    <div class="flex flex-col items-center gap-3 pb-6">
      <h2 class="font-semibold text-lg">Ergebnis</h2>
      <Chart
        v-if="chartOptions && chartData"
        type="doughnut"
        :data="chartData"
        :options="chartOptions"
        class="w-full md:w-[30rem]"
        :aria-label="`LÜ-LIX: ${lueLix} — Niveaustufe ${level}`"
        role="img"
      />
      <p
        class="text-lg font-medium text-center flex items-center justify-center gap-2"
        :class="{
          'text-green-600': levelInfo.severity === 'success',
          'text-amber-700': levelInfo.severity === 'warn',
          'text-red-600': levelInfo.severity === 'error',
        }"
      >
        <i
          :class="{
            'pi pi-check-circle': levelInfo.severity === 'success',
            'pi pi-exclamation-triangle': levelInfo.severity === 'warn',
            'pi pi-times-circle': levelInfo.severity === 'error',
          }"
          aria-hidden="true"
        />
        Niveaustufe {{ level }} &mdash; {{ levelInfo.description }}
      </p>
    </div>

    <div v-if="result.title" class="text-center pb-5">
      <div class="text-lg font-medium text-surface-900">&bdquo;{{ result.title }}&ldquo;</div>
      <div class="text-sm text-surface-500 mt-1">
        Titel &mdash; flie&szlig;t in keine Kennzahl ein
      </div>
    </div>

    <!-- Zwei eigenständige Dimensionen: Schwierigkeit und Umfang -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-t border-b border-surface-100">
      <div class="text-center">
        <div class="text-xs uppercase tracking-wide text-surface-500 mb-1">Schwierigkeit</div>
        <div class="text-3xl font-semibold text-surface-900">{{ lueLix }}</div>
        <div class="text-sm text-surface-500">LÜ-LIX &middot; Niveaustufe {{ level }}</div>
        <div class="text-sm text-surface-600 mt-1">
          LIX {{ lix }} &middot; WK {{ wordComplexity }}
        </div>
      </div>
      <div class="text-center">
        <div class="text-xs uppercase tracking-wide text-surface-500 mb-1">Umfang</div>
        <div class="text-3xl font-semibold text-surface-900">{{ result.countWords }}</div>
        <div class="text-sm text-surface-500">Wörter</div>
        <div class="text-sm text-surface-600 mt-1">
          {{ readingUnitCount }} {{ readingUnitPlural }} &middot;
          {{ result.countSyllables }} Silben
        </div>
        <div class="text-xs text-surface-500 mt-1">
          Texttyp {{ textTypeLabel }} &middot; Leseeinheit {{ readingUnitLabel }}
        </div>
      </div>
    </div>

    <!-- Detailed metrics — tighter spacing between collapsed fieldsets -->
    <div class="flex flex-col gap-3 mt-8">
      <Fieldset legend="Lesbarkeitsindizes" :toggleable="true" :collapsed="true">
        <div class="flex flex-col gap-3">
          <div
            v-for="item in readabilityIndices"
            :key="item.label"
            class="flex justify-between items-center py-1"
          >
            <span class="text-surface-700">{{ item.label }}</span>
            <span class="font-medium text-surface-900">{{ item.value }}</span>
          </div>
        </div>
      </Fieldset>

      <Fieldset legend="Wortkomplexität" :toggleable="true" :collapsed="true">
        <div class="flex flex-col gap-3">
          <div class="flex justify-between items-center py-1 border-b border-surface-100 pb-2">
            <span class="text-surface-700 font-medium">Wortkomplexität (WK)</span>
            <span class="font-semibold text-surface-900">{{ wordComplexity }}</span>
          </div>
          <div
            v-for="item in complexityFactors"
            :key="item.label"
            class="flex justify-between items-center py-1"
          >
            <span class="text-surface-700">{{ item.label }}</span>
            <span class="font-medium text-surface-900">
              {{ item.value }}
              <span v-if="item.count !== null" class="text-surface-500 text-sm"
                >({{ item.count }})</span
              >
            </span>
          </div>
        </div>
      </Fieldset>

      <Fieldset legend="Satzkomplexität" :toggleable="true" :collapsed="true">
        <div class="flex flex-col gap-3">
          <div
            v-for="item in sentenceComplexity"
            :key="item.label"
            class="flex justify-between items-center py-1"
          >
            <span class="text-surface-700">{{ item.label }}</span>
            <span class="font-medium text-surface-900">{{ item.value }}</span>
          </div>
        </div>
      </Fieldset>

      <Fieldset legend="Kennzahlen im Durchschnitt" :toggleable="true" :collapsed="true">
        <div class="flex flex-col gap-3">
          <div
            v-for="item in textStats"
            :key="item.label"
            class="flex justify-between items-center py-1"
          >
            <span class="text-surface-700">{{ item.label }}</span>
            <span class="font-medium text-surface-900">{{ item.value }}</span>
          </div>
        </div>
      </Fieldset>

      <Fieldset legend="Verwendete Gewichtung" :toggleable="true" :collapsed="true">
        <div class="flex justify-between items-center py-1 mb-3">
          <span class="text-surface-700">Aufschlag &alpha; (LÜ-LIX = LIX + &alpha;&middot;WK)</span>
          <span class="font-medium text-surface-900">{{ alpha }}</span>
        </div>
        <MeterGroup :value="meters" />
      </Fieldset>
    </div>

    <!-- Text analysis — more separation from metrics above -->
    <div class="flex flex-col gap-3 mt-6">
      <Fieldset legend="Textanalyse" :toggleable="true" :collapsed="true">
        <div class="flex flex-col gap-4">
          <div>
            <h3 class="font-medium text-surface-700 mb-2">Originaltext</h3>
            <p class="text-surface-700 leading-relaxed">{{ result.text }}</p>
          </div>
          <div>
            <h3 class="font-medium text-surface-700 mb-2">
              {{ readingUnitPlural }} ({{ result.phrases?.length }})
            </h3>
            <div class="flex flex-wrap gap-1">
              <Chip v-for="(phrase, index) in result.phrases" :key="index" :label="phrase" />
            </div>
          </div>
          <div>
            <h3 class="font-medium text-surface-700 mb-2">Wörter ({{ result.words?.length }})</h3>
            <div class="flex flex-wrap gap-1">
              <Chip v-for="(word, index) in result.words" :key="index" :label="word" />
            </div>
          </div>
          <div>
            <h3 class="font-medium text-surface-700 mb-2">
              Silben ({{ result.syllables?.length }})
            </h3>
            <div class="flex flex-wrap gap-1">
              <Chip v-for="(syllable, index) in result.syllables" :key="index" :label="syllable" />
            </div>
          </div>
        </div>
      </Fieldset>

      <!-- Syllable breakdown (collapsed) -->
      <Fieldset legend="Wörter nach Silbenzahl" :toggleable="true" :collapsed="true">
        <div class="flex flex-col gap-4">
          <div v-for="group in syllableGroups" :key="group.label">
            <h3 class="font-medium text-surface-700 mb-2">
              {{ group.count }} Wörter mit {{ group.label }}
            </h3>
            <div class="flex flex-wrap gap-1">
              <Chip v-for="(word, index) in group.words" :key="index" :label="word" />
            </div>
          </div>
        </div>
      </Fieldset>
    </div>
  </div>
</template>
