<template>
  <div class="bg-surface-50 dark:bg-surface-950 px-6 py-20 md:px-20 lg:px-80">
    <div class="bg-surface-0 dark:bg-surface-900 p-8 md:p-12 shadow-sm rounded-2xl w-full max-w-[70rem] mx-auto flex flex-col gap-8">
      <div class="flex flex-col items-center gap-4">
        <div class="flex items-center gap-4">
          <img src="https://www.beate-lessmann.de/images/lessmann/logo-lessmann.png" />
        </div>
        <div class="flex flex-col items-center gap-2 w-full">
          <div class="text-surface-900 dark:text-surface-0 text-2xl font-semibold leading-tight text-center w-full">Lesbarkeitsindex (LIX)</div>
          <div class="w-full">
            <p class="text-surface-700 dark:text-surface-200 leading-normal">Die Lesbarkeit eines Textes wird beim klassischen LIX über die Anzahl von Wörtern und Sätzen sowie über die durchschnittliche Satzlänge und über den prozentualen Anteil langer Wörter (6 und mehr Buchstaben) berechnet. Für Leselernende spielen weitere Faktoren eine wichtige Rolle. Vor allem die Komplexität von Wörtern erleichtert oder erschwert das Lesen. </p>
            <p class="text-surface-700 dark:text-surface-200 leading-normal">Für die Ermittlung eines Lesbarkeitsindex gibt es verschiedene Onlineverfahren. Ich bin dabei, einen eigenen Lesbarkeitsindex zu definieren, der zusätzlich die Wortkomplexität berücksichtigt. Für eine Erstellung liegen bereits detaillierte Überlegungen vor.</p>
          </div>
        </div>
      </div>
      <div class="flex gap-6 w-full">
        <div class="flex flex-col items-center gap-2 w-full">
          <Editor v-model="text" class="w-full" editorStyle="height: 320px; width: 100%;" />
        </div>
      </div>
      <Button label="Berechnen" icon="pi pi-user" class="w-full py-2 rounded-lg flex justify-center items-center gap-2">
        <template #icon>
          <i class="pi pi-user text-base! leading-normal!" />
        </template>
      </Button>
      <div class="card">
        <MeterGroup :value="result" />
      </div>
      <div class="card" v-show="false">
        <canvas ref="canvas" height="400" width="400" />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Editor from 'primevue/editor';
import MeterGroup from 'primevue/metergroup';
import { ref } from 'vue';
import Chart from 'chart.js/auto';
import { getRelativePosition } from 'chart.js/helpers';

const canvas = ref();

const text = ref('');
const result = ref([
  { label: 'Lange Wörter', color: '#34d399', value: 16 },
  { label: 'Anzahl Wörter', color: '#fbbf24', value: 8 },
  { label: 'Anzahl Sätze', color: '#60a5fa', value: 24 },
  { label: 'Magic', color: '#c084fc', value: 10 }
]);

const data = {
  labels: [
    'Red',
    'Blue',
    'Yellow'
  ],
  datasets: [{
    label: 'My First Dataset',
    data: [300, 50, 100],
    backgroundColor: [
      'rgb(255, 99, 132)',
      'rgb(54, 162, 235)',
      'rgb(255, 205, 86)'
    ],
    hoverOffset: 4
  }]
};
const config = {
  type: 'doughnut',
  data: data,
};

/* const largeWords = computed(() => {

}) */

onMounted(() => {
  const ctx = (canvas.value as HTMLCanvasElement).getContext('2d');
  if (ctx) {
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: data,
      options: {
        onClick: (e) => {
          const canvasPosition = getRelativePosition(e, chart);

          // Substitute the appropriate scale IDs
          const dataX = chart.scales.x?.getValueForPixel(canvasPosition.x);
          const dataY = chart.scales.y?.getValueForPixel(canvasPosition.y);
        }
      }
    });
  }
})
</script>
