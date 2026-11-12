import { Logger, type DynamicModule } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import type { Response } from 'express';
import { existsSync } from 'node:fs';
import { join, sep } from 'node:path';
import { API_PREFIX } from '../configure-app.js';

/** `vite build` hashes every file below `assets/`, so a name never changes its content. */
const ASSETS_CACHE_CONTROL = 'public, max-age=31536000, immutable';
/** `index.html` and the other unhashed files: revalidate on every load (ETag, 304). */
const REVALIDATE_CACHE_CONTROL = 'no-cache';

/**
 * For `AppModule`'s imports: the backend serves the built SPA from `root` (ADR 0007).
 * Every GET path outside `/api/` and `/assets/` gets its file or `index.html`; a
 * missing asset and an unknown `/api/*` path get Nest's JSON 404.
 *
 * Without a build, it serves nothing and warns, except under `NODE_ENV=production`,
 * where the boot fails.
 */
export function spaImports(root: string): DynamicModule[] {
  const index = join(root, 'index.html');
  if (!existsSync(index)) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`SPA build missing: ${index}`);
    }
    new Logger('Spa').warn(`No SPA build at ${root}; SPA serving is off`);
    return [];
  }

  const assetsDir = join(root, 'assets') + sep;
  return [
    // Known and accepted: on the excluded paths, serve-static's error handler turns
    // body-parser errors (400 for malformed JSON, 413 for too large) into a 404.
    ServeStaticModule.forRoot({
      rootPath: root,
      // path-to-regexp v8: the braces make the wildcard optional, so `/api` itself is
      // excluded too. The v4/v6 spellings (`/api/*`, `/api*`) boot, then answer 500.
      exclude: [`/${API_PREFIX}/{*any}`, '/assets/{*any}'],
      serveStaticOptions: {
        // Runs for files and for the index.html fallback, before `send` sets its own.
        setHeaders: (res: Response, path: string) =>
          res.setHeader(
            'Cache-Control',
            path.startsWith(assetsDir) ? ASSETS_CACHE_CONTROL : REVALIDATE_CACHE_CONTROL,
          ),
      },
    }),
  ];
}
