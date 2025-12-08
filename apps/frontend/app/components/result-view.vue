<script setup lang="ts">
import MeterGroup from "primevue/metergroup";
import Chart from "primevue/chart";
import {type Treaty, treaty} from "@elysiajs/eden";
import type {App} from "../../../backend/src";
import {computed, onMounted, ref} from "vue";
import {Chart as ChartJs} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import Fieldset from 'primevue/fieldset';

ChartJs.register(annotationPlugin);

const client = treaty<App>('localhost:3000', {
  fetch: {
    credentials: 'include'
  }
});
type ResultData = Treaty.Data<typeof client.calculate.post>

const props = defineProps<{
  result: ResultData
}>();

const chartData = ref();
const chartOptions = ref();

const meters = computed(() => {
  return [
    {
      label: "Lesbarkeitsindex (LIX)",
      color: '#1F77B4',
      value: Math.round(Number(props.result.config.parameterLix) * 100)
    },
    {
      label: "Anteil an Wörtern mit komplexen Silben (≥3 Vokalgruppen)",
      color: '#FF7F0E',
      value: Math.round(Number(props.result.config.parameterProportionOfWordsWithComplexSyllables) * 100)
    },
    {
      label: "Anteil an Wörter mit Konsonantencluster (str|spr|schr|schw|pfl|phr|thr|kn|gn|qu)",
      color: '#2CA02C',
      value: Math.round(Number(props.result.config.parameterProportionOfWordsWithMultiMemberedGraphemes) * 100)
    },
    {
      label: "Anteil an Wörter mit mehrgliedrigen Graphemen (sch, ch, ck, ng, etc.)",
      color: '#D62728',
      value: Math.round(Number(props.result.config.parameterProportionOfWordsWithRareGraphemes) * 100)
    },
    {
      label: "Anteil an Wörtern mit seltene Graphemen (ä, ö, ü, ß, c, q, x, y)",
      color: '#9467BD',
      value: Math.round(Number(props.result.config.parameterProportionOfWordsWithConsonantClusters) * 100)
    },
  ];
});

