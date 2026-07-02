<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-2 p-4 border rounded-md">
      <label for="param-alpha" class="text-sm font-medium"
        >Aufschlag &alpha;
        <span class="text-surface-400 font-normal">(Stärke der Wortkomplexität)</span></label
      >
      <InputNumber
        id="param-alpha"
        v-model="alpha"
        fluid
        showButtons
        buttonLayout="horizontal"
        :step="0.05"
        :min="0"
        :max="10"
        mode="decimal"
        :minFractionDigits="2"
        :maxFractionDigits="2"
        incrementIcon="pi pi-plus"
        decrementIcon="pi pi-minus"
      />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="field in weightFields"
        :key="field.id"
        class="flex flex-col gap-2 p-4 border rounded-md"
      >
        <label :for="field.id" class="text-sm font-medium"
          >{{ field.label }}
          <span class="text-surface-400 font-normal">{{ field.hint }}</span></label
        >
        <InputNumber
          :id="field.id"
          v-model="field.model.value"
          fluid
          showButtons
          buttonLayout="horizontal"
          :step="5"
          :min="0"
          mode="decimal"
          :minFractionDigits="0"
          :maxFractionDigits="2"
          incrementIcon="pi pi-plus"
          decrementIcon="pi pi-minus"
        />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted } from 'vue';
import InputNumber from 'primevue/inputnumber';
import { useApiClient } from '~/composables/useApiClient';

// Gemeinsame Eingabemaske für den Aufschlag α und die vier WK-Gewichte
// (Startseite „Erweiterte Einstellungen" und Admin-Konfiguration).
// Die Seiten besitzen den Zustand (v-model); die Maske lädt beim Mount die
// gespeicherte Konfiguration und schreibt sie in die Modelle zurück.
const alpha = defineModel<number>('alpha', { required: true });
const weightComplexSyllables = defineModel<number>('weightComplexSyllables', { required: true });
const weightMultiMemberedGraphemes = defineModel<number>('weightMultiMemberedGraphemes', {
  required: true,
});
const weightRareGraphemes = defineModel<number>('weightRareGraphemes', { required: true });
const weightConsonantClusters = defineModel<number>('weightConsonantClusters', { required: true });

const weightFields = [
  {
    id: 'weight-complex-syllables',
    label: 'Drei- und Mehrsilber',
    hint: '(Wörter mit 3 oder mehr Silben)',
    model: weightComplexSyllables,
  },
  {
    id: 'weight-multi-graphemes',
    label: 'Mehrgliedrige Grapheme',
    hint: '(z.B. sch, ch, ck, ng)',
    model: weightMultiMemberedGraphemes,
  },
  {
    id: 'weight-rare-graphemes',
    label: 'Seltene Grapheme',
    hint: '(ä, ö, ü, ß, c, q, x, y)',
    model: weightRareGraphemes,
  },
  {
    id: 'weight-consonant-clusters',
    label: 'Konsonantenlauthäufung',
    hint: '(z.B. Str-, Spr-, -nkt)',
    model: weightConsonantClusters,
  },
];

const client = useApiClient();

onMounted(async () => {
  try {
    const config = await client.getConfig();
    alpha.value = config.alpha;
    weightComplexSyllables.value = config.weightComplexSyllables;
    weightMultiMemberedGraphemes.value = config.weightMultiMemberedGraphemes;
    weightRareGraphemes.value = config.weightRareGraphemes;
    weightConsonantClusters.value = config.weightConsonantClusters;
  } catch (e) {
    console.error('Konfiguration konnte nicht geladen werden', e);
  }
});
</script>
