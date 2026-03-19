import { test, expect } from '@playwright/test';

test.describe('Results page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/results');
  });

  test('renders introductory text', async ({ page }) => {
    await expect(page.getByText('Die Lesbarkeit eines Textes wird beim klassischen')).toBeVisible();
  });

  test('renders data table with column headers', async ({ page }) => {
    await expect(page.getByRole('columnheader', { name: 'ID' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Erstellt am' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Text' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'LÜ-LIX' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Hash' })).toBeVisible();
  });

  test('shows results after a calculation has been made', async ({ page }) => {
    await page.goto('/');

    const editor = page.locator('.ql-editor');
    await editor.click();
    await editor.fill('Der Hund läuft schnell über die Straße. Die Katze sitzt auf dem Dach.');
    await page.getByRole('button', { name: 'Berechnen' }).click();
    await expect(page.getByText('Ergebnis')).toBeVisible({ timeout: 10000 });

    await page.goto('/results');

    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
  });

  test('clicking a row selects it', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('.ql-editor');
    await editor.click();
    await editor.fill('Ein kurzer Satz. Noch ein Satz zum Testen der Anwendung.');
    await page.getByRole('button', { name: 'Berechnen' }).click();
    await expect(page.getByText('Ergebnis')).toBeVisible({ timeout: 10000 });

    await page.goto('/results');

    const firstRow = page.locator('table tbody tr[data-p-selectable-row="true"]').first();
    await firstRow.waitFor({ timeout: 10000 });
    await firstRow.click();

    await expect(firstRow).toHaveAttribute('aria-selected', 'true', { timeout: 5000 });
  });
});
