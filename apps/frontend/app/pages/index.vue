<template>
  <div class="flex flex-col">
    <p class="text-surface-700 leading-normal mb-3">
      Fügen Sie einen Text ein, um seine Lesbarkeit zu analysieren. Der LÜ-LIX kombiniert den
      klassischen Lesbarkeitsindex (LIX) mit einem Aufschlag für die Wortkomplexität.
    </p>
    <Textarea
      v-model="text"
      class="w-full"
      style="height: 280px"
      aria-label="Text zur Lesbarkeitsanalyse eingeben"
    />

    <!-- Texttyp-Schalter (ADR 0002): heuristisch erkannt, manuell übersteuerbar -->
    <div class="mt-4 flex items-center flex-wrap gap-3">
      <label class="text-sm font-medium text-surface-700">Texttyp</label>
      <SelectButton
        v-model="textType"
        :options="textTypeOptions"
        optionLabel="label"
        optionValue="value"
        :allowEmpty="false"
        aria-label="Texttyp wählen"
      />
      <span v-if="textType === detectedTextType" class="text-xs text-surface-500">
        automatisch erkannt als
        {{ detectedTextType === 'list' ? 'Liste' : 'Fließtext' }}
      </span>
      <span v-else class="text-xs text-surface-500">
        manuell übersteuert (automatisch erkannt:
        {{ detectedTextType === 'list' ? 'Liste' : 'Fließtext' }})
      </span>
    </div>

    <div class="mt-4">
      <Fieldset legend="Erweiterte Einstellungen" :toggleable="true" :collapsed="true">
        <p class="text-sm text-surface-500 mb-4">
          Der Aufschlag &alpha; steuert, wie stark die Wortkomplexität (WK) den LIX erhöht (LÜ-LIX =
          LIX + &alpha;&middot;WK). Die vier Gewichte verteilen die WK auf ihre Komponenten.
        </p>
        <ConfigWeightsForm
          v-model:alpha="alpha"
          v-model:weight-complex-syllables="weightComplexSyllables"
          v-model:weight-multi-membered-graphemes="weightMultiMemberedGraphemes"
          v-model:weight-rare-graphemes="weightRareGraphemes"
          v-model:weight-consonant-clusters="weightConsonantClusters"
        />
      </Fieldset>
    </div>

    <div v-if="validationError" class="text-red-600 text-sm font-medium mt-4" role="alert">
      {{ validationError }}
    </div>
    <div class="flex items-start gap-2 mt-4">
      <Checkbox v-model="saveResult" inputId="save-consent" :binary="true" />
      <label for="save-consent" class="text-sm text-surface-600 cursor-pointer leading-tight">
        Ich akzeptiere die Speicherung meiner Anfrage zur Verbesserung des Lübecker Lesbarkeitsindex
      </label>
    </div>
    <div class="flex items-center mt-3">
      <Button
        :loading="loading"
        label="Text analysieren"
        icon="pi pi-calculator"
        class="py-3 rounded-lg"
        @click="calculate"
      />
    </div>

    <!-- Results area — generous separation from input controls -->
    <div class="mt-10">
      <result-view v-if="result" :result="result" />
      <div v-else class="text-center text-surface-500 py-8 border-t border-surface-100">
        <p class="text-lg mt-4">Noch kein Text analysiert</p>
        <p class="text-sm mt-1">
          Fügen Sie oben einen Text ein und klicken Sie auf &bdquo;Text analysieren&ldquo;.
        </p>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Button from 'primevue/button';
import Fieldset from 'primevue/fieldset';
import Checkbox from 'primevue/checkbox';
import SelectButton from 'primevue/selectbutton';
import { detectTextType, type TextType } from '@lesbarkeitsindex/api-client';
import { useApiClient, type ResultData } from '~/composables/useApiClient';
import ResultView from '~/components/result-view.vue';

const client = useApiClient();

const text = ref('');
const loading = ref(false);
const result = ref<ResultData | null>(null);
const validationError = ref('');
const saveResult = ref(false);

// Texttyp-Erkennung (ADR 0002): die Heuristik aktualisiert sich beim Tippen,
// der Nutzer kann den Wert übersteuern. Der Override geht mit der Anfrage mit.
const detectedTextType = ref<TextType>('prose');
const textType = ref<TextType>('prose');
const userOverrode = ref(false);
const textTypeOptions = [
  { label: 'Fließtext', value: 'prose' as TextType },
  { label: 'Liste', value: 'list' as TextType },
];

watch(text, (next) => {
  const detected = detectTextType(next);
  detectedTextType.value = detected;
  // Solange der Nutzer nicht selbst gewechselt hat, folgt die Auswahl der Heuristik.
  if (!userOverrode.value) textType.value = detected;
});

watch(textType, (next, prev) => {
  if (prev !== undefined && next !== detectedTextType.value) {
    userOverrode.value = true;
  }
});

// Aufschlagsmodell-Parameter — die gemeinsame Eingabemaske (ConfigWeightsForm)
// hydriert die Werte beim Mount aus der gespeicherten Admin-Konfiguration.
const alpha = ref(0.3);
const weightComplexSyllables = ref(50);
const weightMultiMemberedGraphemes = ref(25);
const weightRareGraphemes = ref(12.5);
const weightConsonantClusters = ref(12.5);

async function calculate() {
  validationError.value = '';

  if (!text.value.trim()) {
    validationError.value = 'Bitte geben Sie einen Text ein.';
    return;
  }

  loading.value = true;
  try {
    const data = await client.calculate({
      text: text.value,
      saveResult: saveResult.value,
      alpha: alpha.value,
      weightComplexSyllables: weightComplexSyllables.value,
      weightMultiMemberedGraphemes: weightMultiMemberedGraphemes.value,
      weightRareGraphemes: weightRareGraphemes.value,
      weightConsonantClusters: weightConsonantClusters.value,
      textType: textType.value,
    });
    result.value = data;
  } catch (e) {
    console.error(e);
    validationError.value = 'Die Berechnung ist fehlgeschlagen. Bitte versuchen Sie es erneut.';
  } finally {
    loading.value = false;
  }
}

// Für Tests, die den effektiven Zustand und die Aktion auslesen.
defineExpose({ text, textType, detectedTextType, calculate });
</script>
