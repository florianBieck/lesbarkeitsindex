import { test as base } from '@playwright/test';

/**
 * Every test fails if the page broke the Content-Security-Policy (ADR 0007): an
 * external image, font, script or request that `configureApp` doesn't allow.
 * The backend sends the CSP, so this bites when the tests run against it (as in
 * CI), not against `vite preview`, which sends none.
 */
export const test = base.extend<{ cspViolations: string[] }>({
  cspViolations: [
    async ({ page }, use) => {
      const violations: string[] = [];
      // A binding survives navigations; the init script runs before the page's own scripts.
      await page.exposeBinding('__reportCspViolation', (_source, violation: string) => {
        violations.push(violation);
      });
      // A string, because this file is type-checked without DOM types (tsconfig.node.json).
      await page.addInitScript(`
        document.addEventListener('securitypolicyviolation', (event) => {
          window.__reportCspViolation(
            event.effectiveDirective + ' blocked ' + (event.blockedURI || 'inline'),
          );
        });
      `);
      await use(violations);
      if (violations.length > 0) {
        throw new Error(`Content-Security-Policy violations:\n${violations.join('\n')}`);
      }
    },
    { auto: true },
  ],
});

export { expect, type Page } from '@playwright/test';
