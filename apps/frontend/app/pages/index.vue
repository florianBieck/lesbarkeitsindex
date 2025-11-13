<template>
  <div class="bg-surface-50 dark:bg-surface-950 px-6 py-8 md:px-20 lg:px-80">
    <div class="bg-surface-0 dark:bg-surface-900 p-8 md:p-12 shadow-sm rounded-2xl w-full max-w-[70rem] mx-auto flex flex-col gap-8">
      <div class="flex flex-col items-center gap-4">
        <div class="flex items-center gap-4">
          <img src="https://www.beate-lessmann.de/images/lessmann/logo-lessmann.png" alt="Logo" />
        </div>
        <div class="flex flex-col items-center gap-2 w-full">
          <div class="text-surface-900 dark:text-surface-0 text-2xl font-semibold leading-tight text-center w-full">Lesbarkeitsindex (LIX)</div>
          <div class="w-full">
            <p class="text-surface-700 dark:text-surface-200 leading-normal">Die Lesbarkeit eines Textes wird beim klassischen LIX über die Anzahl von Wörtern und Sätzen sowie über die durchschnittliche Satzlänge und über den prozentualen Anteil langer Wörter (6 und mehr Buchstaben) berechnet. Für Leselernende spielen weitere Faktoren eine wichtige Rolle. Vor allem die Komplexität von Wörtern erleichtert oder erschwert das Lesen.</p>
            <p class="text-surface-700 dark:text-surface-200 leading-normal">Dieser Prototyp berechnet eine Erweiterung mit 6 Parametern. Unten sehen Sie die Aufteilung der Teilwerte.</p>
          </div>
        </div>
      </div>
      <div class="flex gap-6 w-full">
        <div class="flex flex-col items-center gap-2 w-full">
          <Editor v-model="text" class="w-full" editorStyle="height: 280px; width: 100%;" />
        </div>
      </div>
      <div class="flex items-center gap-4">
        <Button :loading="loading" label="Berechnen" icon="pi pi-calculator" class="py-2 rounded-lg" @click="calculate" />
        <Button label="Gewichte neu laden" icon="pi pi-refresh" severity="secondary" text @click="loadPublicConfig" />
      </div>
      <div v-if="result" class="card flex flex-col gap-4">
        <div class="font-semibold text-lg">Ergebnis</div>
        <MeterGroup :value="meters" />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 border rounded-md">
            <div class="font-medium mb-2">Aufschlüsselung (Beitrag in %)</div>
            <ul class="space-y-1">
              <li v-for="c in result.contributions" :key="c.key" class="flex justify-between">
                <span>{{ labelMap[c.key] }} (Gewicht {{ c.weight.toFixed(2) }}, norm {{ c.normalized.toFixed(2) }})</span>
                <span class="font-semibold">{{ c.contribution.toFixed(1) }}%</span>
              </li>
            </ul>
            <div class="mt-2 text-right font-bold">Gesamt: {{ result.total.toFixed(1) }}%</div>
          </div>
          <div class="p-4 border rounded-md">
            <div class="font-medium mb-2">Rohwerte</div>
            <ul class="space-y-1">
              <li>Wörter: {{ result.stats.wordCount }}</li>
              <li>Sätze: {{ result.stats.sentenceCount }}</li>
              <li>Ø Satzlänge: {{ result.stats.avgSentenceLength.toFixed(2) }}</li>
              <li>Lange Wörter (%): {{ result.stats.longWordPercent.toFixed(2) }}</li>
              <li>Silben je Wort: {{ result.stats.syllablesPerWord.toFixed(2) }}</li>
              <li>Vokabularanteil: {{ (result.stats.uniqueWordRatio * 100).toFixed(1) }}%</li>
            </ul>
          </div>
        </div>
      </div>
      <div v-else class="text-surface-500">Geben Sie Text ein und klicken Sie auf Berechnen.</div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import Editor from 'primevue/editor'
import MeterGroup from 'primevue/metergroup'

const text = ref('')
const loading = ref(false)
const result = ref<any | null>(null)
const weights = ref<Record<string, number>>({})

const labelMap: Record<string, string> = {
  wordCount: 'Anzahl Wörter',
  sentenceCount: 'Anzahl Sätze',
  avgSentenceLength: 'Ø Satzlänge',
  longWordPercent: 'Lange Wörter %',
  syllablesPerWord: 'Silben/Wort',
  uniqueWordRatio: 'Vokabularanteil'
}

const meters = computed(() => {
  if (!result.value) return []
  const colors = ['#34d399', '#fbbf24', '#60a5fa', '#c084fc', '#f87171', '#10b981']
  return result.value.contributions.map((c: any, i: number) => ({
    label: labelMap[c.key] || c.key,
    color: colors[i % colors.length],
    value: Number(c.contribution.toFixed(1))
  }))
})

const runtime = useRuntimeConfig()
const apiBase = runtime.public.apiBase

async function loadPublicConfig() {
  try {
    const res = await $fetch(`${apiBase}/config`, { credentials: 'include' })
    // @ts-ignore
    weights.value = res.weights || {}
  } catch (e) {
    console.error(e)
  }
}

async function calculate() {
  loading.value = true
  try {
    result.value = await $fetch(`${apiBase}/score`, {
      method: 'POST',
      credentials: 'include',
      body: { text: text.value }
    })
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPublicConfig()
})
</script>
