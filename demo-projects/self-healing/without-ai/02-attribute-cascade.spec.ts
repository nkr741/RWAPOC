import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

test.describe('Self-Healing: Attribute Cascade', () => {
  function byAttribute(page: Page, baseName: string) {
    const variants = [
      `[data-test="${baseName}"]`,
      `[data-qa="${baseName.replace(/-/g, '_')}_v2"]`, // broken naming convention
      `[data-testid="${baseName}"]`,
      `[data-cy="${baseName}"]`,
      `[aria-label="${baseName.replace(/-/g, ' ')}"]`,
    ];
    for (const selector of variants) {
      const loc = page.locator(selector);
      if (loc) return loc;
    }
    return page.locator(variants[0]);
  }

  async function findVisible(page: Page, baseName: string) {
    const selectors = [
      `[data-test="${baseName}"]`,
      `[data-qa="${baseName.replace(/-/g, '_')}_v2"]`,
      `[data-testid="${baseName}"]`,
    ];
    for (const sel of selectors) {
      const loc = page.locator(sel);
      if (await loc.count() > 0) return loc.first();
    }
    throw new Error(`No attribute variant found for: ${baseName}`);
  }

  test('finds login form via attribute cascade (normal)', async ({ page }) => {
    await page.goto('/');
    const form = await findVisible(page, 'login-form');
    await expect(form).toBeVisible();
  });

  test('finds login form via attribute cascade (broken)', async ({ page }) => {
    await page.goto('/?broken');
    const form = await findVisible(page, 'login-form');
    await expect(form).toBeVisible();
  });

  test('finds nav via partial attribute match', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-test="signin-username"]', 'demo');
    await page.fill('[data-test="signin-password"]', 'password123');
    await page.click('[data-test="signin-submit"]');
    const nav = await findVisible(page, 'main-nav');
    await expect(nav).toBeVisible();
  });
});
