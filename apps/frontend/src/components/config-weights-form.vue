<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-2 rounded-md border border-surface-200 p-4">
      <label for="param-alpha" class="text-sm font-medium"
        >Aufschlag &alpha;
        <span class="font-normal text-surface-500">(Stärke der Wortkomplexität)</span></label
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

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div
        v-for="field in weightFields"
        :key="field.id"
        class="flex flex-col gap-2 rounded-md border border-surface-200 p-4"
      >
        <label :for="field.id" class="text-sm font-medium"
          >{{ field.label }}
          <span class="font-normal text-surface-500">{{ field.hint }}</span></label
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
import InputNumber from 'primevue/inputnumber';

// Gemeinsame Eingabemaske für den Aufschlag α und die vier WK-Gewichte
// (Startseite „Erweiterte Einstellungen" und Admin-Konfiguration).
// Die Seiten besitzen den Zustand (v-model) und laden die Standardwerte selbst;
// die Maske zeigt und ändert nur.
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
</script>
