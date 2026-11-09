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
});