const resultValues = computed(() => {
  return [
    {
      label: "Lübecker Lesbarkeitsindex (LÜ-LIX)",
      color: '#1F77B4',
      value: Math.round(Number(props.result.score) * 100) / 100
    },
    {
      label: "Lesbarkeitsindex (LIX)",
      color: '#1F77B4',
      value: Math.round(Number(props.result.lix) * 100) / 100
    },
    {
      label: "gSMOG",
      color: '#1F77B4',
      value: Math.round(Number(props.result.gsmog) * 100) / 100
    },
    {
      label: "WST4",
      color: '#1F77B4',
      value: Math.round(Number(props.result.wst4) * 100) / 100
    },
    {
      label: "FLESCH.Kincaid",
      color: '#1F77B4',
      value: Math.round(Number(props.result.fleschKincaid) * 100) / 100
    },
    {
      label: "Anzahl Wörter",
      color: '#1F77B4',
      value: Number(props.result.countWords)
    },
    {
      label: "Anzahl Sätze",
      color: '#7F7F7F',
      value: Number(props.result.countPhrases)
    },
    {
      label: "Anzahl Silben",
      color: '#7F7F7F',
      value: Number(props.result.countSyllables)
    },
    {
      label: "Anzahl an mehrfach vorkommenden Wörtern ",
      color: '#7F7F7F',
      value: Number(props.result.countMultipleWords)
    },
    {
      label: "Anzahl Wörter mit komplexen Silben (≥3 Vokalgruppen)",
      color: '#FF7F0E',
      value: Number(props.result.countWordsWithComplexSyllables)
    },
    {
      label: "Anzahl Wörter mit Konsonantencluster (str|spr|schr|schw|pfl|phr|thr|kn|gn|qu)",
      color: '#9467BD',
      value: Number(props.result.countWordsWithConsonantClusters)
    },
    {
      label: "Anzahl Wörter mit mehrgliedrigen Graphemen (sch, ch, ck, ng, etc.)",
      color: '#2CA02C',
      value: Number(props.result.countWordsWithMultiMemberedGraphemes)
    },
    {
      label: "Anzahl Wörter mit seltenen Graphemen (ä, ö, ü, ß, c, q, x, y)",
      color: '#D62728',
      value: Number(props.result.countWordsWithRareGraphemes)
    },
    {
      label: "Anzahl Wörter mit einer Silbe",
      color: '#D62728',
      value: Number(props.result.countWordsWithOneSyllable)
    },
    {
      label: "Anzahl Wörter mit zwei Silben",
      color: '#D62728',
      value: Number(props.result.countWordsWithTwoSyllable)
    },
    {
      label: "Anzahl Wörter mit drei Silben",
      color: '#D62728',
      value: Number(props.result.countWordsWithThreeSyllable)
    },
    {
      label: "Anzahl Wörter mit vier Silben",
      color: '#D62728',
      value: Number(props.result.countWordsWithFourSyllable)
    },
    {
      label: "Anzahl Wörter mit fünf Silben",
      color: '#D62728',
      value: Number(props.result.countWordsWithFiveSyllable)
    },
    {
      label: "Durchschnittliche Wortlänge",
      color: '#8C564B',
      value: Math.round(Number(props.result.averageWordLength) * 100) / 100
    },
    {
      label: "Durchschnittliche Satzlänge",
      color: '#BCBD22',
      value: Math.round(Number(props.result.averagePhraseLength) * 100) / 100
    },
    {
      label: "Durchschnittliche Anzahl an Silben pro Wort",
      color: '#E377C2',
      value: Math.round(Number(props.result.averageSyllablesPerWord) * 100) / 100
    },
    {
      label: "Durchschnittliche Anzahl an Silben pro Satz",
      color: '#34d399',
      value: Math.round(Number(props.result.averageSyllablesPerPhrase) * 100) / 100
    },
    {
      label: "Anteil an langen Wörtern",
      color: '#17BECF',
      value: `${Math.round(Number(props.result.proportionOfLongWords) * 10000) / 100}%`
    },
    {
      label: "Anteil an Wörtern mit komplexen Silben (≥3 Vokalgruppen)",
      color: '#17BECF',
      value: `${Math.round(Number(props.result.proportionOfWordsWithComplexSyllables) * 10000) / 100}%`
    },
    {
      label: "Anteil an Wörtern mit Konsonantencluster (str|spr|schr|schw|pfl|phr|thr|kn|gn|qu)",
      color: '#17BECF',
      value: `${Math.round(Number(props.result.proportionOfWordsWithConsonantClusters) * 10000) / 100}%`
    },
    {
      label: "Anteil an Wörtern mit mehrgliedrigen Graphemen (sch, ch, ck, ng, etc.)",
      color: '#17BECF',
      value: `${Math.round(Number(props.result.proportionOfWordsWithMultiMemberedGraphemes) * 10000) / 100}%`
    },
    {
      label: "Anteil an Wörtern mit seltene Graphemen (ä, ö, ü, ß, c, q, x, y)",
      color: '#17BECF',
      value: `${Math.round(Number(props.result.proportionOfWordsWithRareGraphemes) * 10000) / 100}%`
    },
  ];
});

const setChartData = () => {
  const documentStyle = getComputedStyle(document.body);

  const score = Math.round(Number(props.result.score));

  let color = documentStyle.getPropertyValue('--p-green-500');
  if (score >= 33 && score < 66) {
    color = documentStyle.getPropertyValue('--p-yellow-500');
  } else if (score >= 66) {
    color = documentStyle.getPropertyValue('--p-red-500');
  }

  return {
    datasets: [
      {
        data: [score, 100 - score],
        backgroundColor: [color, 'white'],
        hoverBackgroundColor: [color, 'white'],
        borderColor: color,
        borderWidth: 1,
      }
    ]
  };
};

