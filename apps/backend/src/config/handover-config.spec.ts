import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { readDefaultConfig } from './default-config.js';

/**
 * Die `deploy/config.json` geht an den Betreiber (Issue #98). Sie muss vorhanden
 * und gültig sein und dieselben Werte tragen wie die eingebauten Standardwerte,
 * damit die Auslieferung so rechnet wie Entwicklung und CI.
 */
const HANDOVER_CONFIG = join(__dirname, '..', '..', '..', '..', 'deploy', 'config.json');

test('die ausgelieferte config.json ist gültig und entspricht den eingebauten Standardwerten', async () => {
  const shipped: unknown = JSON.parse(await readFile(HANDOVER_CONFIG, 'utf8'));
  const builtIn = await readDefaultConfig(undefined);

  await expect(readDefaultConfig(HANDOVER_CONFIG)).resolves.toEqual(shipped);
  expect(shipped).toEqual(builtIn);
});
