<template>
  <div class="flex flex-col gap-4">
    <div class="w-full">
      <p class="text-surface-700 dark:text-surface-200 leading-normal">Die Lesbarkeit eines Textes wird beim klassischen
        LIX über die Anzahl von Wörtern und Sätzen sowie über die durchschnittliche Satzlänge und über den prozentualen
        Anteil langer Wörter (6 und mehr Buchstaben) berechnet. Für Leselernende spielen weitere Faktoren eine wichtige
        Rolle. Vor allem die Komplexität von Wörtern erleichtert oder erschwert das Lesen.</p>
      <p class="text-surface-700 dark:text-surface-200 leading-normal">Dieser Prototyp berechnet eine Erweiterung mit verschiedenen
        Parametern. Unten sehen Sie die Aufteilung der Teilwerte.</p>
    </div>
    <div class="flex gap-6 w-full">
      <DataTable :value="results" tableStyle="min-width: 50rem">
        <Column field="id" header="ID">
          <template #body="slotProps">
            <div class="truncate max-w-[100px]">{{ slotProps.data.id }}</div>
          </template>
        </Column>
        <Column field="text" header="Text">
          <template #body="slotProps">
            <div class="truncate max-w-[200px]">{{ slotProps.data.text }}</div>
          </template>
        </Column>
        <Column field="score" header="LÜ-LIX"></Column>
        <Column field="hashText" header="Hash">
          <template #body="slotProps">
            <div class="truncate text-xs max-w-[100px]">{{ slotProps.data.hashText }}</div>
          </template>
        </Column>
      </DataTable>
    </div>
    <result-view v-if="selected" :result="selected" />
  </div>
</template>
<script setup lang="ts">
import {ref} from 'vue';
import Button from 'primevue/button';
import Editor from 'primevue/editor';
import {type Treaty, treaty} from "@elysiajs/eden";
import type {App} from "../../../backend/src";
import ResultView from "~/components/result-view.vue";

const client = treaty<App>('localhost:3000', {
  fetch: {
    credentials: 'include'
  }
});
type ResultData = Treaty.Data<typeof client.calculate.post>
type ResultsData = Treaty.Data<typeof client.results.get>

const loading = ref(false);
const results = ref<ResultsData | null>(null);
const selected = ref<ResultData | null>(null);

async function loadResults() {
  loading.value = true
  try {
    const { data } = await client.results.get();
    results.value = data;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadResults();
})
</script>
