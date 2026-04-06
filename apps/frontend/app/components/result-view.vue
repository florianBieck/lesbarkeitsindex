<script setup lang="ts">
import MeterGroup from "primevue/metergroup";
import {type ResultData} from '~/composables/useApiClient';
import {computed, defineAsyncComponent, onMounted, ref, watch} from "vue";
import Fieldset from 'primevue/fieldset';

const Chart = defineAsyncComponent(async () => {
  const [chartModule, {Chart: ChartJs}, annotationPlugin] = await Promise.all([
    import("primevue/chart"),
    import("chart.js"),
    import("chartjs-plugin-annotation"),
  ]);
  ChartJs.register(annotationPlugin.default);
  return chartModule;
});

const chartColors = ref({
  lix: '', complexSyllables: '', consonantClusters: '', multiGraphemes: '',
  rareGraphemes: '', avgWordLength: '', avgPhraseLength: '',
  avgSyllablesPerWord: '', avgSyllablesPerPhrase: '', proportions: '', counts: '',
});

const props = defineProps<{
  result: ResultData
}>();

const chartData = ref();
const chartOptions = ref();

const score = computed(() => Math.round(Number(props.result.score)));

const scoreInterpretation = computed(() => {
  const s = score.value;
  if (s < 20) return { label: 'Niveaustufe 1', description: 'Sehr leicht lesbar', severity: 'success' };
  if (s < 33) return { label: 'Niveaustufe 2', description: 'Leicht lesbar', severity: 'success' };
  if (s < 50) return { label: 'Niveaustufe 3', description: 'Mittelschwer', severity: 'warn' };
  if (s < 66) return { label: 'Niveaustufe 4', description: 'Eher schwer lesbar', severity: 'warn' };
  return { label: 'Niveaustufe 5', description: 'Schwer lesbar', severity: 'error' };
});

const meters = computed(() => {
  const colors = chartColors.value;
  return [
    {
      label: "Lesbarkeitsindex (LIX)",
      color: colors.lix,
      value: Math.round(Number(props.result.config.parameterLix) * 100)
    },
    {
      label: "Komplexe Silben",
      color: colors.complexSyllables,
      value: Math.round(Number(props.result.config.parameterProportionOfWordsWithComplexSyllables) * 100)
    },
    {
      label: "Schwierige Buchstabenfolgen",
      color: colors.consonantClusters,
      value: Math.round(Number(props.result.config.parameterProportionOfWordsWithMultiMemberedGraphemes) * 100)
    },
    {
      label: "Mehrteilige Buchstabengruppen",
      color: colors.multiGraphemes,
      value: Math.round(Number(props.result.config.parameterProportionOfWordsWithRareGraphemes) * 100)
    },
    {
      label: "Seltene Buchstaben",
      color: colors.rareGraphemes,
      value: Math.round(Number(props.result.config.parameterProportionOfWordsWithConsonantClusters) * 100)
    },
  ];
});

const readabilityIndices = computed(() => [
  { label: "LÜ-LIX", value: Math.round(Number(props.result.score) * 100) / 100 },
  { label: "LIX", value: Math.round(Number(props.result.lix) * 100) / 100 },
  { label: "gSMOG", value: Math.round(Number(props.result.gsmog) * 100) / 100 },
  { label: "WST4", value: Math.round(Number(props.result.wst4) * 100) / 100 },
  { label: "Flesch-Kincaid", value: Math.round(Number(props.result.fleschKincaid) * 100) / 100 },
  { label: "RIX", value: Math.round(Number(props.result.ratte) * 100) / 100 },
  { label: "TTR", value: `${Math.round(Number(props.result.ttr) * 100) / 100}%`, tooltip: "Type-Token-Relation: Anteil verschiedener Wörter an der Gesamtzahl" },
]);

const textStats = computed(() => [
  { label: "Wortlänge", value: `${Math.round(Number(props.result.averageWordLength) * 100) / 100} Buchstaben` },
  { label: "Satzlänge", value: `${Math.round(Number(props.result.averagePhraseLength) * 100) / 100} Wörter` },
  { label: "Buchstaben pro Silbe", value: Math.round(Number(props.result.averageCharsPerSyllable) * 100) / 100 },
  { label: "Silben pro Wort", value: Math.round(Number(props.result.averageSyllablesPerWord) * 100) / 100 },
  { label: "Silben pro Satz", value: Math.round(Number(props.result.averageSyllablesPerPhrase) * 100) / 100 },
]);

