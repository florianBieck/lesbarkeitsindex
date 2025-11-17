<template>
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <div class="text-xl font-semibold">Gewichtung für Textkomplexität</div>
        <div class="text-sm text-surface-500" v-if="updatedAt">Zuletzt aktualisiert: {{ new Date(updatedAt).toLocaleString() }}</div>
      </div>

      <div v-if="config" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex flex-col gap-2 p-4 border rounded-md">
          <label>Anzahl Wörter</label>
          <InputNumber v-model="config.parameterCountWords" inputClass="w-full" :step="0.05" :min="0" :max="1" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2" />
        </div>
        <div class="flex flex-col gap-2 p-4 border rounded-md">
          <label>Anzahl Sätze</label>
          <InputNumber v-model="config.parameterCountPhrases" inputClass="w-full" :step="0.05" :min="0" :max="1" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2" />
        </div>
        <div class="flex flex-col gap-2 p-4 border rounded-md">
          <label>Ø Satzlänge</label>
          <InputNumber v-model="config.parameterAveragePhraseLength" inputClass="w-full" :step="0.05" :min="0" :max="1" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2" />
        </div>
        <div class="flex flex-col gap-2 p-4 border rounded-md">
          <label>Lange Wörter (%)</label>
          <InputNumber v-model="config.parameterProportionOfLongWords" inputClass="w-full" :step="0.05" :min="0" :max="1" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2" />
        </div>
        <div class="flex flex-col gap-2 p-4 border rounded-md">
          <label>Silben je Wort</label>
          <InputNumber v-model="config.parameterAverageSyllablesPerWord" inputClass="w-full" :step="0.05" :min="0" :max="1" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2" />
        </div>
        <div class="flex flex-col gap-2 p-4 border rounded-md">
          <label>Ø Wortlänge</label>
          <InputNumber v-model="config.parameterAverageWordLength" inputClass="w-full" :step="0.05" :min="0" :max="1" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2" />
        </div>
      </div>

      <div class="flex items-center gap-2">
        <Button :loading="saving" label="Speichern" icon="pi pi-save" @click="save" />
        <Button label="Neu laden" icon="pi pi-refresh" severity="secondary" text @click="loadConfig" />
        <div class="text-sm text-surface-500">Summe der Gewichte: <b>{{ sumWeights.toFixed(2) }}</b> (Hinweis: Die Werte müssen nicht 1 ergeben.)</div>
      </div>

      <div class="text-sm text-surface-500">{{ message }}</div>
    </div>
</template>
<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import {useAuthClient} from "~/composables/useAuthClient";
import type { App } from '../../../backend/src'
import {treaty} from "@elysiajs/eden";
import type {Treaty} from "@elysiajs/eden";

const runtime = useRuntimeConfig();
const apiBase = runtime.public.apiBase;

const client = treaty<App>(apiBase, {
  fetch: {
    credentials: 'include'
  }
});
type ConfigData = Treaty.Data<typeof client.config.get>

const authClient = useAuthClient();
const session = authClient.useSession();

const saving = ref(false)
const message = ref('')
const updatedAt = ref<string | null>(null)
const config = ref<ConfigData | null>(null);

const sumWeights = computed<Number>(() => {
  if (!config.value) {
    return 0;
  }
  return Number.parseFloat(`${config.value.parameterCountWords}`);
})

async function loadConfig() {
  try {
    const { data } = await client.config.get();
    config.value = data;
    updatedAt.value = new Date().toLocaleString();
  } catch (e: any) {
    message.value = e?.data?.message || 'Konnte Konfiguration nicht laden.'
  }
}

async function save() {
  if (config.value) {
    saving.value = true
    message.value = ''
    try {
      const {data} = await client.config.post({
        ...config.value,
        results: [],
      });
      config.value = data;
      message.value = 'Gespeichert.'
    } catch (e: any) {
      message.value = e?.data?.message || 'Speichern fehlgeschlagen.'
    } finally {
      saving.value = false
    }
  }
}

onMounted(async () => {
  await loadConfig()
})
</script>
