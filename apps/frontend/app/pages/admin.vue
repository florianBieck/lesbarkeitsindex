<template>
  <div class="px-6 py-8 md:px-20 lg:px-80">
    <div class="bg-surface-0 dark:bg-surface-900 p-8 md:p-12 shadow-sm rounded-2xl w-full max-w-[50rem] mx-auto flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <div class="text-xl font-semibold">Gewichtung für Textkomplexität</div>
        <div class="text-sm text-surface-500" v-if="updatedAt">Zuletzt aktualisiert: {{ new Date(updatedAt).toLocaleString() }}</div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex flex-col gap-2 p-4 border rounded-md">
          <label>Anzahl Wörter</label>
          <InputNumber v-model="form.wordCount" inputClass="w-full" :step="0.05" :min="0" :max="1" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2" />
        </div>
        <div class="flex flex-col gap-2 p-4 border rounded-md">
          <label>Anzahl Sätze</label>
          <InputNumber v-model="form.sentenceCount" inputClass="w-full" :step="0.05" :min="0" :max="1" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2" />
        </div>
        <div class="flex flex-col gap-2 p-4 border rounded-md">
          <label>Ø Satzlänge</label>
          <InputNumber v-model="form.avgSentenceLength" inputClass="w-full" :step="0.05" :min="0" :max="1" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2" />
        </div>
        <div class="flex flex-col gap-2 p-4 border rounded-md">
          <label>Lange Wörter (%)</label>
          <InputNumber v-model="form.longWordPercent" inputClass="w-full" :step="0.05" :min="0" :max="1" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2" />
        </div>
        <div class="flex flex-col gap-2 p-4 border rounded-md">
          <label>Silben je Wort</label>
          <InputNumber v-model="form.syllablesPerWord" inputClass="w-full" :step="0.05" :min="0" :max="1" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2" />
        </div>
        <div class="flex flex-col gap-2 p-4 border rounded-md">
          <label>Vokabularanteil</label>
          <InputNumber v-model="form.uniqueWordRatio" inputClass="w-full" :step="0.05" :min="0" :max="1" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2" />
        </div>
      </div>

      <div class="flex items-center gap-2">
        <Button :loading="saving" label="Speichern" icon="pi pi-save" @click="save" />
        <Button label="Neu laden" icon="pi pi-refresh" severity="secondary" text @click="loadConfig" />
        <div class="text-sm text-surface-500">Summe der Gewichte: <b>{{ sumWeights.toFixed(2) }}</b> (Hinweis: Die Werte müssen nicht 1 ergeben.)</div>
      </div>

      <div class="text-sm text-surface-500">{{ message }}</div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import {useAuthClient} from "~/composables/useAuthClient";

const runtime = useRuntimeConfig()
const apiBase = runtime.public.apiBase
const client = useAuthClient();
const session = client.useSession();

const saving = ref(false)
const message = ref('')
const updatedAt = ref<string | null>(null)

const form = reactive({
  wordCount: 0,
  sentenceCount: 0,
  avgSentenceLength: 0,
  longWordPercent: 0,
  syllablesPerWord: 0,
  uniqueWordRatio: 0
})

const sumWeights = computed(() => Object.values(form).reduce((a: number, b: any) => a + Number(b || 0), 0))

async function loadConfig() {
  try {
    const cfg: any = await $fetch(`${apiBase}/config`, { credentials: 'include' })
    Object.assign(form, cfg.weights)
    updatedAt.value = cfg.updatedAt
  } catch (e: any) {
    message.value = e?.data?.message || 'Konnte Konfiguration nicht laden.'
  }
}

async function save() {
  saving.value = true
  message.value = ''
  try {
    const updated: any = await $fetch(`${apiBase}/config`, {
      method: 'POST',
      credentials: 'include',
      body: { ...form }
    })
    Object.assign(form, updated.weights)
    updatedAt.value = updated.updatedAt
    message.value = 'Gespeichert.'
  } catch (e: any) {
    message.value = e?.data?.message || 'Speichern fehlgeschlagen.'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await loadConfig()
})
</script>
