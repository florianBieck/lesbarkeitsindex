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
      <div class="flex flex-col items-center gap-2 w-full">
        <Editor class="w-full" editorStyle="height: 280px; width: 100%;" @text-change="(event) => text = event.textValue"/>
      </div>
    </div>

    <Fieldset legend="Gewichtung für Textkomplexität" :toggleable="true" :collapsed="true">
      <div class="flex flex-col gap-4">
        <div v-if="configLoading" class="text-surface-500 text-sm">Lade Gewichtung…</div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex flex-col gap-2 p-4 border rounded-md">
            <label class="text-sm font-medium">LIX</label>
            <InputNumber v-model="parameterLix" fluid showButtons buttonLayout="horizontal" :step="0.05" :min="0" :max="1" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2">
              <template #incrementbuttonicon>
                <span class="pi pi-plus" />
              </template>
              <template #decrementbuttonicon>
                <span class="pi pi-minus" />
              </template>
            </InputNumber>
          </div>
          <div class="flex flex-col gap-2 p-4 border rounded-md">
            <label class="text-sm font-medium">Anteil an Wörtern mit komplexen Silben (≥3 Vokalgruppen)</label>
            <InputNumber v-model="parameterProportionOfWordsWithComplexSyllables" fluid showButtons buttonLayout="horizontal" :step="0.05" :min="0" :max="1" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2">
              <template #incrementbuttonicon>
                <span class="pi pi-plus" />
              </template>
              <template #decrementbuttonicon>
                <span class="pi pi-minus" />
              </template>
            </InputNumber>
          </div>
          <div class="flex flex-col gap-2 p-4 border rounded-md">
            <label class="text-sm font-medium">Anteil an Wörtern mit Konsonantencluster (Str-, Spr-, -nkt, -cht)</label>
            <InputNumber v-model="parameterProportionOfWordsWithConsonantClusters" fluid showButtons buttonLayout="horizontal" :step="0.05" :min="0" :max="1" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2">
              <template #incrementbuttonicon>
                <span class="pi pi-plus" />
              </template>
              <template #decrementbuttonicon>
                <span class="pi pi-minus" />
              </template>
            </InputNumber>
          </div>
          <div class="flex flex-col gap-2 p-4 border rounded-md">
            <label class="text-sm font-medium">Anteil an Wörtern mit mehrgliedrigen Graphemen (sch, ch, ck, ng, etc.)</label>
            <InputNumber v-model="parameterProportionOfWordsWithMultiMemberedGraphemes" fluid showButtons buttonLayout="horizontal" :step="0.05" :min="0" :max="1" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2">
              <template #incrementbuttonicon>
                <span class="pi pi-plus" />
              </template>
              <template #decrementbuttonicon>
                <span class="pi pi-minus" />
              </template>
            </InputNumber>
          </div>
          <div class="flex flex-col gap-2 p-4 border rounded-md">
            <label class="text-sm font-medium">Anteil an Wörtern mit seltenen Graphemen (ä, ö, ü, ß, c, q, x, y)</label>
            <InputNumber v-model="parameterProportionOfWordsWithRareGraphemes" fluid showButtons buttonLayout="horizontal" :step="0.05" :min="0" :max="1" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2">
              <template #incrementbuttonicon>
                <span class="pi pi-plus" />
              </template>
              <template #decrementbuttonicon>
                <span class="pi pi-minus" />
              </template>
            </InputNumber>
          </div>
        </div>
        <div class="text-sm text-surface-500">Summe der Gewichte: <b>{{ sumWeights.toFixed(2) }}</b> (Hinweis: Die Werte sollten 1 ergeben.)</div>
      </div>
    </Fieldset>

    <div class="flex items-center gap-4">
      <Button :loading="loading" label="Berechnen" icon="pi pi-calculator" class="py-2 rounded-lg" @click="calculate"/>
    </div>
    <result-view v-if="result" :result="result" />
    <div v-else class="text-surface-500">Geben Sie Text ein und klicken Sie auf Berechnen.</div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import Editor from 'primevue/editor'
import InputNumber from 'primevue/inputnumber'
import Fieldset from 'primevue/fieldset'
import { type Treaty, treaty } from '@elysiajs/eden'
import type { App } from '../../../backend/src'
import ResultView from '~/components/result-view.vue'

const runtime = useRuntimeConfig()
const apiBase = runtime.public.apiBase
const client = treaty<App>(apiBase, {
  fetch: {
    credentials: 'include',
  },
})
type ResultData = Treaty.Data<typeof client.calculate.post>

const text = ref('')
const loading = ref(false)
const result = ref<ResultData | null>(null)

const configLoading = ref(true)
const parameterLix = ref(0.6)
const parameterProportionOfWordsWithComplexSyllables = ref(0.2)
const parameterProportionOfWordsWithConsonantClusters = ref(0.05)
const parameterProportionOfWordsWithMultiMemberedGraphemes = ref(0.1)
const parameterProportionOfWordsWithRareGraphemes = ref(0.05)

const sumWeights = computed(() => {
  return parameterLix.value
    + parameterProportionOfWordsWithComplexSyllables.value
    + parameterProportionOfWordsWithConsonantClusters.value
    + parameterProportionOfWordsWithMultiMemberedGraphemes.value
    + parameterProportionOfWordsWithRareGraphemes.value
})

async function loadConfig() {
  configLoading.value = true
  try {
    const { data } = await client.config.get()
    if (data) {
      parameterLix.value = Number(data.parameterLix)
      parameterProportionOfWordsWithComplexSyllables.value = Number(data.parameterProportionOfWordsWithComplexSyllables)
      parameterProportionOfWordsWithConsonantClusters.value = Number(data.parameterProportionOfWordsWithConsonantClusters)
      parameterProportionOfWordsWithMultiMemberedGraphemes.value = Number(data.parameterProportionOfWordsWithMultiMemberedGraphemes)
      parameterProportionOfWordsWithRareGraphemes.value = Number(data.parameterProportionOfWordsWithRareGraphemes)
    }
  }
  catch (e) {
    console.error('Failed to load config defaults:', e)
  }
  finally {
    configLoading.value = false
  }
}

async function calculate() {
  loading.value = true
  try {
    const { data } = await client.calculate.post({
      text: text.value,
      parameterLix: parameterLix.value,
      parameterProportionOfWordsWithComplexSyllables: parameterProportionOfWordsWithComplexSyllables.value,
      parameterProportionOfWordsWithConsonantClusters: parameterProportionOfWordsWithConsonantClusters.value,
      parameterProportionOfWordsWithMultiMemberedGraphemes: parameterProportionOfWordsWithMultiMemberedGraphemes.value,
      parameterProportionOfWordsWithRareGraphemes: parameterProportionOfWordsWithRareGraphemes.value,
    })
    result.value = data
  }
  catch (e) {
    console.error(e)
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  loadConfig()
})
</script>
