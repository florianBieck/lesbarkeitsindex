import { test, expect, type Page } from '@playwright/test';

/** Analyze a text on the homepage with the save-consent box checked so the
 *  result is persisted and shows up on the results page. */
async function analyzeAndSave(page: Page, text: string) {
  await page.goto('/');
  const editor = page.locator('.ql-editor');
  await editor.click();
  await editor.fill(text);
  await page.getByLabel(/Ich akzeptiere die Speicherung/).check();
  await page.getByRole('button', { name: 'Text analysieren' }).click();
  await expect(page.getByRole('heading', { name: 'Ergebnis' })).toBeVisible({ timeout: 15000 });
}

test.describe('Results page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/results');
  });

  test('renders introductory text', async ({ page }) => {
    await expect(
      page.getByText(
        'Ihre bisherigen Analysen. Klicken Sie auf eine Zeile, um die Details zu sehen.',
      ),
    ).toBeVisible();
  });

  test('renders data table with column headers', async ({ page }) => {
    await expect(page.getByRole('columnheader', { name: 'Datum' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Text' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Ergebnis' })).toBeVisible();
  });

  test('shows results after a calculation has been saved', async ({ page }) => {
    await analyzeAndSave(
      page,
      'Der Hund läuft schnell über die Straße. Die Katze sitzt auf dem Dach.',
    );

    await page.goto('/results');

    // Scope to selectable data rows: the DataTable renders a transient
    // empty-state row while the lazy fetch is in flight.
    const rows = page.locator('tbody tr.p-datatable-selectable-row');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
  });

  test('clicking a row shows its detailed result view', async ({ page }) => {
    await analyzeAndSave(page, 'Ein kurzer Satz. Noch ein Satz zum Testen der Anwendung.');

    await page.goto('/results');

    // Only the real (selectable) data rows trigger row selection; the
    // empty-state row that shows during the lazy fetch must not be clicked.
    const firstRow = page.locator('tbody tr.p-datatable-selectable-row').first();
    await firstRow.waitFor({ timeout: 10000 });
    await firstRow.click();

    // Selecting a row renders the full result view (with its "Ergebnis" heading)
    // beneath the table.
    await expect(page.getByRole('heading', { name: 'Ergebnis' })).toBeVisible({ timeout: 10000 });
  });
});
