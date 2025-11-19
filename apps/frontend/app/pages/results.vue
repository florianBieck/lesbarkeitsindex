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
    <div class="w-full">
      <DataTable :value="results?.data" scrollable :selection="selected" selectionMode="single" @row-select="onRowSelectedEvent" paginator :rows="5" :rowsPerPageOptions="[5, 10, 20, 50]" @page="onPageEvent">
        <Column field="id" header="ID">
          <template #body="slotProps">
            <div class="truncate max-w-[300px] min-w-[150px]">{{ slotProps.data.id }}</div>
          </template>
        </Column>
        <Column field="text" header="Text">
          <template #body="slotProps">
            <div class="truncate max-w-[400px] min-w-[250px]">{{ slotProps.data.text }}</div>
          </template>
        </Column>
        <Column field="score" header="LÜ-LIX">
          <template #body="slotProps">
            <div class="truncate max-w-[50px] min-w-[75px]">{{ Math.round(Number(slotProps.data.score) * 100) / 100 }}</div>
          </template>
        </Column>
        <Column field="hashText" header="Hash">
          <template #body="slotProps">
            <div class="truncate text-xs max-w-[100px] min-w-[50px]">{{ slotProps.data.hashText }}</div>
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
import type {DataTablePageEvent, DataTableRowSelectEvent} from "primevue";

const runtime = useRuntimeConfig();
const apiBase = runtime.public.apiBase;
const client = treaty<App>(apiBase, {
  fetch: {
    credentials: 'include'
  }
});
type ResultData = Treaty.Data<typeof client.calculate.post>
type ResultsData = Treaty.Data<typeof client.results.get>

const loading = ref(false);
const results = ref<ResultsData | null>(null);
const selected = ref<ResultData | null>(null);
const page = ref(1);
const totalRecords = ref(0);
const rowsPerPage = ref(10);

async function loadResults(pageToLoad: number, limit: number) {
  loading.value = true
  try {
    const { data } = await client.results.get({
      query: {
        page: pageToLoad <= 0 ? 1 : pageToLoad,
        limit
      }
    });
    results.value = data;
    totalRecords.value = data?.meta.total ?? 0;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false
  }
}

const onPageEvent = (e: DataTablePageEvent) => {
  // rowsPerPage.value = e.rows;
  loadResults(e.page, rowsPerPage.value);
}

const onRowSelectedEvent = (e: DataTableRowSelectEvent) => {
  // rowsPerPage.value = e.rows;
  selected.value = e.data as ResultData;
}

onMounted(() => {
  loadResults(page.value, rowsPerPage.value);
})
</script>