const wordComplexity = computed(() => [
  { label: "Lange Wörter (6+ Buchstaben)", value: `${Math.round(Number(props.result.proportionOfLongWords) * 10000) / 100}%`, count: null },
  { label: "Komplexe Silben", value: `${Math.round(Number(props.result.proportionOfWordsWithComplexSyllables) * 10000) / 100}%`, count: Number(props.result.countWordsWithComplexSyllables) },
  { label: "Schwierige Buchstabenfolgen", value: `${Math.round(Number(props.result.proportionOfWordsWithConsonantClusters) * 10000) / 100}%`, count: Number(props.result.countWordsWithConsonantClusters) },
  { label: "Mehrteilige Buchstabengruppen", value: `${Math.round(Number(props.result.proportionOfWordsWithMultiMemberedGraphemes) * 10000) / 100}%`, count: Number(props.result.countWordsWithMultiMemberedGraphemes) },
  { label: "Seltene Buchstaben", value: `${Math.round(Number(props.result.proportionOfWordsWithRareGraphemes) * 10000) / 100}%`, count: Number(props.result.countWordsWithRareGraphemes) },
  { label: "Abkürzungen", value: null, count: Number(props.result.countAbbreviations) },
  { label: "Zahlen (2+ Ziffern)", value: null, count: Number(props.result.countNumbers) },
  { label: "Sonderzeichen", value: null, count: Number(props.result.countSpecialCharacters) },
]);

const sentenceComplexity = computed(() => [
  { label: "Pronominalisierungsindex", value: Math.round(Number(props.result.proNIndex) * 100) / 100 },
  { label: "Nebensätze pro Satz", value: Math.round(Number(props.result.subordinateClauseRatio) * 100) / 100 },
  { label: "Passivkonstruktionen", value: Number(props.result.passiveCount) },
  { label: "Substantivierungen", value: Number(props.result.nominalizationCount) },
]);

const syllableGroups = computed(() => [
  { label: "1 Silbe", count: Number(props.result.countWordsWithOneSyllable), words: props.result.wordsWithOneSyllable },
  { label: "2 Silben", count: Number(props.result.countWordsWithTwoSyllable), words: props.result.wordsWithTwoSyllables },
  { label: "3 Silben", count: Number(props.result.countWordsWithThreeSyllable), words: props.result.wordsWithThreeSyllables },
  { label: "4 Silben", count: Number(props.result.countWordsWithFourSyllable), words: props.result.wordsWithFourSyllables },
  { label: "5 Silben", count: Number(props.result.countWordsWithFiveSyllable), words: props.result.wordsWithFiveSyllables },
]);

const setChartData = () => {
  if (typeof document === 'undefined') return { datasets: [] };
  const documentStyle = getComputedStyle(document.body);

  const s = score.value;

  let color = documentStyle.getPropertyValue('--p-green-500');
  if (s >= 33 && s < 66) {
    color = documentStyle.getPropertyValue('--p-yellow-500');
  } else if (s >= 66) {
    color = documentStyle.getPropertyValue('--p-red-500');
  }

  return {
    datasets: [
      {
        data: [s, 100 - s],
        backgroundColor: [color, documentStyle.getPropertyValue('--p-surface-0')],
        hoverBackgroundColor: [color, documentStyle.getPropertyValue('--p-surface-0')],
        borderColor: color,
        borderWidth: 1,
      }
    ]
  };
};

const setChartOptions = () => {
  if (typeof document === 'undefined') return {};
  const documentStyle = getComputedStyle(document.documentElement);
  const textColor = documentStyle.getPropertyValue('--p-text-color');

  const s = Math.round(Number(props.result.score) * 100) / 100;

  return {
    hover: {
      mode: null
    },
    plugins: {
      tooltip: {
        enabled: false
      },
      annotation: {
        annotations: {
          dLabel: {
            type: 'doughnutLabel',
            content: () => [String(s), 'LÜ-LIX'],
            font: [{size: 60}, {size: 30}],
            color: [textColor]
          }
        }
      }
    }
  };
};

