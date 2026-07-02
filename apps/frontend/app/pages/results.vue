<template>
  <div class="flex flex-col gap-4">
    <p class="text-surface-700 leading-normal">
      Ihre bisherigen Analysen. Klicken Sie auf eine Zeile, um die Details zu sehen.
    </p>
    <div v-if="errorMessage" class="text-red-600 text-sm font-medium" role="alert">
      {{ errorMessage }}
    </div>
    <div class="w-full">
      <DataTable
        :value="results?.data"
        :loading="loading"
        scrollable
        :selection="selected"
        selectionMode="single"
        @row-select="onRowSelectedEvent"
        paginator
        lazy
        :total-records="totalRecords"
        :first="first"
        :rows="PAGE_SIZE"
        @page="onPageEvent"
        aria-label="Bisherige Textanalysen"
      >
        <template #empty>
          <div class="text-center text-surface-500 py-8">
            <p class="text-lg">Noch keine Analysen vorhanden</p>
            <p class="text-sm mt-1">
              Analysieren Sie einen Text auf der
              <NuxtLink to="/" class="text-primary hover:underline">Startseite</NuxtLink>.
            </p>
          </div>
        </template>
        <Column field="createdAt" header="Datum">
          <template #body="slotProps">
            <div class="truncate">
              {{ formatDate(slotProps.data.createdAt) }}
            </div>
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
    <ResultView v-if="selected" :result="selected" />
  </div>
</template>
<script setup lang="ts">
import type { ResultData, ResultsData } from '~/composables/useApiClient';
import type { DataTablePageEvent, DataTableRowSelectEvent } from 'primevue';

const client = useApiClient();

// Feste Seitengröße — die Tabelle bot ohnehin nur „10" zur Auswahl an.
const PAGE_SIZE = 10;

const loading = ref(false);
const errorMessage = ref('');
const results = ref<ResultsData | null>(null);
const selected = ref<ResultData | null>(null);
const totalRecords = ref(0);
const first = ref(0);

// Natives de-DE-Format, z.B. „02.07.2026, 14:30" (bewusst mit Komma).
const formatDate = (iso: string): string =>
  new Date(iso).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

async function loadResults(pageToLoad: number) {
  loading.value = true;
  errorMessage.value = '';
  try {
    const data = await client.getResults({
      page: pageToLoad,
      limit: PAGE_SIZE,
    });
    results.value = data;
    totalRecords.value = data.meta.total;
  } catch (e) {
    console.error(e);
    errorMessage.value =
      'Die Ergebnisse konnten nicht geladen werden. Bitte laden Sie die Seite neu.';
  } finally {
    loading.value = false;
  }
}

const onPageEvent = (e: DataTablePageEvent) => {
  first.value = e.first;
  loadResults(e.page);
};

const onRowSelectedEvent = (e: DataTableRowSelectEvent) => {
  selected.value = e.data as ResultData;
};

onMounted(() => {
  loadResults(0);
});
</script>
