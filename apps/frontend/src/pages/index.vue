<template>
  <div class="flex flex-col">
    <p class="mb-3 leading-normal text-surface-700">
      Fügen Sie einen Text ein, um seine Lesbarkeit zu analysieren. Der LÜ-LIX kombiniert den
      klassischen Lesbarkeitsindex (LIX) mit einem Aufschlag für die Wortkomplexität.
      <RouterLink to="/dokumentation" class="text-primary-700 hover:underline"
        >So wird gerechnet</RouterLink
      >
    </p>
    <Textarea
      v-model="text"
      class="w-full"
      style="height: 280px"
      aria-label="Text zur Lesbarkeitsanalyse eingeben"
    />

    <!-- Texttyp-Schalter (ADR 0002): heuristisch erkannt, manuell übersteuerbar -->
    <div class="mt-4 flex flex-wrap items-center gap-3">
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

    <div
      v-if="configState === 'invalid'"
      class="mt-4 text-sm font-medium text-red-600"
      role="alert"
    >
      {{ CONFIG_INVALID_MESSAGE }}
    </div>
    <div v-else class="mt-4">
      <Fieldset legend="Erweiterte Einstellungen" :toggleable="true" :collapsed="true">
        <template v-if="settings">
          <p class="mb-4 text-sm text-surface-500">
            Der Aufschlag &alpha; steuert, wie stark die Wortkomplexität (WK) den LIX erhöht (LÜ-LIX
            = LIX + &alpha;&middot;WK). Die vier Gewichte verteilen die WK auf ihre Komponenten.
            Geänderte Werte gelten, bis Sie die Seite neu laden.
            <RouterLink to="/dokumentation" class="text-primary-700 hover:underline"
              >Mehr zur Berechnung</RouterLink
            >
          </p>
          <ConfigWeightsForm
            v-model:alpha="settings.alpha"
            v-model:weight-complex-syllables="settings.weightComplexSyllables"
            v-model:weight-multi-membered-graphemes="settings.weightMultiMemberedGraphemes"
            v-model:weight-rare-graphemes="settings.weightRareGraphemes"
            v-model:weight-consonant-clusters="settings.weightConsonantClusters"
          />
          <div class="mt-4 flex justify-end">
            <Button
              type="button"
              label="Zurücksetzen auf Standard"
              icon="pi pi-undo"
              severity="secondary"
              outlined
              @click="resetSettings"
            />
          </div>
        </template>
        <p v-else-if="configState === 'unavailable'" class="text-sm text-surface-500">
          Die Einstellungen konnten nicht geladen werden. Die Analyse verwendet die Standardwerte.
        </p>
        <p v-else class="text-sm text-surface-500">Die Einstellungen werden geladen …</p>
      </Fieldset>
    </div>

    <div v-if="validationError" class="mt-4 text-sm font-medium text-red-600" role="alert">
      {{ validationError }}
    </div>
    <div class="mt-4 flex items-center">
      <Button
        :loading="loading"
        label="Text analysieren"
        icon="pi pi-calculator"
        @click="calculate"
      />
    </div>

    <!-- Results area — generous separation from input controls -->
    <div class="mt-10">
      <ResultView v-if="result" :result="result" :deviates-from-default="resultDeviates" />
      <div v-else class="border-t border-surface-200 py-8 text-center text-surface-500">
        <p class="mt-4 text-lg">Noch kein Text analysiert</p>
        <p class="mt-1 text-sm">
          Fügen Sie oben einen Text ein und klicken Sie auf &bdquo;Text analysieren&ldquo;.
        </p>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { detectTextType, type ConfigWeights, type TextType } from '@lesbarkeitsindex/api-client';
import Button from 'primevue/button';
import Fieldset from 'primevue/fieldset';
import SelectButton from 'primevue/selectbutton';
import Textarea from 'primevue/textarea';
import { onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import ConfigWeightsForm from '@/components/config-weights-form.vue';
import ResultView from '@/components/result-view.vue';
import { isConfigInvalid, isRateLimited } from '@/composables/api-fetch';
import { useApiClient, type ResultData } from '@/composables/useApiClient';
import { overridesOf, pickWeights } from '@/utils/config-weights';

const CONFIG_INVALID_MESSAGE =
  'Die Konfiguration ist fehlerhaft, bitte wenden Sie sich an die Betreuung';

const RATE_LIMIT_MESSAGE = 'Zu viele Anfragen, bitte kurz warten';
const CALCULATION_FAILED_MESSAGE =
  'Die Berechnung ist fehlgeschlagen. Bitte versuchen Sie es erneut.';

/** Die Meldung zu einer gescheiterten Analyse: je Ursache das, was der Besucher tun kann. */
function calculationErrorMessage(error: unknown): string {
  if (isConfigInvalid(error)) return CONFIG_INVALID_MESSAGE;
  if (isRateLimited(error)) return RATE_LIMIT_MESSAGE;
  return CALCULATION_FAILED_MESSAGE;
}

const client = useApiClient();

const text = ref('');
const loading = ref(false);
const result = ref<ResultData | null>(null);
const validationError = ref('');

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

// Aufschlagsmodell-Parameter (ADR 0008). GET /api/config ist die einzige Quelle
// der Standardwerte; `settings` sind die Werte der Maske. Nichts davon wird im
// Browser gespeichert: Nach dem Neuladen gilt wieder der Standard.
type ConfigState = 'loading' | 'ready' | 'invalid' | 'unavailable';
const configState = ref<ConfigState>('loading');
const defaults = ref<ConfigWeights | null>(null);
const settings = ref<ConfigWeights | null>(null);

// Ob das angezeigte Ergebnis mit abweichenden Einstellungen berechnet wurde.
const resultDeviates = ref(false);

async function loadConfig() {
  try {
    const loaded = pickWeights(await client.getConfig());
    defaults.value = loaded;
    settings.value = { ...loaded };
    configState.value = 'ready';
  } catch (e) {
    console.error('Konfiguration konnte nicht geladen werden', e);
    configState.value = isConfigInvalid(e) ? 'invalid' : 'unavailable';
  }
}

onMounted(loadConfig);

function resetSettings() {
  if (defaults.value) settings.value = { ...defaults.value };
}

async function calculate() {
  validationError.value = '';

  if (!text.value.trim()) {
    validationError.value = 'Bitte geben Sie einen Text ein.';
    return;
  }

  // Fehlte die Konfiguration beim Öffnen der Seite, wird sie jetzt noch einmal
  // geholt: Ist die config.json inzwischen korrigiert, geht es ohne Neuladen weiter.
  if (configState.value !== 'ready') await loadConfig();
  if (configState.value === 'invalid') return;

  // Nur Abweichungen vom Standard gehen mit: Ändert die Betreuung die
  // config.json, rechnet auch eine schon geöffnete Seite mit den neuen Werten.
  const overrides =
    settings.value && defaults.value ? overridesOf(settings.value, defaults.value) : {};

  loading.value = true;
  try {
    result.value = await client.calculate({
      text: text.value,
      ...overrides,
      textType: textType.value,
    });
    resultDeviates.value = Object.keys(overrides).length > 0;
  } catch (e) {
    console.error(e);
    validationError.value = calculationErrorMessage(e);
  } finally {
    loading.value = false;
  }
}

// Für Tests, die den effektiven Zustand und die Aktion auslesen.
defineExpose({ text, textType, detectedTextType, calculate });
</script>
