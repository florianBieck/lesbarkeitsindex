// PROTOTYPE (#56), throwaway: computed styles of utilities on PrimeVue components, per variant.
import { test } from '@playwright/test';

const PROBES = {
  loginButton: 'main button.p-button',
  loginInput: '#email1',
};

for (const v of ['A', 'B']) {
  test(`measure ${v}`, async ({ page }) => {
    await page.goto(`/login?variant=${v}`);
    await page.waitForFunction(() => document.documentElement.dataset.protoMounted !== undefined);
    for (const [name, sel] of Object.entries(PROBES)) {
      const s = await page.locator(sel).first().evaluate((el) => {
        const c = getComputedStyle(el);
        return { padding: c.padding, radius: c.borderRadius, shadow: c.boxShadow, height: el.getBoundingClientRect().height };
      });
      console.log(v, name, JSON.stringify(s));
    }
  });
}
