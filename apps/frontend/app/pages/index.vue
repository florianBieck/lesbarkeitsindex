<template>
  <div class="flex flex-col">
    <p class="text-surface-700 leading-normal mb-3">
      Fügen Sie einen Text ein, um seine Lesbarkeit zu analysieren. Der LÜ-LIX kombiniert den
      klassischen Lesbarkeitsindex (LIX) mit einem Aufschlag für die Wortkomplexität.
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
          Der Aufschlag &alpha; steuert, wie stark die Wortkomplexität (WK) den LIX erhöht (LÜ-LIX =
          LIX + &alpha;&middot;WK). Die vier Gewichte verteilen die WK auf ihre Komponenten.
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
import { ref, defineAsyncComponent } from 'vue';
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

// Aufschlagsmodell-Parameter (Startwerte gemäß ADR 0001 / Seed).
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
