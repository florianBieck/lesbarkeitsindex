// THROWAWAY: copy of the #56 prototype's shoot.spec.ts for PR 3 (Tailwind 4).
// Shoots one build, labelled by SHOOT_LABEL, against the backend serving that build:
//   SHOOT_LABEL=pr3 pnpm exec playwright test -c visual-tailwind4 shoot
import { test, type Page } from '@playwright/test';

const LABEL = process.env.SHOOT_LABEL ?? 'pr3';
const OUT = 'visual-tailwind4/shots';
const TEXT =
  'Im Herbst fallen die bunten Blätter von den Bäumen. Die Kinder sammeln Kastanien im Stadtpark. ' +
  'Zuhause basteln sie daraus kleine Tiere mit Streichhölzern. Die Strickjacke hält sie warm, ' +
  'während draußen der Sturm durch die schmalen Straßen pfeift.';

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);
}

async function shoot(page: Page, name: string, selector?: string) {
  const path = `${OUT}/${name}-${LABEL}.png`;
  if (selector) await page.locator(selector).first().screenshot({ path });
  else await page.screenshot({ path, fullPage: true });
}

async function login(page: Page) {
  await open(page, '/login');
  await page.locator('#email1').fill('info@florianbieck.com');
  await page.locator('#password1 input').fill('#Test1234');
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await page.waitForURL('/', { timeout: 10000 });
}

test.use({ viewport: { width: 1280, height: 900 } });
test.describe.configure({ mode: 'serial' });

test('logged out', async ({ page }) => {
  await open(page, '/login');
  await shoot(page, 'login');
  await shoot(page, 'header', 'header');
  await shoot(page, 'login-form', 'main');
  await open(page, '/logout');
  await shoot(page, 'logout', 'main');
  await open(page, '/gibt-es-nicht');
  await shoot(page, 'not-found', 'main');
});

test('logged in', async ({ page }) => {
  await login(page);

  await open(page, '/');
  await shoot(page, 'index-empty', 'main');
  await page.getByRole('textbox', { name: 'Text zur Lesbarkeitsanalyse eingeben' }).fill(TEXT);
  await page.getByText('Erweiterte Einstellungen').click();
  await page.locator('label[for="save-consent"]').click();
  await page.getByRole('button', { name: 'Text analysieren' }).click();
  await page.getByText('Schwierigkeit').waitFor({ timeout: 30000 });
  await page.waitForTimeout(800);
  await shoot(page, 'index-result');

  await open(page, '/admin');
  await shoot(page, 'admin', 'main');

  await open(page, '/results');
  await page.getByRole('row').nth(1).click();
  await page.getByText('Schwierigkeit').waitFor();
  for (const toggle of await page.locator('.p-fieldset-toggle-button').all()) await toggle.click();
  await page.waitForTimeout(800);
  await shoot(page, 'results');
  await shoot(page, 'result-metrics', 'div.grid.border-t.border-b');
  await shoot(page, 'result-details', 'xpath=//fieldset[1]/..');

  await page.route('**/api/results**', (route) =>
    route.fulfill({ json: { data: [], meta: { total: 0, page: 0, limit: 10, totalPages: 0 } } }),
  );
  await open(page, '/results');
  await shoot(page, 'results-empty', 'main');
});
