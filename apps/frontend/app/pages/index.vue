<template>
  <div class="flex flex-col">
    <p class="text-surface-700 leading-normal mb-3">
      Fügen Sie einen Text ein, um seine Lesbarkeit zu analysieren. Der LÜ-LIX berücksichtigt neben
      der klassischen Satz- und Wortlänge auch die Komplexität von Silben und Graphemen.
    </p>
    <Editor
      class="w-full"
      editorStyle="height: 280px; width: 100%;"
      aria-label="Text zur Lesbarkeitsanalyse eingeben"
      @text-change="(event) => (text = event.textValue)"
    />

    <div class="mt-4">
      <Fieldset legend="Erweiterte Einstellungen" :toggleable="true" :collapsed="true">
        <p class="text-sm text-surface-500 mb-4">
          Passen Sie an, wie stark die einzelnen Faktoren in die Bewertung einfließen. Die Summe
          aller Werte muss 1 ergeben.
        </p>
        <div class="flex flex-col gap-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex flex-col gap-2 p-4 border rounded-md">
              <label for="param-lix" class="text-sm font-medium"
                >Klassischer Lesbarkeitsindex (LIX)</label
              >
              <InputNumber
                id="param-lix"
                v-model="parameterLix"
                fluid
                showButtons
                buttonLayout="horizontal"
                :step="0.05"
                :min="0"
                :max="1"
                mode="decimal"
                :minFractionDigits="2"
                :maxFractionDigits="2"
              >
                <template #incrementbuttonicon>
                  <span class="pi pi-plus" />
                </template>
                <template #decrementbuttonicon>
                  <span class="pi pi-minus" />
                </template>
              </InputNumber>
            </div>
            <div class="flex flex-col gap-2 p-4 border rounded-md">
              <label for="param-complex-syllables" class="text-sm font-medium"
                >Komplexe Silben
                <span class="text-surface-400 font-normal">(Wörter mit 3 oder mehr Silben)</span></label
              >
              <InputNumber
                id="param-complex-syllables"
                v-model="parameterProportionOfWordsWithComplexSyllables"
                fluid
                showButtons
                buttonLayout="horizontal"
                :step="0.05"
                :min="0"
                :max="1"
                mode="decimal"
                :minFractionDigits="2"
                :maxFractionDigits="2"
              >
                <template #incrementbuttonicon>
                  <span class="pi pi-plus" />
                </template>
                <template #decrementbuttonicon>
                  <span class="pi pi-minus" />
                </template>
              </InputNumber>
            </div>
            <div class="flex flex-col gap-2 p-4 border rounded-md">
              <label for="param-consonant-clusters" class="text-sm font-medium"
                >Schwierige Buchstabenfolgen
                <span class="text-surface-400 font-normal">(z.B. Str-, Spr-, -nkt)</span></label
              >
              <InputNumber
                id="param-consonant-clusters"
                v-model="parameterProportionOfWordsWithConsonantClusters"
                fluid
                showButtons
                buttonLayout="horizontal"
                :step="0.05"
                :min="0"
                :max="1"
                mode="decimal"
                :minFractionDigits="2"
                :maxFractionDigits="2"
              >
                <template #incrementbuttonicon>
                  <span class="pi pi-plus" />
                </template>
                <template #decrementbuttonicon>
                  <span class="pi pi-minus" />
                </template>
              </InputNumber>
            </div>
            <div class="flex flex-col gap-2 p-4 border rounded-md">
              <label for="param-multi-graphemes" class="text-sm font-medium"
                >Mehrteilige Buchstabengruppen
                <span class="text-surface-400 font-normal">(z.B. sch, ch, ck, ng)</span></label
              >
              <InputNumber
                id="param-multi-graphemes"
                v-model="parameterProportionOfWordsWithMultiMemberedGraphemes"
                fluid
                showButtons
                buttonLayout="horizontal"
                :step="0.05"
                :min="0"
                :max="1"
                mode="decimal"
                :minFractionDigits="2"
                :maxFractionDigits="2"
              >
                <template #incrementbuttonicon>
                  <span class="pi pi-plus" />
                </template>
                <template #decrementbuttonicon>
                  <span class="pi pi-minus" />
                </template>
              </InputNumber>
            </div>
            <div class="flex flex-col gap-2 p-4 border rounded-md">
              <label for="param-rare-graphemes" class="text-sm font-medium"
                >Seltene Buchstaben
                <span class="text-surface-400 font-normal">(ä, ö, ü, ß, c, q, x, y)</span></label
              >
              <InputNumber
                id="param-rare-graphemes"
                v-model="parameterProportionOfWordsWithRareGraphemes"
                fluid
                showButtons
                buttonLayout="horizontal"
                :step="0.05"
                :min="0"
                :max="1"
                mode="decimal"
                :minFractionDigits="2"
                :maxFractionDigits="2"
              >
                <template #incrementbuttonicon>
                  <span class="pi pi-plus" />
                </template>
                <template #decrementbuttonicon>
                  <span class="pi pi-minus" />
                </template>
              </InputNumber>
            </div>
          </div>
          <div
            class="text-sm"
            :class="
              Math.abs(sumWeights - 1) > 0.01 ? 'text-red-600 font-medium' : 'text-surface-500'
            "
          >
            <span v-if="Math.abs(sumWeights - 1) > 0.01" aria-hidden="true">&#9888; </span>Summe:
            <b>{{ sumWeights.toFixed(2) }}</b>
            <span v-if="Math.abs(sumWeights - 1) > 0.01">&mdash; muss genau 1,00 ergeben</span>
          </div>
        </div>
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
import { ref, computed, defineAsyncComponent } from 'vue';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import Fieldset from 'primevue/fieldset';
import Checkbox from 'primevue/checkbox';

