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
      label: "Anzahl Wörter",
      color: '#1F77B4',
      value: Math.round(Number(props.result.config.parameterCountWords) * 100)
    },
    {
      label: "Silbenkomplexität",
      color: '#FF7F0E',
      value: Math.round(Number(props.result.config.parameterSyllableComplexity) * 100)
    },
    {
      label: "Mehrgliedrige Grapheme",
      color: '#2CA02C',
      value: Math.round(Number(props.result.config.parameterMultiMemberedGraphemes) * 100)
    },
    {
      label: "Seltene Grapheme",
      color: '#D62728',
      value: Math.round(Number(props.result.config.parameterRareGraphemes) * 100)
    },
    {
      label: "Konsonantencluster",
      color: '#9467BD',
      value: Math.round(Number(props.result.config.parameterConsonantClusters) * 100)
    },
    {
      label: "Durchschnittliche Wortlänge",
      color: '#8C564B',
      value: Math.round(Number(props.result.config.parameterAverageWordLength) * 100)
    },
    {
      label: "∅Silben/Wort",
      color: '#E377C2',
      value: Math.round(Number(props.result.config.parameterAverageSyllablesPerWord) * 100)
    },
    {
      label: "Anzahl Sätze",
      color: '#7F7F7F',
      value: Math.round(Number(props.result.config.parameterCountPhrases) * 100)
    },
    {
      label: "Durchschnittliche Satzlänge",
      color: '#BCBD22',
      value: Math.round(Number(props.result.config.parameterAveragePhraseLength) * 100)
    },
    {
      label: "∅Silben/Satz",
      color: '#34d399',
      value: Math.round(Number(props.result.config.parameterAverageSyllablesPerPhrase) * 100)
    },
    {
      label: "Anteil an langen Wörtern",
      color: '#17BECF',
      value: Math.round(Number(props.result.config.parameterProportionOfLongWords) * 100)
    },
  ];
});

const resultValues = computed(() => {
  return [
    {
      label: "Anzahl Wörter",
      color: '#1F77B4',
      value: Number(props.result.countWords)
    },
    {
      label: "Silbenkomplexität",
      color: '#FF7F0E',
      value: Number(props.result.syllableComplexity)
    },
    {
      label: "Mehrgliedrige Grapheme",
      color: '#2CA02C',
      value: Number(props.result.multiMemberedGraphemes)
    },
    {
      label: "Seltene Grapheme",
      color: '#D62728',
      value: Number(props.result.rareGraphemes)
    },
    {
      label: "Konsonantencluster",
      color: '#9467BD',
      value: Number(props.result.consonantClusters)
    },
    {
      label: "Durchschnittliche Wortlänge",
      color: '#8C564B',
      value: Number(props.result.averageWordLength)
    },
    {
      label: "∅Silben/Wort",
      color: '#E377C2',
      value: Number(props.result.averageSyllablesPerWord)
    },
    {
      label: "Anzahl Sätze",
      color: '#7F7F7F',
      value: Number(props.result.countPhrases)
    },
    {
      label: "Durchschnittliche Satzlänge",
      color: '#BCBD22',
      value: Number(props.result.averagePhraseLength)
    },
    {
      label: "∅Silben/Satz",
      color: '#34d399',
      value: Number(props.result.averageSyllablesPerPhrase)
    },
    {
      label: "Anteil an langen Wörtern",
      color: '#17BECF',
      value: Number(props.result.proportionOfLongWords)
    },
  ];
});

const setChartData = () => {
  const documentStyle = getComputedStyle(document.body);

  const score = Math.round(Number(props.result.score));

  return {
    datasets: [
      {
        data: [score, 100 - score],
        backgroundColor: [documentStyle.getPropertyValue('--p-green-500'), 'white'],
        hoverBackgroundColor: [documentStyle.getPropertyValue('--p-green-400'), 'white'],
        borderColor: documentStyle.getPropertyValue('--p-green-500'),
        borderWidth: 1,
      }
    ]
  };
};

const setChartOptions = () => {
  const documentStyle = getComputedStyle(document.documentElement);
  const textColor = documentStyle.getPropertyValue('--p-text-color');

  const score = props.result === null ? 0 : Math.round(Number(props.result.score));

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
  </div>
</template>