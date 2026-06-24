<template>
  <div class="flex flex-col">
    <h2 class="text-surface-900 text-2xl font-semibold leading-tight mb-3">
      Admin: Konfiguration
    </h2>
    <p class="text-surface-700 leading-normal mb-6">
      Hier wird die Standardkonfiguration des LÜ-LIX gesetzt: der Aufschlag &alpha; und die vier
      WK-Gewichte. Änderungen wirken auf die nächste Analyse.
    </p>

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
        <div class="flex flex-col gap-2 p-4 border rounded-md">
          <label for="weight-complex-syllables" class="text-sm font-medium"
            >Drei- und Mehrsilber
            <span class="text-surface-400 font-normal"
              >(Wörter mit 3 oder mehr Silben)</span
            ></label
          >
          <InputNumber
            id="weight-complex-syllables"
            v-model="weightComplexSyllables"
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
        <div class="flex flex-col gap-2 p-4 border rounded-md">
          <label for="weight-multi-graphemes" class="text-sm font-medium"
            >Mehrgliedrige Grapheme
            <span class="text-surface-400 font-normal">(z.B. sch, ch, ck, ng)</span></label
          >
          <InputNumber
            id="weight-multi-graphemes"
            v-model="weightMultiMemberedGraphemes"
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
        <div class="flex flex-col gap-2 p-4 border rounded-md">
          <label for="weight-rare-graphemes" class="text-sm font-medium"
            >Seltene Grapheme
            <span class="text-surface-400 font-normal">(ä, ö, ü, ß, c, q, x, y)</span></label
          >
          <InputNumber
            id="weight-rare-graphemes"
            v-model="weightRareGraphemes"
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
        <div class="flex flex-col gap-2 p-4 border rounded-md">
          <label for="weight-consonant-clusters" class="text-sm font-medium"
            >Konsonantenlauthäufung
            <span class="text-surface-400 font-normal">(z.B. Str-, Spr-, -nkt)</span></label
          >
          <InputNumber
            id="weight-consonant-clusters"
            v-model="weightConsonantClusters"
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

    <div class="mt-4 text-sm" :class="weightSumIsValid ? 'text-surface-500' : 'text-red-600 font-medium'" role="status">
      Aktuelle Summe der WK-Gewichte: {{ formattedWeightSum }} (Soll: 100)
    </div>

    <div v-if="validationError" class="text-red-600 text-sm font-medium mt-2" role="alert">
      {{ validationError }}
    </div>
    <div v-if="successMessage" class="text-green-700 text-sm font-medium mt-2" role="status">
      {{ successMessage }}
    </div>

    <div class="flex items-center mt-4">
      <Button
        :loading="loading"
        :disabled="!weightSumIsValid"
        label="Konfiguration speichern"
        icon="pi pi-save"
        class="py-3 rounded-lg"
        @click="saveConfig"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import { useApiClient } from '~/composables/useApiClient';

const WEIGHT_SUM_EPSILON = 0.01;
const TARGET_WEIGHT_SUM = 100;

const client = useApiClient();

const alpha = ref(0.3);
const weightComplexSyllables = ref(50);
const weightMultiMemberedGraphemes = ref(25);
const weightRareGraphemes = ref(12.5);
const weightConsonantClusters = ref(12.5);

const loading = ref(false);
const validationError = ref('');
const successMessage = ref('');

const weightSum = computed(
  () =>
    Number(weightComplexSyllables.value) +
    Number(weightMultiMemberedGraphemes.value) +
    Number(weightRareGraphemes.value) +
    Number(weightConsonantClusters.value),
);

const weightSumIsValid = computed(
  () => Math.abs(weightSum.value - TARGET_WEIGHT_SUM) <= WEIGHT_SUM_EPSILON,
);

const formattedWeightSum = computed(() => weightSum.value.toFixed(2).replace(/\.?0+$/, ''));

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

async function saveConfig() {
  validationError.value = '';
  successMessage.value = '';

  if (!weightSumIsValid.value) {
    validationError.value = `Die Summe der vier WK-Gewichte muss 100 ergeben (aktuell: ${formattedWeightSum.value}).`;
    return;
  }

  loading.value = true;
  try {
    await client.updateConfig({
      alpha: Number(alpha.value),
      weightComplexSyllables: Number(weightComplexSyllables.value),
      weightMultiMemberedGraphemes: Number(weightMultiMemberedGraphemes.value),
      weightRareGraphemes: Number(weightRareGraphemes.value),
      weightConsonantClusters: Number(weightConsonantClusters.value),
    });
    successMessage.value = 'Konfiguration gespeichert. Die nächste Analyse verwendet die neuen Werte.';
  } catch (e) {
    console.error(e);
    validationError.value = 'Speichern fehlgeschlagen. Bitte versuchen Sie es erneut.';
  } finally {
    loading.value = false;
  }
}

defineExpose({ saveConfig, weightSum, weightSumIsValid });
</script>
