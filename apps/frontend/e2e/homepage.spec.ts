import { test, expect, type Page } from '@playwright/test';

const SAMPLE_TEXT =
  'Der Hund läuft schnell über die Straße. Die Katze sitzt auf dem Dach. Ein Vogel fliegt am Himmel.';

/** Expand a collapsed PrimeVue Fieldset by clicking its legend toggle button. */
async function expandFieldset(page: Page, legend: string) {
  await page.getByRole('button', { name: legend }).click();
}

async function analyze(page: Page, text: string) {
  const editor = page.locator('.ql-editor');
  await editor.click();
  await editor.fill(text);
  await page.getByRole('button', { name: 'Text analysieren' }).click();
  await expect(page.getByRole('heading', { name: 'Ergebnis' })).toBeVisible({ timeout: 15000 });
}

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders app header with title and subtitle', async ({ page }) => {
    await expect(page.getByText('Lübecker Lesbarkeitsindex (LÜ-LIX)')).toBeVisible();
    await expect(page.getByText('Entwickelt von Beate Leßmann')).toBeVisible();
  });

  test('renders the introductory text', async ({ page }) => {
    await expect(
      page.getByText('Fügen Sie einen Text ein, um seine Lesbarkeit zu analysieren.'),
    ).toBeVisible();
  });

  test('renders the text editor', async ({ page }) => {
    await expect(page.locator('.ql-editor')).toBeVisible();
  });

  test('renders the analyze button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Text analysieren' })).toBeVisible();
  });

  test('shows placeholder text when no result exists', async ({ page }) => {
    await expect(page.getByText('Noch kein Text analysiert')).toBeVisible();
  });

  test('renders the website button in the header', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Zur Website' })).toBeVisible();
  });

  test('can type text into the editor', async ({ page }) => {
    const editor = page.locator('.ql-editor');
    await editor.click();
    await editor.fill('Dies ist ein Testtext für die Lesbarkeitsanalyse.');
    await expect(editor).toContainText('Dies ist ein Testtext');
  });

  test('advanced settings expose the glossary weight labels', async ({ page }) => {
    await expandFieldset(page, 'Erweiterte Einstellungen');

    await expect(page.getByText('Klassischer Lesbarkeitsindex (LIX)')).toBeVisible();
    await expect(page.getByText('Drei- und Mehrsilber')).toBeVisible();
    await expect(page.getByText('Konsonantenlauthäufung')).toBeVisible();
    await expect(page.getByText('Mehrgliedrige Grapheme')).toBeVisible();
    await expect(page.getByText('Seltene Grapheme')).toBeVisible();

    // Pre-glossary terms must no longer appear (issue #27).
    await expect(page.getByText('Komplexe Silben')).toHaveCount(0);
    await expect(page.getByText('Schwierige Buchstabenfolgen')).toHaveCount(0);
    await expect(page.getByText('Mehrteilige Buchstabengruppen')).toHaveCount(0);
    await expect(page.getByText('Seltene Buchstaben')).toHaveCount(0);
  });

  test('analyze button returns a result', async ({ page }) => {
    await analyze(page, SAMPLE_TEXT);
  });

  test('result view shows its metric sections after analysis', async ({ page }) => {
    await analyze(page, SAMPLE_TEXT);

    // Collapsed Fieldset legends are rendered even while collapsed.
    await expect(page.getByText('Lesbarkeitsindizes')).toBeVisible();
    await expect(page.getByText('Wortkomplexität')).toBeVisible();
    await expect(page.getByText('Verwendete Gewichtung')).toBeVisible();
    await expect(page.getByText('Textanalyse')).toBeVisible();
  });

  test('readability indices are listed in the result', async ({ page }) => {
    await analyze(page, SAMPLE_TEXT);

    await expandFieldset(page, 'Lesbarkeitsindizes');
    // "LÜ-LIX"/"LIX" also appear in the header and intro text, so assert on the
    // unambiguous index labels instead.
    await expect(page.getByText('gSMOG')).toBeVisible();
    await expect(page.getByText('WST4')).toBeVisible();
    await expect(page.getByText('Flesch-Kincaid')).toBeVisible();
  });

  test('weighting section maps each glossary label to its own value (#27)', async ({ page }) => {
    await analyze(page, SAMPLE_TEXT);

    await expandFieldset(page, 'Verwendete Gewichtung');

    // PrimeVue MeterGroup renders each entry as "<label> (<percent>%)", so the
    // weight value sits in the same node as its own label. With the default
    // weights (LIX 0.6, Drei- und Mehrsilber 0.2, Mehrgliedrige Grapheme 0.1)
    // a swapped display — the bug behind #27 — would attach the wrong value.
    await expect(page.getByText('Mehrgliedrige Grapheme (10%)')).toBeVisible();
    await expect(page.getByText('Lesbarkeitsindex (LIX) (60%)')).toBeVisible();
    await expect(page.getByText('Drei- und Mehrsilber (20%)')).toBeVisible();

    // The old terms must not appear anywhere in the result UI.
    await expect(page.getByText('Komplexe Silben')).toHaveCount(0);
    await expect(page.getByText('Schwierige Buchstabenfolgen')).toHaveCount(0);
    await expect(page.getByText('Mehrteilige Buchstabengruppen')).toHaveCount(0);
    await expect(page.getByText('Seltene Buchstaben')).toHaveCount(0);
  });

  test('shows the detected title after analyzing a text with a title line', async ({ page }) => {
    const editor = page.locator('.ql-editor');
    await editor.click();
    await page.keyboard.type('Der Igel');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Igel sind nachtaktive Tiere. Sie schlafen am Tag.');

    await page.getByRole('button', { name: 'Text analysieren' }).click();
    await expect(page.getByRole('heading', { name: 'Ergebnis' })).toBeVisible({ timeout: 15000 });

    await expect(page.getByText('„Der Igel“')).toBeVisible();
    await expect(page.getByText('Titel — fließt in keine Kennzahl ein')).toBeVisible();
  });
});