const setChartOptions = () => {
  const documentStyle = getComputedStyle(document.documentElement);
  const textColor = documentStyle.getPropertyValue('--p-text-color');

  const score = props.result === null ? 0 : Math.round(Number(props.result.score) * 100) / 100;

  return {
    hover: {
      mode: null
    },
    plugins: {
      tooltip: {
        enabled: false
      },
      annotation: props.result === null ? undefined : {
        annotations: {
          dLabel: {
            type: 'doughnutLabel',
            content: () => [String(score), 'LÜ-LIX'],
            font: [{size: 60}, {size: 30}],
            color: ['black']
          }
        }
      }
    }
  };
};

watch(() => props.result, () => {
  chartData.value = setChartData();
  chartOptions.value = setChartOptions();
}, { deep: true });

onMounted(() => {
  chartData.value = setChartData();
  chartOptions.value = setChartOptions();
});
</script>

<template>
  <div class="card flex flex-col gap-4">
    <div class="font-semibold text-lg">Ergebnis</div>
    <div class="card flex justify-center">
      <Chart v-if="chartOptions && chartData" type="doughnut" :data="chartData" :options="chartOptions" class="w-full md:w-[30rem]" />
    </div>
    <div class="flex flex-col gap-2 p-2">
    <DataTable :value="resultValues" tableStyle="min-width: 50rem">
      <Column field="label" header="Feld"></Column>
      <Column field="value" header="Wert"></Column>
    </DataTable>
    </div>
    <div class="flex flex-col gap-2 p-2">
      <h2>Gewichtung</h2>
      <MeterGroup :value="meters"/>
    </div>
    <div class="flex flex-col gap-2 p-2">
      <Fieldset legend="Original Text">
        <p class="m-0">{{ result.text }}</p>
        <p class="pt-5 text-xs text-gray-300">Hash: {{ result.hashText }}</p>
      </Fieldset>
    </div>
    <div class="flex flex-col gap-2 p-2">
      <Fieldset legend="Spaltung in Sätze">
        <Chip v-for="(phrase, index) in result.phrases" :key="index" class="my-1" :label="phrase" />
      </Fieldset>
    </div>
    <div class="flex flex-col gap-2 p-2">
      <Fieldset legend="Spaltung in Wörter">
        <Chip v-for="(word, index) in result.words" :key="index" class="m-1" :label="word" />
      </Fieldset>
    </div>
    <div class="flex flex-col gap-2 p-2">
      <Fieldset legend="Spaltung in Silben">
        <Chip v-for="(syllable, index) in result.syllables" :key="index" class="m-1" :label="syllable" />
      </Fieldset>
    </div>
    <div class="flex flex-col gap-2 p-2">
      <Fieldset :legend="`${result.countWordsWithOneSyllable} Wörter mit einer Silbe`">
        <Chip v-for="(word, index) in result.wordsWithOneSyllable" :key="index" class="m-1" :label="word" />
      </Fieldset>
    </div>
    <div class="flex flex-col gap-2 p-2">
      <Fieldset :legend="`${result.countWordsWithTwoSyllable} Wörter mit zwei Silben`">
        <Chip v-for="(word, index) in result.wordsWithTwoSyllables" :key="index" class="m-1" :label="word" />
      </Fieldset>
    </div>
    <div class="flex flex-col gap-2 p-2">
      <Fieldset :legend="`${result.countWordsWithThreeSyllable} Wörter mit drei Silben`">
        <Chip v-for="(word, index) in result.wordsWithThreeSyllables" :key="index" class="m-1" :label="word" />
      </Fieldset>
    </div>
    <div class="flex flex-col gap-2 p-2">
      <Fieldset :legend="`${result.countWordsWithFourSyllable} Wörter mit vier Silben`">
        <Chip v-for="(word, index) in result.wordsWithFourSyllables" :key="index" class="m-1" :label="word" />
      </Fieldset>
    </div>
    <div class="flex flex-col gap-2 p-2">
      <Fieldset :legend="`${result.countWordsWithFiveSyllable} Wörter mit fünf Silben`">
        <Chip v-for="(word, index) in result.wordsWithFiveSyllables" :key="index" class="m-1" :label="word" />
      </Fieldset>
    </div>
  </div>
</template>