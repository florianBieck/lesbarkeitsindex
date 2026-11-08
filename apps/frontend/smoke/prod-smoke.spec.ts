import { expect, test, type Page } from '@playwright/test';

/**
 * Smoke test after a deploy (`pnpm --filter frontend run test:smoke`): the by-hand
 * checklist, run against the live site. It leaves nothing behind: the analysis isn't
 * saved, the admin page is only opened, and signing out ends the session it opened.
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

function credentials(): { email: string; password: string } {
  const { SMOKE_EMAIL: email, SMOKE_PASSWORD: password } = process.env;
  if (!email || !password) {
    throw new Error('Set SMOKE_EMAIL and SMOKE_PASSWORD in apps/frontend/.env.smoke.local');
  }
  return { email, password };
}

/** The signed-in user's email, or null. Never the whole session: it holds the token. */
async function sessionEmail(page: Page): Promise<string | null> {
  const res = await page.request.get('/api/auth/get-session');
  expect(res.status()).toBe(200);
  const session = (await res.json()) as { user?: { email?: string } } | null;
  return session?.user?.email ?? null;
}

test('a signed-in teacher can analyse a long text, browse and sign out', async ({ page }) => {
  const { email, password } = credentials();

  await test.step('the API names no framework', async () => {
    const res = await page.request.get('/api/health');
    expect(res.status()).toBe(200);
    expect(res.headers()['x-powered-by']).toBeUndefined();
  });

  await test.step('sign in', async () => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'E-Mail Adresse' }).fill(email);
    await page.getByRole('textbox', { name: 'Passwort' }).fill(password);
    await page.getByRole('button', { name: 'Anmelden' }).click();
    await page.waitForURL('/');
    expect(await sessionEmail(page)).toBe(email);
  });

  await test.step('analyse a text over 100 KB without saving it', async () => {
    await page.getByLabel('Text zur Lesbarkeitsanalyse eingeben').fill(longUmlautText());
    await expect(page.getByLabel(/Ich akzeptiere die Speicherung/)).not.toBeChecked();

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

  await test.step('reload "Bisherige Analysen"', async () => {
    await page.goto('/results');
    await expect(page.getByRole('columnheader', { name: 'Datum' })).toBeVisible();
  });

  await test.step('open "Konfiguration"', async () => {
    const config = page.waitForResponse(
      (res) => res.url().endsWith('/api/config') && res.request().method() === 'GET',
    );
    await page.goto('/admin');
    expect((await config).status()).toBe(200);
    await expect(page.getByRole('button', { name: 'Konfiguration speichern' })).toBeVisible();
  });

  await test.step('sign out, and stay signed out after a reload', async () => {
    await page.getByRole('button', { name: 'Menü' }).click();
    await page.getByRole('menuitem', { name: 'Abmelden' }).click();
    await page.waitForURL('/login');

    const sessionCookies = (await page.context().cookies())
      .map((cookie) => cookie.name)
      .filter((name) => name.includes('session_token'));
    expect(sessionCookies).toEqual([]);

    await page.reload();
    expect(await sessionEmail(page)).toBeNull();
    await page.getByRole('button', { name: 'Menü' }).click();
    await expect(page.getByRole('menuitem', { name: 'Anmelden' })).toBeVisible();
  });
});
