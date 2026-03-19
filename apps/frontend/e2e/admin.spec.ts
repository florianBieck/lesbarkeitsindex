import { test, expect } from '@playwright/test';

test.describe('Admin page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
  });

  test('renders admin page heading', async ({ page }) => {
    await expect(page.getByText('Gewichtung für Textkomplexität')).toBeVisible();
  });

  test('renders load config button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Aktuelle Gewichtung laden' })).toBeVisible();
  });

  test('loads config and displays parameter fields', async ({ page }) => {
    await expect(page.getByText('LIX', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Anteil an Wörtern mit komplexen Silben')).toBeVisible();
    await expect(page.getByText('Anteil an Wörtern mit Konsonantencluster')).toBeVisible();
    await expect(page.getByText('Anteil an Wörtern mit mehrgliedrigen Graphemen')).toBeVisible();
    await expect(page.getByText('Anteil an Wörtern mit seltene Graphemen')).toBeVisible();
  });

  test('displays weight sum information', async ({ page }) => {
    await expect(page.getByText('Summe der Gewichte:')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Die Werte sollten 1 ergeben')).toBeVisible();
  });

  test('renders save button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Speichern' })).toBeVisible();
  });

  test('displays creation date after config loads', async ({ page }) => {
    await expect(page.getByText('Erstellt am:')).toBeVisible({ timeout: 10000 });
  });

  test('reload config button refreshes values', async ({ page }) => {
    await expect(page.getByText('LIX', { exact: true })).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Aktuelle Gewichtung laden' }).click();

    await expect(page.getByText('LIX', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Erstellt am:')).toBeVisible();
  });
});

test.describe('Admin page (authenticated)', () => {
  test('save config while authenticated succeeds', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email1').fill('info@florianbieck.com');
    await page.locator('#password1 input').fill('#Test1234');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('/', { timeout: 15000 });

    await page.goto('/admin');
    await expect(page.getByText('LIX', { exact: true })).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByText('Gespeichert.')).toBeVisible({ timeout: 10000 });
  });
});
