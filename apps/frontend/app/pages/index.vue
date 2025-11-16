<template>
  <div class="flex flex-col gap-4">
    <div class="w-full">
      <p class="text-surface-700 dark:text-surface-200 leading-normal">Die Lesbarkeit eines Textes wird beim klassischen
        LIX über die Anzahl von Wörtern und Sätzen sowie über die durchschnittliche Satzlänge und über den prozentualen
        Anteil langer Wörter (6 und mehr Buchstaben) berechnet. Für Leselernende spielen weitere Faktoren eine wichtige
        Rolle. Vor allem die Komplexität von Wörtern erleichtert oder erschwert das Lesen.</p>
      <p class="text-surface-700 dark:text-surface-200 leading-normal">Dieser Prototyp berechnet eine Erweiterung mit 6
        Parametern. Unten sehen Sie die Aufteilung der Teilwerte.</p>
    </div>
    <div class="flex gap-6 w-full">
      <div class="flex flex-col items-center gap-2 w-full">
        <Editor v-model="text" class="w-full" editorStyle="height: 280px; width: 100%;"/>
      </div>
    </div>
    <div class="flex items-center gap-4">
      <Button :loading="loading" label="Berechnen" icon="pi pi-calculator" class="py-2 rounded-lg" @click="calculate"/>
      <Button label="Gewichte neu laden" icon="pi pi-refresh" severity="secondary" text @click="loadConfig"/>
    </div>
    <div v-if="result" class="card flex flex-col gap-4">
      <div class="font-semibold text-lg">Ergebnis</div>
      <div class="card flex justify-center">
        <Chart v-if="chartOptions && chartData" type="doughnut" :data="chartData" :options="chartOptions" class="w-full md:w-[30rem]" />
      </div>
      <MeterGroup :value="meters"/>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 border rounded-md">
          <div class="font-medium mb-2">Gewichtung (Beitrag in %)</div>
          <ul class="space-y-1">
            <li class="flex justify-between">
              <span>Anzahl Wörter</span>
              <span class="font-semibold">{{ result.config.parameterCountWords }}%</span>
            </li>
          </ul>
          <div class="mt-2 text-right font-bold">Gesamt: {{ Number(result.score) }}</div>
        </div>
        <div class="p-4 border rounded-md">
          <div class="font-medium mb-2">Rohwerte</div>
          <ul class="space-y-1">
            <li>Anzahl Wörter: {{ result.countWords }}</li>
            <li>Silbenkomplexität: {{ result.syllableComplexity }}</li>
            <li>Mehrgliedrige Grapheme: {{ result.multiMemberedGraphemes }}</li>
            <li>Seltene Grapheme: {{ result.rareGraphemes }}</li>
            <li>Konsonantencluster: {{ result.consonantClusters }}</li>
            <li>Durchschnittliche Wortlänge: {{ result.averageWordLength }}%</li>
            <li>∅Silben/Wort: {{ result.averageSyllablesPerWord }}%</li>
            <li>Anzahl Sätze: {{ result.countPhrases }}%</li>
            <li>Durchschnittliche Satzlänge: {{ result.averagePhraseLength }}%</li>
            <li>∅Silben/Satz: {{ result.averageSyllablesPerPhrase }}%</li>
            <li>Anteil an langen Wörtern: {{ result.proportionOfLongWords }}%</li>
          </ul>
        </div>
      </div>
    </div>
    <div v-else class="text-surface-500">Geben Sie Text ein und klicken Sie auf Berechnen.</div>
  </div>
</template>
<script setup lang="ts">
import {ref, computed, onMounted} from 'vue'
import Button from 'primevue/button'
import Editor from 'primevue/editor'
import MeterGroup from 'primevue/metergroup'
import {type Treaty, treaty} from "@elysiajs/eden";
import type {App} from "../../../backend/src";
import { Chart as ChartJs } from 'chart.js';
import Chart from 'primevue/chart';
import annotationPlugin from 'chartjs-plugin-annotation';

ChartJs.register(annotationPlugin);

const client = treaty<App>('localhost:3000', {
  fetch: {
    credentials: 'include'
  }
});
type ResultData = Treaty.Data<typeof client.calculate.post>
type ConfigData = Treaty.Data<typeof client.config.get>

const text = ref('')
const loading = ref(false)
const result = ref<ResultData | null>(null)
const config = ref<ConfigData | null>(null);
const chartData = ref();
const chartOptions = ref(null);

const meters = computed(() => {
  if (!result.value) return []
  return [
    {
      label: "Anzahl Wörter",
      color: '#34d399',
      value: Number(result.value.countWords)
    },
    {
      label: "Silbenkomplexität",
      color: '#34d399',
      value: Number(result.value.syllableComplexity)
    },
    {
      label: "Mehrgliedrige Grapheme",
      color: '#34d399',
      value: Number(result.value.multiMemberedGraphemes)
    },
    {
      label: "Seltene Grapheme",
      color: '#34d399',
      value: Number(result.value.rareGraphemes)
    },
    {
      label: "Konsonantencluster",
      color: '#34d399',
      value: Number(result.value.consonantClusters)
    },
    {
      label: "Durchschnittliche Wortlänge",
      color: '#34d399',
      value: Number(result.value.averageWordLength)
    },
    {
      label: "∅Silben/Wort",
      color: '#34d399',
      value: Number(result.value.averageSyllablesPerWord)
    },
    {
      label: "Anzahl Sätze",
      color: '#34d399',
      value: Number(result.value.countPhrases)
    },
    {
      label: "Durchschnittliche Satzlänge",
      color: '#34d399',
      value: Number(result.value.averagePhraseLength)
    },
    {
      label: "∅Silben/Satz",
      color: '#34d399',
      value: Number(result.value.averageSyllablesPerPhrase)
    },
    {
      label: "Anteil an langen Wörtern",
      color: '#34d399',
      value: Number(result.value.proportionOfLongWords)
    },
  ];
})

async function loadConfig() {
  try {
    const { data } = await client.config.get();
    config.value = data;
  } catch (e: any) {
    console.error(e)
  }
}

async function calculate() {
  loading.value = true
  try {
    const { data } = await client.calculate.post({
      text: text.value,
    });
    result.value = data;
    chartOptions.value = setChartOptions();
    chartData.value = setChartData();
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false
  }
}

const setChartData = () => {
  const documentStyle = getComputedStyle(document.body);

  if (result.value === null) {
    return {
      datasets: []
    };
  }

  const score = Math.round(Number(result.value.score));

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

  const score = result.value === null ? 0 : Math.round(Number(result.value.score));

  return {
    hover: {
      mode: null
    },
    plugins: {
      tooltip: {
        enabled: false
      },
      annotation: result.value === null ? undefined : {
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
  loadConfig();
  chartData.value = setChartData();
  chartOptions.value = setChartOptions();
})
</script>
