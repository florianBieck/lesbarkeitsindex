// Visual check for PR 2: same steps against main's Nuxt build and the branch's Vite build.
// Usage: node shoot.mjs <baseURL> <outDir>
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(
  '/Users/florianbieck/projects/lesbarkeitsindex/apps/frontend/package.json',
);
const { chromium } = require('@playwright/test');

const [baseURL, outDir] = process.argv.slice(2);
if (!baseURL || !outDir) throw new Error('usage: node shoot.mjs <baseURL> <outDir>');
mkdirSync(outDir, { recursive: true });

const SAMPLE =
  'Der Igel ist ein nachtaktives Tier. Er schläft am Tag unter Hecken und Sträuchern. ' +
  'In der Dämmerung sucht er Käfer, Würmer und Schnecken.';

const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL,
  // Tall enough that a full-page shot never resizes the page (which redraws the chart).
  viewport: { width: 1280, height: 4000 },
  deviceScaleFactor: 1,
  locale: 'de-DE',
  timezoneId: 'Europe/Berlin',
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const consoleErrors = [];
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(`${page.url()}: ${m.text()}`));

async function settle() {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  // No hover state, and Chart.js animates for 1 s.
  await page.mouse.move(0, 0);
  await page.waitForTimeout(1500);
}

async function shot(name) {
  await settle();
  await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: true });
  console.log('shot', name);
}

async function openMenu() {
  await page.getByRole('button', { name: 'Menü' }).click();
  await page.locator('#overlay_menu').waitFor();
}

// Logged out
await page.goto('/');
await shot('01-index-empty');
await openMenu();
await shot('02-index-menu-logged-out');
await page.keyboard.press('Escape');
await page.goto('/login');
await shot('03-login');
await page.goto('/admin');
await shot('04-admin-logged-out');
await page.goto('/results');
await shot('05-results-logged-out');

// Log in
await page.goto('/login');
await page.locator('#email1').fill('info@florianbieck.com');
await page.locator('#password1 input').fill('#Test1234');
await page.getByRole('button', { name: 'Anmelden' }).click();
await page.waitForURL((url) => url.pathname === '/', { timeout: 15000 });
await settle();

// Seed one saved analysis on the first run only, so both runs see the same table.
await page.goto('/results');
await settle();
if (await page.getByText('Noch keine Analysen vorhanden').isVisible()) {
  await page.goto('/');
  await page.getByLabel('Text zur Lesbarkeitsanalyse eingeben').fill(SAMPLE);
  await page.getByLabel(/Ich akzeptiere die Speicherung/).check();
  await page.getByRole('button', { name: 'Text analysieren' }).click();
  await page.getByRole('heading', { name: 'Ergebnis' }).waitFor({ timeout: 30000 });
  console.log('seeded one saved analysis');
}

await page.goto('/');
await openMenu();
await shot('06-index-menu-logged-in');
await page.keyboard.press('Escape');

await page.goto('/');
await page.getByLabel('Text zur Lesbarkeitsanalyse eingeben').fill(SAMPLE);
await page.getByRole('button', { name: 'Erweiterte Einstellungen' }).click();
await page.getByRole('button', { name: 'Text analysieren' }).click();
await page.getByRole('heading', { name: 'Ergebnis' }).waitFor({ timeout: 30000 });
await shot('07-index-result-collapsed');
for (const legend of [
  'Lesbarkeitsindizes',
  'Wortkomplexität',
  'Satzkomplexität',
  'Kennzahlen im Durchschnitt',
  'Verwendete Gewichtung',
  'Textanalyse',
  'Wörter nach Silbenzahl',
]) {
  await page.getByRole('button', { name: legend, exact: true }).click();
}
await shot('08-index-result-expanded');

await page.goto('/results');
await page.locator('tbody tr.p-datatable-selectable-row').first().waitFor({ timeout: 15000 });
await shot('09-results');
await page.locator('tbody tr.p-datatable-selectable-row').first().click();
await page.getByRole('heading', { name: 'Ergebnis' }).waitFor({ timeout: 15000 });
await shot('10-results-selected');
await page.reload();
await page.locator('tbody tr.p-datatable-selectable-row').first().waitFor({ timeout: 15000 });
await shot('11-results-reloaded');

await page.goto('/admin');
await shot('12-admin');

await page.goto('/gibtsnicht');
await shot('13-not-found');

await page.goto('/logout');
await page.waitForURL((url) => url.pathname === '/login', { timeout: 15000 });
await shot('14-after-logout');

console.log('console errors:', JSON.stringify(consoleErrors, null, 2));
await browser.close();
