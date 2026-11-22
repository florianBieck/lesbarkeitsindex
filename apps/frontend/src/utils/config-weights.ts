import type { ConfigWeights } from '@lesbarkeitsindex/api-client';

const WEIGHT_KEYS = [
  'alpha',
  'weightComplexSyllables',
  'weightMultiMemberedGraphemes',
  'weightRareGraphemes',
  'weightConsonantClusters',
] as const satisfies readonly (keyof ConfigWeights)[];

/** Die fünf Werte einer Konfiguration, ohne alles Weitere (etwa die Links der Fußzeile). */
export const pickWeights = (config: ConfigWeights): ConfigWeights => ({
  alpha: config.alpha,
  weightComplexSyllables: config.weightComplexSyllables,
  weightMultiMemberedGraphemes: config.weightMultiMemberedGraphemes,
  weightRareGraphemes: config.weightRareGraphemes,
  weightConsonantClusters: config.weightConsonantClusters,
});

/**
 * Die Werte, in denen die Einstellungen vom Standard abweichen: Nur sie gehen
 * mit der Anfrage mit, alles Übrige nimmt das Backend aus seiner aktuellen
 * Standardkonfiguration. Ein geleertes Feld (zur Laufzeit `null`) gilt als Standard.
 */
export function overridesOf(
  settings: Readonly<ConfigWeights>,
  defaults: Readonly<ConfigWeights>,
): Partial<ConfigWeights> {
  return Object.fromEntries(
    WEIGHT_KEYS.filter(
      (key) => typeof settings[key] === 'number' && settings[key] !== defaults[key],
    ).map((key) => [key, settings[key]]),
  );
}
