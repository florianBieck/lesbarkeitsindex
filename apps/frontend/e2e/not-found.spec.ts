import { test, expect } from './fixtures';

test.describe('Unknown address', () => {
  test('shows the not-found page in the app shell with a link home', async ({ page }) => {
    await page.goto('/gibtsnicht');

    await expect(page.getByRole('heading', { name: 'Seite nicht gefunden' })).toBeVisible();
    await expect(page.getByText('Lübecker Lesbarkeitsindex (LÜ-LIX)')).toBeVisible();

    await page.getByRole('link', { name: 'Zur Startseite' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: 'Text analysieren' })).toBeVisible();
  });

  // The app has no accounts (ADR 0008): the former account pages are unknown addresses.
  for (const path of ['/login', '/logout', '/admin']) {
    test(`${path} shows the not-found page`, async ({ page }) => {
      await page.goto(path);

      await expect(page.getByRole('heading', { name: 'Seite nicht gefunden' })).toBeVisible();
    });
  }

  // Against the real backend, which the backend's own specs only assemble in parts.
  test('the API has no account routes and no way to change the default', async ({ request }) => {
    expect((await request.get('/api/auth/get-session')).status()).toBe(404);
    expect((await request.post('/api/auth/sign-in/email', { data: {} })).status()).toBe(404);
    expect((await request.post('/api/config', { data: { alpha: 1 } })).status()).toBe(404);
  });
});
