import { readFile } from 'node:fs/promises';
import { z } from 'zod';

/** Nur http(s): Die Adressen landen als `href` in der Fußzeile der Seite. */
const LegalUrlSchema = z.url({ protocol: /^https?$/ });

/**
 * Inhalt der `config.json` (ADR 0008): α und die vier WK-Gewichte sind Pflicht,
 * die beiden Links optional. Die Gewichte müssen nicht 100 ergeben. Ein
 * unbekannter Schlüssel ist ein Fehler, damit ein Tippfehler auffällt.
 */
const DefaultConfigSchema = z.strictObject({
  alpha: z.number().min(0).max(10),
  weightComplexSyllables: z.number().min(0),
  weightMultiMemberedGraphemes: z.number().min(0),
  weightRareGraphemes: z.number().min(0),
  weightConsonantClusters: z.number().min(0),
  impressumUrl: LegalUrlSchema.optional(),
  datenschutzUrl: LegalUrlSchema.optional(),
});

export type DefaultConfig = Readonly<z.infer<typeof DefaultConfigSchema>>;

/** Gilt, solange keine `config.json` vorhanden ist: Entwicklung und CI brauchen keine. */
const BUILT_IN_DEFAULT_CONFIG: DefaultConfig = {
  alpha: 0.3,
  weightComplexSyllables: 50,
  weightMultiMemberedGraphemes: 25,
  weightRareGraphemes: 12.5,
  weightConsonantClusters: 12.5,
};

/** Die `config.json` ist vorhanden, aber nicht verwendbar. `issues` nennt jeden Mangel. */
export class InvalidDefaultConfigError extends Error {
  constructor(
    readonly path: string,
    readonly issues: readonly string[],
  ) {
    super(`Ungültige Konfigurationsdatei ${path}: ${issues.join('; ')}`);
    this.name = 'InvalidDefaultConfigError';
  }
}

const isFileNotFound = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT';

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** „feld: Meldung"; Mängel ohne Feld (etwa ein unbekannter Schlüssel) stehen für sich. */
const describeIssue = (issue: z.core.$ZodIssue): string =>
  issue.path.length > 0 ? `${issue.path.join('.')}: ${issue.message}` : issue.message;

/**
 * Liest die Standardkonfiguration. Jeder Aufruf liest die Datei neu, damit eine
 * Änderung ohne Neustart wirkt. Ohne Pfad oder ohne Datei gelten die eingebauten
 * Standardwerte; eine vorhandene, aber fehlerhafte Datei wirft
 * {@link InvalidDefaultConfigError}, statt mit Werten zu rechnen, die niemand gewählt hat.
 */
export async function readDefaultConfig(path: string | undefined): Promise<DefaultConfig> {
  if (!path) {
    return BUILT_IN_DEFAULT_CONFIG;
  }

  let content: string;
  try {
    content = await readFile(path, 'utf8');
  } catch (error) {
    if (isFileNotFound(error)) {
      return BUILT_IN_DEFAULT_CONFIG;
    }
    throw new InvalidDefaultConfigError(path, [`nicht lesbar (${describeError(error)})`]);
  }

  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch (error) {
    throw new InvalidDefaultConfigError(path, [`kein gültiges JSON (${describeError(error)})`]);
  }

  const parsed = DefaultConfigSchema.safeParse(json);
  if (!parsed.success) {
    throw new InvalidDefaultConfigError(path, parsed.error.issues.map(describeIssue));
  }
  return parsed.data;
}
