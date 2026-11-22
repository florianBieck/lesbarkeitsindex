import { expect, test } from '@playwright/test';

/**
 * Smoke test after a deploy (`pnpm --filter frontend run test:smoke`): the by-hand
 * checklist, run against the live site. It leaves nothing behind: the app has no accounts
 * and stores no analysis (ADR 0008).
 */

const SENTENCE =
  'Müde Bären überqueren früh die schöne Brücke über dem Fluss. Später hören Kühe dort Vögel zwitschern. ';

/** Below the calculate schema's 100,000 characters; with umlauts (two bytes in UTF-8) over 100 KB. */
const LONG_TEXT_CHARS = 95_000;
const LONG_TEXT_MIN_BYTES = 100 * 1024;

/** The R sidecar on prod needs about 20 seconds for the long text. */
const ANALYSIS_TIMEOUT_MS = 60_000;

function longUmlautText(): string {
  const repeated = SENTENCE.repeat(Math.ceil(LONG_TEXT_CHARS / SENTENCE.length));
  return repeated.slice(0, LONG_TEXT_CHARS).replace(/[^.]*$/, '');
}

test('a visitor can analyse a long text, and the site offers no accounts', async ({ page }) => {
  await test.step('the API names no framework', async () => {
    const res = await page.request.get('/api/health');
    expect(res.status()).toBe(200);
    expect(res.headers()['x-powered-by']).toBeUndefined();
  });

  await test.step('analyse a text over 100 KB', async () => {
    await page.goto('/');
    await page.getByLabel('Text zur Lesbarkeitsanalyse eingeben').fill(longUmlautText());

    const calculated = page.waitForResponse((res) => res.url().endsWith('/api/calculate'), {
      timeout: ANALYSIS_TIMEOUT_MS,
    });
    await page.getByRole('button', { name: 'Text analysieren' }).click();
    const response = await calculated;

    expect(Buffer.byteLength(response.request().postData() ?? '')).toBeGreaterThan(
      LONG_TEXT_MIN_BYTES,
    );
    expect(response.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Ergebnis' })).toBeVisible();
  });

  await test.step('the API has no accounts', async () => {
    const res = await page.request.get('/api/auth/get-session');
    expect(res.status()).toBe(404);
  });

  await test.step('the former account pages are unknown addresses', async () => {
    for (const path of ['/login', '/admin']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: 'Seite nicht gefunden' })).toBeVisible();
    }
  });
});