watch(() => props.result, () => {
  chartData.value = setChartData();
  chartOptions.value = setChartOptions();
});

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
    <!-- Hero: Score — generous breathing room -->
    <div class="flex flex-col items-center gap-3 pb-6">
      <h2 class="font-semibold text-lg">Ergebnis</h2>
      <Chart v-if="chartOptions && chartData" type="doughnut" :data="chartData" :options="chartOptions" class="w-full md:w-[30rem]" :aria-label="`Lesbarkeitsindex: ${score} von 100`" role="img" />
      <p class="text-lg font-medium text-center flex items-center justify-center gap-2" :class="{
        'text-green-600': scoreInterpretation.severity === 'success',
        'text-amber-700': scoreInterpretation.severity === 'warn',
        'text-red-600': scoreInterpretation.severity === 'error',
      }">
        <i :class="{
          'pi pi-check-circle': scoreInterpretation.severity === 'success',
          'pi pi-exclamation-triangle': scoreInterpretation.severity === 'warn',
          'pi pi-times-circle': scoreInterpretation.severity === 'error',
        }" aria-hidden="true" />
        {{ scoreInterpretation.label }} &mdash; {{ scoreInterpretation.description }}
      </p>
    </div>

    <!-- Key stats — tight to score, separated from details -->
    <div class="grid grid-cols-3 gap-4 text-center py-5 border-t border-b border-surface-100">
      <div>
        <div class="text-2xl font-semibold text-surface-900">{{ result.countWords }}</div>
        <div class="text-sm text-surface-500">Wörter</div>
      </div>
      <div>
        <div class="text-2xl font-semibold text-surface-900">{{ result.countPhrases }}</div>
        <div class="text-sm text-surface-500">Sätze</div>
      </div>
      <div>
        <div class="text-2xl font-semibold text-surface-900">{{ result.countSyllables }}</div>
        <div class="text-sm text-surface-500">Silben</div>
      </div>
    </div>

    <!-- Detailed metrics — tighter spacing between collapsed fieldsets -->
    <div class="flex flex-col gap-3 mt-8">
    <Fieldset legend="Lesbarkeitsindizes" :toggleable="true" :collapsed="true">
      <div class="flex flex-col gap-3">
        <div v-for="item in readabilityIndices" :key="item.label" class="flex justify-between items-center py-1">
          <span class="text-surface-700">{{ item.label }}</span>
          <span class="font-medium text-surface-900">{{ item.value }}</span>
        </div>
      </div>
    </Fieldset>

    <Fieldset legend="Wortkomplexität" :toggleable="true" :collapsed="true">
      <div class="flex flex-col gap-3">
        <div v-for="item in wordComplexity" :key="item.label" class="flex justify-between items-center py-1">
          <span class="text-surface-700">{{ item.label }}</span>
          <span class="font-medium text-surface-900">
            {{ item.value }}
            <span v-if="item.count !== null" class="text-surface-500 text-sm">({{ item.count }})</span>
          </span>
        </div>
      </div>
    </Fieldset>

    <Fieldset legend="Satzkomplexität" :toggleable="true" :collapsed="true">
      <div class="flex flex-col gap-3">
        <div v-for="item in sentenceComplexity" :key="item.label" class="flex justify-between items-center py-1">
          <span class="text-surface-700">{{ item.label }}</span>
          <span class="font-medium text-surface-900">{{ item.value }}</span>
        </div>
      </div>
    </Fieldset>

    <Fieldset legend="Kennzahlen im Durchschnitt" :toggleable="true" :collapsed="true">
      <div class="flex flex-col gap-3">
        <div v-for="item in textStats" :key="item.label" class="flex justify-between items-center py-1">
          <span class="text-surface-700">{{ item.label }}</span>
          <span class="font-medium text-surface-900">{{ item.value }}</span>
        </div>
      </div>
    </Fieldset>

    <Fieldset legend="Verwendete Gewichtung" :toggleable="true" :collapsed="true">
      <MeterGroup :value="meters"/>
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
          <h3 class="font-medium text-surface-700 mb-2">Sätze ({{ result.phrases?.length }})</h3>
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
          <h3 class="font-medium text-surface-700 mb-2">Silben ({{ result.syllables?.length }})</h3>
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
          <h3 class="font-medium text-surface-700 mb-2">{{ group.count }} Wörter mit {{ group.label }}</h3>
          <div class="flex flex-wrap gap-1">
            <Chip v-for="(word, index) in group.words" :key="index" :label="word" />
          </div>
        </div>
      </div>
    </Fieldset>
    </div>
  </div>
</template>
