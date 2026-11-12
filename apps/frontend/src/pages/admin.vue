<template>
  <div class="flex flex-col">
    <h2 class="mb-3 text-2xl leading-tight font-semibold text-surface-900">Admin: Konfiguration</h2>
    <p class="mb-6 leading-normal text-surface-700">
      Hier wird die Standardkonfiguration des LÜ-LIX gesetzt: der Aufschlag &alpha; und die vier
      WK-Gewichte. Änderungen wirken auf die nächste Analyse.
    </p>

    <ConfigWeightsForm
      v-model:alpha="alpha"
      v-model:weight-complex-syllables="weightComplexSyllables"
      v-model:weight-multi-membered-graphemes="weightMultiMemberedGraphemes"
      v-model:weight-rare-graphemes="weightRareGraphemes"
      v-model:weight-consonant-clusters="weightConsonantClusters"
    />

    <div
      class="mt-4 text-sm"
      :class="weightSumIsValid ? 'text-surface-500' : 'font-medium text-red-600'"
      role="status"
    >
      Aktuelle Summe der WK-Gewichte: {{ formattedWeightSum }} (Soll: 100)
    </div>

    <div v-if="validationError" class="mt-2 text-sm font-medium text-red-600" role="alert">
      {{ validationError }}
    </div>
    <div v-if="successMessage" class="mt-2 text-sm font-medium text-green-700" role="status">
      {{ successMessage }}
    </div>

    <div class="mt-4 flex items-center">
      <Button
        :loading="loading"
        :disabled="!weightSumIsValid"
        label="Konfiguration speichern"
        icon="pi pi-save"
        @click="saveConfig"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import Button from 'primevue/button';
import { computed, ref } from 'vue';
import ConfigWeightsForm from '@/components/config-weights-form.vue';
import { useApiClient } from '@/composables/useApiClient';

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
    successMessage.value =
      'Konfiguration gespeichert. Die nächste Analyse verwendet die neuen Werte.';
  } catch (e) {
    console.error(e);
    validationError.value = 'Speichern fehlgeschlagen. Bitte versuchen Sie es erneut.';
  } finally {
    loading.value = false;
  }
}

defineExpose({ saveConfig, weightSum, weightSumIsValid });
</script>
