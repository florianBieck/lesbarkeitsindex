import type { ModuleMetadata } from '@nestjs/common';
import { AbstractLoader, ExpressLoader } from '@nestjs/serve-static';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spaImports } from '../src/spa/spa-imports.js';

export const FIXTURE_INDEX_HTML =
  '<!doctype html><html lang="de"><head><title>LÜ-LIX</title></head><body><div id="app"></div></body></html>';

/** A hashed asset, as `vite build` writes them below `assets/`. */
export const FIXTURE_ASSET_PATH = '/assets/index-Bx7f3k2a.js';
export const FIXTURE_ASSET_BODY = 'console.log("lix");';

export interface SpaFixture {
  readonly root: string;
  readonly remove: () => Promise<void>;
}

/**
 * Writes a stand-in for the frontend's `dist/` (`index.html`, one hashed asset,
 * `favicon.ico`) into a fresh temp dir. It stays out of the checkout on purpose:
 * serve-static 404s every deep link when a directory above its root starts with a
 * dot, as worktrees under `.claude/` do.
 */
export async function createSpaFixture(): Promise<SpaFixture> {
  const root = await mkdtemp(join(tmpdir(), 'lix-spa-'));
  await mkdir(join(root, 'assets'));
  await writeFile(join(root, 'index.html'), FIXTURE_INDEX_HTML);
  await writeFile(join(root, FIXTURE_ASSET_PATH), FIXTURE_ASSET_BODY);
  await writeFile(join(root, 'favicon.ico'), Buffer.from([0, 0, 1, 0]));
  return { root, remove: () => rm(root, { recursive: true, force: true }) };
}

/**
 * A testing module that serves the SPA from `root`, like `AppModule` does.
 *
 * serve-static picks its loader when `compile()` builds the providers. A testing
 * module has no HTTP adapter yet at that point, so it would pick the no-op loader
 * and serve nothing. `NestFactory.create` (`main.ts`) sets the adapter first.
 */
export function spaTestingModule(root: string, metadata: ModuleMetadata): TestingModuleBuilder {
  return Test.createTestingModule({
    ...metadata,
    imports: [...(metadata.imports ?? []), ...spaImports(root)],
  })
    .overrideProvider(AbstractLoader)
    .useClass(ExpressLoader);
}