const Editor = defineAsyncComponent(() => import('primevue/editor'));
import { useApiClient, type ResultData } from '~/composables/useApiClient';
import ResultView from '~/components/result-view.vue';

const client = useApiClient();

const text = ref('');
const loading = ref(false);
const result = ref<ResultData | null>(null);
const validationError = ref('');
const saveResult = ref(false);

const parameterLix = ref(0.6);
const parameterProportionOfWordsWithComplexSyllables = ref(0.2);
const parameterProportionOfWordsWithConsonantClusters = ref(0.05);
const parameterProportionOfWordsWithMultiMemberedGraphemes = ref(0.1);
const parameterProportionOfWordsWithRareGraphemes = ref(0.05);

const sumWeights = computed(() => {
  return (
    parameterLix.value +
    parameterProportionOfWordsWithComplexSyllables.value +
    parameterProportionOfWordsWithConsonantClusters.value +
    parameterProportionOfWordsWithMultiMemberedGraphemes.value +
    parameterProportionOfWordsWithRareGraphemes.value
  );
});

async function calculate() {
  validationError.value = '';

  if (!text.value.trim()) {
    validationError.value = 'Bitte geben Sie einen Text ein.';
    return;
  }

  const weightSum = sumWeights.value;
  /* if (Math.abs(weightSum - 1) > 0.01) {
    validationError.value = `Die Summe der Einstellungen muss 1,00 ergeben (aktuell: ${weightSum.toFixed(2)}). Passen Sie die Werte unter „Erweiterte Einstellungen" an.`;
    return;
  } */

  loading.value = true;
  try {
    const data = await client.calculate({
      text: text.value,
      saveResult: saveResult.value,
      parameterLix: parameterLix.value,
      parameterProportionOfWordsWithComplexSyllables:
        parameterProportionOfWordsWithComplexSyllables.value,
      parameterProportionOfWordsWithConsonantClusters:
        parameterProportionOfWordsWithConsonantClusters.value,
      parameterProportionOfWordsWithMultiMemberedGraphemes:
        parameterProportionOfWordsWithMultiMemberedGraphemes.value,
      parameterProportionOfWordsWithRareGraphemes:
        parameterProportionOfWordsWithRareGraphemes.value,
    });
    result.value = data;
  } catch (e) {
    console.error(e);
    validationError.value = 'Die Berechnung ist fehlgeschlagen. Bitte versuchen Sie es erneut.';
  } finally {
    loading.value = false;
  }
}
</script>
