import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders login heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Anmelden' })).toBeVisible();
  });

  test('renders email input field', async ({ page }) => {
    const emailInput = page.locator('#email1');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('placeholder', 'E-Mail-Adresse');
  });

  test('renders password input field', async ({ page }) => {
    await expect(page.locator('#password1 input')).toBeVisible();
  });

  test('renders remember me checkbox', async ({ page }) => {
    await expect(page.getByText('Angemeldet bleiben')).toBeVisible();
  });

  test('renders sign in button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Anmelden' })).toBeVisible();
  });

  test('can fill in email and password fields', async ({ page }) => {
    await page.locator('#email1').fill('test@example.com');
    await page.locator('#password1 input').fill('password123');

    await expect(page.locator('#email1')).toHaveValue('test@example.com');
    await expect(page.locator('#password1 input')).toHaveValue('password123');
  });

  test('successful login redirects to home', async ({ page }) => {
    await page.locator('#email1').fill('info@florianbieck.com');
    await page.locator('#password1 input').fill('#Test1234');

    await page.getByRole('button', { name: 'Anmelden' }).click();

    await page.waitForURL('/', { timeout: 10000 });
    await expect(page).toHaveURL('/');
  });

  test('failed login stays on login page', async ({ page }) => {
    await page.locator('#email1').fill('invalid@example.com');
    await page.locator('#password1 input').fill('wrongpassword');

    await page.getByRole('button', { name: 'Anmelden' }).click();

    await expect(
      page.getByText('Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Eingaben.'),
    ).toBeVisible({
      timeout: 10000,
    });
    await expect(page).toHaveURL('/login');
  });
});
