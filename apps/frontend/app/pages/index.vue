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
    <div class="flex items-center gap-4">
      <Button :loading="loading" label="Berechnen" icon="pi pi-calculator" class="py-2 rounded-lg" @click="calculate"/>
    </div>
    <result-view v-if="result" :result="result" />
    <div v-else class="text-surface-500">Geben Sie Text ein und klicken Sie auf Berechnen.</div>
  </div>
</template>
<script setup lang="ts">
import {ref} from 'vue';
import Button from 'primevue/button';
import Editor from 'primevue/editor';
import {type Treaty, treaty} from "@elysiajs/eden";
import type {App} from "../../../backend/src";
import ResultView from "~/components/result-view.vue";

const runtime = useRuntimeConfig();
const apiBase = runtime.public.apiBase;
const client = treaty<App>(apiBase, {
  fetch: {
    credentials: 'include'
  }
});
type ResultData = Treaty.Data<typeof client.calculate.post>

const text = ref('');
const loading = ref(false);
const result = ref<ResultData | null>(null);

async function calculate() {
  loading.value = true
  try {
    const { data } = await client.calculate.post({
      text: text.value,
    });
    result.value = data;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false
  }
}
</script>
