import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#email1').fill('info@florianbieck.com');
  await page.locator('#password1 input').fill('#Test1234');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('/', { timeout: 10000 });
  await page.waitForTimeout(1000);
}

test.describe('Navigation', () => {
  test('unauthenticated menu shows Startseite and Anmelden', async ({ page }) => {
    await page.goto('/');

    const menuButton = page.locator('button[aria-controls="overlay_menu"]');
    await menuButton.click();

    const menu = page.locator('#overlay_menu');
    await expect(menu).toBeVisible();

    await expect(menu.getByText('Startseite')).toBeVisible();
    await expect(menu.getByText('Anmelden')).toBeVisible();
  });

  test('menu link navigates to login page', async ({ page }) => {
    await page.goto('/');

    const menuButton = page.locator('button[aria-controls="overlay_menu"]');
    await menuButton.click();

    await page.locator('#overlay_menu').getByText('Anmelden').click();
    await expect(page).toHaveURL('/login');
  });

  test('menu link navigates to home page', async ({ page }) => {
    await page.goto('/login');

    const menuButton = page.locator('button[aria-controls="overlay_menu"]');
    await menuButton.click();

    await page.locator('#overlay_menu').getByText('Startseite').click();
    await expect(page).toHaveURL('/');
  });

  test('authenticated menu shows admin links', async ({ page }) => {
    await login(page);

    const menuButton = page.locator('button[aria-controls="overlay_menu"]');
    await menuButton.click();
    await page.waitForTimeout(500);

    const menu = page.locator('#overlay_menu');
    await expect(menu).toBeVisible({ timeout: 5000 });

    await expect(menu.getByText('Startseite')).toBeVisible();
    await expect(menu.getByText('Gewichtung')).toBeVisible();
    await expect(menu.getByText('Ergebnisse')).toBeVisible();
    await expect(menu.getByText('Abmelden')).toBeVisible();
  });

  test('navigate to results page from menu after login', async ({ page }) => {
    await login(page);

    const menuButton = page.locator('button[aria-controls="overlay_menu"]');
    await menuButton.click();
    await page.waitForTimeout(500);

    const menu = page.locator('#overlay_menu');
    await expect(menu).toBeVisible({ timeout: 5000 });
    await menu.getByText('Ergebnisse').click();
    await expect(page).toHaveURL('/results');
  });

  test('navigate to admin page from menu after login', async ({ page }) => {
    await login(page);

    const menuButton = page.locator('button[aria-controls="overlay_menu"]');
    await menuButton.click();
    await page.waitForTimeout(500);

    const menu = page.locator('#overlay_menu');
    await expect(menu).toBeVisible({ timeout: 5000 });
    await menu.getByText('Gewichtung').click();
    await expect(page).toHaveURL('/admin');
  });
});
