import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { InvalidDefaultConfigError, readDefaultConfig } from './default-config.js';

/**
 * Die Standardkonfiguration aus der `config.json` (ADR 0008, Issue #94) in ihren
 * drei Zuständen: Datei fehlt, Datei gültig, Datei fehlerhaft.
 */

const VALID = {
  alpha: 0.45,
  weightComplexSyllables: 40,
  weightMultiMemberedGraphemes: 30,
  weightRareGraphemes: 20,
  weightConsonantClusters: 10,
};

describe('readDefaultConfig', () => {
  let dir: string;
  let fileCount = 0;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'default-config-'));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function fileWith(content: string): Promise<string> {
    fileCount += 1;
    const path = join(dir, `config-${fileCount}.json`);
    await writeFile(path, content);
    return path;
  }

  /** Liest eine fehlerhafte Datei und liefert die gemeldeten Mängel. */
  async function issuesOf(content: string): Promise<readonly string[]> {
    const error = await readDefaultConfig(await fileWith(content)).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(InvalidDefaultConfigError);
    return (error as InvalidDefaultConfigError).issues;
  }

  describe('Datei fehlt', () => {
    test('ohne Pfad gelten die eingebauten Standardwerte', async () => {
      await expect(readDefaultConfig(undefined)).resolves.toEqual({
        alpha: 0.3,
        weightComplexSyllables: 50,
        weightMultiMemberedGraphemes: 25,
        weightRareGraphemes: 12.5,
        weightConsonantClusters: 12.5,
      });
    });

    test('ein Pfad ohne Datei liefert ebenfalls die eingebauten Standardwerte', async () => {
      await expect(readDefaultConfig(join(dir, 'gibt-es-nicht.json'))).resolves.toEqual({
        alpha: 0.3,
        weightComplexSyllables: 50,
        weightMultiMemberedGraphemes: 25,
        weightRareGraphemes: 12.5,
        weightConsonantClusters: 12.5,
      });
    });
  });

  describe('Datei gültig', () => {
    test('liefert α und die vier WK-Gewichte aus der Datei', async () => {
      const path = await fileWith(JSON.stringify(VALID));

      await expect(readDefaultConfig(path)).resolves.toEqual(VALID);
    });

    test('die Gewichte müssen nicht 100 ergeben', async () => {
      const path = await fileWith(JSON.stringify({ ...VALID, weightComplexSyllables: 90 }));

      await expect(readDefaultConfig(path)).resolves.toMatchObject({ weightComplexSyllables: 90 });
    });

    test('liefert die beiden optionalen Links mit', async () => {
      const path = await fileWith(
        JSON.stringify({
          ...VALID,
          impressumUrl: 'https://example.org/impressum',
          datenschutzUrl: 'https://example.org/datenschutz',
        }),
      );

      await expect(readDefaultConfig(path)).resolves.toEqual({
        ...VALID,
        impressumUrl: 'https://example.org/impressum',
        datenschutzUrl: 'https://example.org/datenschutz',
      });
    });

    test('liest die Datei bei jedem Aufruf neu', async () => {
      const path = await fileWith(JSON.stringify(VALID));
      await readDefaultConfig(path);

      await writeFile(path, JSON.stringify({ ...VALID, alpha: 1.5 }));

      await expect(readDefaultConfig(path)).resolves.toMatchObject({ alpha: 1.5 });
    });
  });

  describe('Datei fehlerhaft', () => {
    test('kein gültiges JSON', async () => {
      const issues = await issuesOf('{ "alpha": 0.3,');

      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatch(/JSON/);
    });

    test('ein fehlender Schlüssel wird beim Namen genannt', async () => {
      const { weightRareGraphemes: _omitted, ...withoutRare } = VALID;

      const issues = await issuesOf(JSON.stringify(withoutRare));

      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatch(/^weightRareGraphemes: /);
    });

    test('ein negativer Wert wird beim Namen genannt', async () => {
      const issues = await issuesOf(JSON.stringify({ ...VALID, weightConsonantClusters: -1 }));

      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatch(/^weightConsonantClusters: /);
    });

    test('α außerhalb von 0 bis 10', async () => {
      const issues = await issuesOf(JSON.stringify({ ...VALID, alpha: 11 }));

      expect(issues[0]).toMatch(/^alpha: /);
    });

    test('ein Wert als Text statt als Zahl', async () => {
      const issues = await issuesOf(JSON.stringify({ ...VALID, alpha: '0.3' }));

      expect(issues[0]).toMatch(/^alpha: /);
    });

    test('ein vertippter Schlüssel fällt auf, statt still ignoriert zu werden', async () => {
      const issues = await issuesOf(
        JSON.stringify({ ...VALID, impresumUrl: 'https://example.org/impressum' }),
      );

      expect(issues).toHaveLength(1);
      expect(issues[0]).toContain('impresumUrl');
    });

    test('ein Link, der keine http(s)-Adresse ist', async () => {
      const issues = await issuesOf(
        JSON.stringify({ ...VALID, datenschutzUrl: 'javascript:alert(1)' }),
      );

      expect(issues[0]).toMatch(/^datenschutzUrl: /);
    });

    test('ein Verzeichnis an der Stelle der Datei (Docker legt es bei fehlender Quelle an)', async () => {
      const path = join(dir, 'als-verzeichnis.json');
      await mkdir(path);

      const error = await readDefaultConfig(path).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(InvalidDefaultConfigError);
    });
  });
});
