import { test, expect } from './fixtures';

test.describe('Documentation page', () => {
  test('is reachable from the start page and leads back', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'So wird gerechnet' }).click();

    await expect(page).toHaveURL('/dokumentation');
    await expect(page.getByRole('heading', { name: 'So wird der LÜ-LIX berechnet' })).toBeVisible();
    await expect(page.getByText('LÜ-LIX = LIX + α · WK').first()).toBeVisible();

    await page.getByRole('link', { name: 'Zur Textanalyse' }).first().click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: 'Text analysieren' })).toBeVisible();
  });

  test('opens as a deep link and shows the current default values', async ({ page, request }) => {
    const config = (await (await request.get('/api/config')).json()) as { alpha: number };

    await page.goto('/dokumentation');

    await expect(page.getByTestId('default-value').first()).toHaveText(
      `Aufschlag α${config.alpha.toLocaleString('de-DE')}`,
    );
    await expect(page.getByTestId('default-value')).toHaveCount(5);
  });
});
