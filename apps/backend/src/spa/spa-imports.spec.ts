import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spaImports } from './spa-imports.js';

describe('spaImports', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'lix-spa-unit-'));
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    await rm(root, { recursive: true, force: true });
  });

  test('serves the build when it has an index.html', async () => {
    await writeFile(join(root, 'index.html'), '<!doctype html>');

    const imports = spaImports(root);

    expect(imports).toHaveLength(1);
    expect(imports[0]?.module).toBe(ServeStaticModule);
  });

  test('without a build outside production, it warns and serves nothing', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    expect(spaImports(root)).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  test('without a build in production, the boot fails', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(() => spaImports(root)).toThrow(/SPA build missing/);
  });
});
