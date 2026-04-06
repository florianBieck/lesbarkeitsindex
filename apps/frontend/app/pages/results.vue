<template>
  <div class="flex flex-col gap-4">
    <p class="text-surface-700 leading-normal">Ihre bisherigen Analysen. Klicken Sie auf eine Zeile, um die Details zu sehen.</p>
    <div v-if="errorMessage" class="text-red-600 text-sm font-medium" role="alert">{{ errorMessage }}</div>
    <div class="w-full">
      <DataTable :value="results?.data" :loading="loading" scrollable :selection="selected" selectionMode="single" @row-select="onRowSelectedEvent" paginator lazy :total-records="totalRecords" :first="first" :rows="rowsPerPage" :rowsPerPageOptions="[10]" @page="onPageEvent" aria-label="Bisherige Textanalysen">
        <template #empty>
          <div class="text-center text-surface-500 py-8">
            <p class="text-lg">Noch keine Analysen vorhanden</p>
            <p class="text-sm mt-1">Analysieren Sie einen Text auf der <NuxtLink to="/" class="text-primary hover:underline">Startseite</NuxtLink>.</p>
          </div>
        </template>
        <Column field="createdAt" header="Datum">
          <template #body="slotProps">
            <div class="truncate">{{ dayjs(slotProps.data.createdAt).format('DD.MM.YYYY HH:mm') }}</div>
          </template>
        </Column>
        <Column field="text" header="Text">
          <template #body="slotProps">
            <div class="truncate max-w-[200px] md:max-w-[400px]">{{ slotProps.data.text }}</div>
          </template>
        </Column>
        <Column field="score" header="Ergebnis">
          <template #body="slotProps">
            <div>{{ Math.round(Number(slotProps.data.score) * 100) / 100 }}</div>
          </template>
        </Column>
      </DataTable>
    </div>
    <result-view v-if="selected" :result="selected" />
  </div>
</template>
<script setup lang="ts">
import {ref} from 'vue';
import {useApiClient, type ResultData, type ResultsData} from '~/composables/useApiClient';
import ResultView from "~/components/result-view.vue";
import type {DataTablePageEvent, DataTableRowSelectEvent} from "primevue";
import dayjs from "dayjs";

const client = useApiClient();

const loading = ref(false);
const errorMessage = ref('');
const results = ref<ResultsData | null>(null);
const selected = ref<ResultData | null>(null);
const page = ref(0);
const totalRecords = ref(0);
const rowsPerPage = ref(10);
const first = ref(0);

async function loadResults(pageToLoad: number, limit: number) {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await client.results.get({
      query: {
        page: pageToLoad,
        limit
      }
    });
    results.value = data;
    totalRecords.value = data?.meta.total ?? 0;
  } catch (e) {
    console.error(e);
    errorMessage.value = 'Die Ergebnisse konnten nicht geladen werden. Bitte laden Sie die Seite neu.'
  } finally {
    loading.value = false
  }
}

const onPageEvent = (e: DataTablePageEvent) => {
  first.value = e.first;
  loadResults(e.page, rowsPerPage.value);
}

const onRowSelectedEvent = (e: DataTableRowSelectEvent) => {
  selected.value = e.data as ResultData;
}

onMounted(() => {
  loadResults(page.value, rowsPerPage.value);
})
</script>
