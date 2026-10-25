// PROTOTYPE (#56), throwaway: screenshots every page in variants A/B/C/D.
// Run against a prod build (see README.md): pnpm exec playwright test -c prototype-dead-classes shoot
import { test, type Page } from '@playwright/test';

const VARIANTS = ['A', 'B', 'C', 'D'] as const;
const OUT = 'prototype-dead-classes/shots';
const TEXT =
  'Im Herbst fallen die bunten Blätter von den Bäumen. Die Kinder sammeln Kastanien im Stadtpark. ' +
  'Zuhause basteln sie daraus kleine Tiere mit Streichhölzern. Die Strickjacke hält sie warm, ' +
  'während draußen der Sturm durch die schmalen Straßen pfeift.';

const HIDE_SWITCHER =
  '[data-prototype-switcher], #nuxt-devtools-container { display: none !important; }';

async function open(page: Page, path: string, variant: string) {
  const sep = path.includes('?') ? '&' : '?';
  await page.goto(`${path}${sep}variant=${variant}`);
  await page.waitForFunction(
    (v) => {
      const { protoVariant, protoMounted } = document.documentElement.dataset;
      return protoVariant === v && protoMounted !== undefined;
    },
    variant,
  );
  await page.addStyleTag({ content: HIDE_SWITCHER });
  await page.waitForTimeout(400);
}

async function shoot(page: Page, name: string, variant: string, selector?: string) {
  const path = `${OUT}/${name}-${variant}.png`;
  if (selector) await page.locator(selector).first().screenshot({ path });
  else await page.screenshot({ path, fullPage: true });
}

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#email1').fill('info@florianbieck.com');
  await page.locator('#password1 input').fill('#Test1234');
  await page.waitForFunction(() => document.documentElement.dataset.protoMounted !== undefined);
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await page.waitForURL('/', { timeout: 10000 });
}

test.use({ viewport: { width: 1280, height: 900 } });
test.describe.configure({ mode: 'serial' });

for (const v of VARIANTS) {
  test(`logged out ${v}`, async ({ page }) => {
    await open(page, '/login', v);
    await shoot(page, 'login', v);
    await shoot(page, 'header', v, 'header');
    await shoot(page, 'login-form', v, 'main');
    await open(page, '/logout', v);
    await shoot(page, 'logout', v, 'main');
  });

  test(`logged in ${v}`, async ({ page }) => {
    await login(page);

    await open(page, '/', v);
    await shoot(page, 'index-empty', v, 'main');
    await page.getByRole('textbox', { name: 'Text zur Lesbarkeitsanalyse eingeben' }).fill(TEXT);
    await page.getByText('Erweiterte Einstellungen').click();
    await page.locator('label[for="save-consent"]').click();
    await page.getByRole('button', { name: 'Text analysieren' }).click();
    await page.getByText('Schwierigkeit').waitFor({ timeout: 30000 });
    await page.waitForTimeout(800);
    await shoot(page, 'index-result', v);

    await open(page, '/admin', v);
    await shoot(page, 'admin', v, 'main');

    await open(page, '/results', v);
    await page.getByRole('row').nth(1).click();
    await page.getByText('Schwierigkeit').waitFor();
    for (const toggle of await page.locator('.p-fieldset-toggle-button').all()) await toggle.click();
    await page.waitForTimeout(800);
    await shoot(page, 'results', v);
    await shoot(page, 'result-metrics', v, 'div.grid.border-surface-100');
    await shoot(page, 'result-details', v, 'xpath=//fieldset[1]/..');

    await page.route(/localhost:3000\/results/, (route) =>
      route.fulfill({
        json: { data: [], meta: { total: 0, page: 0, limit: 10, totalPages: 0 } },
        headers: {
          'access-control-allow-origin': 'http://localhost:3001',
          'access-control-allow-credentials': 'true',
        },
      }),
    );
    await open(page, '/results', v);
    await shoot(page, 'results-empty', v, 'main');
  });
}
