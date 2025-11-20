<template>
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <div class="text-xl font-semibold">Gewichtung für Textkomplexität</div>
        <div class="text-sm text-surface-500" v-if="config">Erstellt am: {{ configCreatedAt }}</div>
      </div>

      <div>
        <Button label="Aktuelle Gewichtung laden" icon="pi pi-refresh" severity="secondary" text @click="loadConfig" />
      </div>

      <div v-if="config" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex flex-col gap-2 p-4 border rounded-md">
          <label>LIX</label>
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
          <label>Anteil an Wörtern mit komplexen Silben (≥3 Vokalgruppen)</label>
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
          <label>Anteil an Wörtern mit Konsonantencluster (Str-, Spr-, -nkt, -cht)</label>
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
          <label>Anteil an Wörtern mit mehrgliedrigen Graphemen (sch, ch, ck, ng, etc.)</label>
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
          <label>Anteil an Wörtern mit seltene Graphemen (ä, ö, ü, ß, c, q, x, y)</label>
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

      <div class="flex items-center gap-2">
        <Button :loading="saving" label="Speichern" icon="pi pi-save" @click="save" />
        <div class="text-sm text-surface-500 ml-auto">Summe der Gewichte: <b>{{ sumWeights.toFixed(2) }}</b> (Hinweis: Die Werte sollten 1 ergeben.)</div>
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
import dayjs from "dayjs";

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
const config = ref<ConfigData | null>(null);

const parameterLix = ref<number>(0);
const parameterProportionOfWordsWithComplexSyllables = ref<number>(0);
const parameterProportionOfWordsWithConsonantClusters = ref<number>(0);
const parameterProportionOfWordsWithMultiMemberedGraphemes = ref<number>(0);
const parameterProportionOfWordsWithRareGraphemes = ref<number>(0);

const sumWeights = computed<Number>(() => {
  if (!config.value) {
    return 0;
  }
  return parameterLix.value
      + parameterProportionOfWordsWithComplexSyllables.value
      + parameterProportionOfWordsWithConsonantClusters.value
      + parameterProportionOfWordsWithMultiMemberedGraphemes.value
      + parameterProportionOfWordsWithRareGraphemes.value;
});

const configCreatedAt = computed(() => {
  if (!config.value) {
    return "";
  }
  return dayjs(config.value.createdAt).format("DD.MM.YYYY HH:mm");
})

async function loadConfig() {
  try {
    const { data } = await client.config.get();
    config.value = data;
    if (data) {
      parameterLix.value = Number(data.parameterLix);
      parameterProportionOfWordsWithComplexSyllables.value = Number(data.parameterProportionOfWordsWithComplexSyllables);
      parameterProportionOfWordsWithConsonantClusters.value = Number(data.parameterProportionOfWordsWithConsonantClusters);
      parameterProportionOfWordsWithMultiMemberedGraphemes.value = Number(data.parameterProportionOfWordsWithMultiMemberedGraphemes);
      parameterProportionOfWordsWithRareGraphemes.value = Number(data.parameterProportionOfWordsWithRareGraphemes);
    }
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
        parameterLix: parameterLix.value,
        parameterProportionOfWordsWithComplexSyllables: parameterProportionOfWordsWithComplexSyllables.value,
        parameterProportionOfWordsWithConsonantClusters: parameterProportionOfWordsWithConsonantClusters.value,
        parameterProportionOfWordsWithMultiMemberedGraphemes: parameterProportionOfWordsWithMultiMemberedGraphemes.value,
        parameterProportionOfWordsWithRareGraphemes: parameterProportionOfWordsWithRareGraphemes.value,
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
