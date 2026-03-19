import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#email1').fill('info@florianbieck.com');
  await page.locator('#password1 input').fill('#Test1234');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('/', { timeout: 10000 });
  await page.waitForTimeout(1000);
}

test.describe('Authentication flow', () => {
  test('full login and logout cycle', async ({ page }) => {
    await login(page);

    const menuButton = page.locator('button[aria-controls="overlay_menu"]');
    await menuButton.click();
    await page.waitForTimeout(500);

    const menu = page.locator('#overlay_menu');
    await expect(menu.getByText('Abmelden')).toBeVisible({ timeout: 5000 });

    await menu.getByText('Abmelden').click();

    await page.waitForURL('/login', { timeout: 15000 });
    await expect(page).toHaveURL('/login');
  });

  test('logout page shows waiting message', async ({ page }) => {
    await page.goto('/logout');
    await expect(page.getByText('Warte auf Abmeldung...')).toBeVisible();
  });

  test('authenticated user can access all pages', async ({ page }) => {
    await login(page);

    await page.goto('/admin');
    await expect(page.getByText('Gewichtung für Textkomplexität')).toBeVisible();

    await page.goto('/results');
    await expect(page.getByRole('columnheader', { name: 'ID' })).toBeVisible();

    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Berechnen' })).toBeVisible();
  });
});
