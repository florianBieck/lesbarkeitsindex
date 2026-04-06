import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders app header with title and subtitle', async ({ page }) => {
    await expect(page.getByText('Lübecker Lesbarkeitsindex (LÜ-LIX)')).toBeVisible();
    await expect(page.getByText('Entwickelt von Beate Leßmann')).toBeVisible();
  });

  test('renders introductory text about LIX', async ({ page }) => {
    await expect(page.getByText('Die Lesbarkeit eines Textes wird beim klassischen')).toBeVisible();
    await expect(page.getByText('Dieser Prototyp berechnet eine Erweiterung')).toBeVisible();
  });

  test('renders the text editor', async ({ page }) => {
    await expect(page.locator('.ql-editor')).toBeVisible();
  });

  test('renders the calculate button', async ({ page }) => {
    const button = page.getByRole('button', { name: 'Berechnen' });
    await expect(button).toBeVisible();
  });

  test('shows placeholder text when no result exists', async ({ page }) => {
    await expect(page.getByText('Geben Sie Text ein und klicken Sie auf Berechnen.')).toBeVisible();
  });

  test('renders website button in header', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Website' })).toBeVisible();
  });

  test('can type text into the editor', async ({ page }) => {
    const editor = page.locator('.ql-editor');
    await editor.click();
    await editor.fill('Dies ist ein Testtext für die Lesbarkeitsanalyse.');
    await expect(editor).toContainText('Dies ist ein Testtext');
  });

  test('calculate button shows loading state and returns result', async ({ page }) => {
    const editor = page.locator('.ql-editor');
    await editor.click();
    await editor.fill(
      'Der Hund läuft schnell über die Straße. Die Katze sitzt auf dem Dach. Ein Vogel fliegt am Himmel.',
    );

    const button = page.getByRole('button', { name: 'Berechnen' });
    await button.click();

    await expect(page.getByText('Ergebnis')).toBeVisible({ timeout: 10000 });
  });

  test('result view shows all expected sections after calculation', async ({ page }) => {
    const editor = page.locator('.ql-editor');
    await editor.click();
    await editor.fill(
      'Der Hund läuft schnell über die Straße. Die Katze sitzt auf dem Dach. Ein Vogel fliegt am Himmel.',
    );

    await page.getByRole('button', { name: 'Berechnen' }).click();
    await expect(page.getByText('Ergebnis')).toBeVisible({ timeout: 10000 });

    await expect(page.getByText('Original Text')).toBeVisible();
    await expect(page.getByText('Spaltung in Sätze')).toBeVisible();
    await expect(page.getByText('Spaltung in Wörter')).toBeVisible();
    await expect(page.getByText('Spaltung in Silben')).toBeVisible();
    await expect(page.locator('.card').getByText('Gewichtung')).toBeVisible();
  });

  test('result data table shows readability metrics', async ({ page }) => {
    const editor = page.locator('.ql-editor');
    await editor.click();
    await editor.fill('Der Hund läuft schnell über die Straße. Die Katze sitzt auf dem Dach.');

    await page.getByRole('button', { name: 'Berechnen' }).click();
    await expect(page.getByText('Ergebnis')).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByRole('cell', { name: 'Lesbarkeitsindex (LIX)', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('cell', { name: 'gSMOG', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Anzahl Wörter', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Anzahl Sätze', exact: true })).toBeVisible();
  });
});
