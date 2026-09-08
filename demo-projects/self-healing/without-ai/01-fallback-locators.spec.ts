import { test, expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';

test.describe('Self-Healing: Fallback Locators', () => {
  async function findElement(page: Page, strategies: (() => Locator)[]) {
    for (const strategy of strategies) {
      const loc = strategy();
      if (await loc.count() > 0 && await loc.first().isVisible()) {
        return loc.first();
      }
    }
    throw new Error('All locator strategies exhausted — element not found');
  }

  test('login button found via cascading strategies', async ({ page }) => {
    await page.goto('/');
    const btn = await findElement(page, [
      () => page.getByTestId('signin-submit'),
      () => page.locator('#signin-btn'),
      () => page.getByRole('button', { name: /sign in/i }),
      () => page.locator('button[type="submit"]'),
    ]);
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  test('login button found after locators break', async ({ page }) => {
    await page.goto('/?broken');
    const btn = await findElement(page, [
      () => page.getByTestId('signin-submit'),       // fails — data-test removed
      () => page.locator('#signin-btn'),              // fails — id renamed
      () => page.getByRole('button', { name: /log in/i }), // works — text changed to "Log In"
      () => page.locator('button[type="submit"]'),
    ]);
    await expect(btn).toBeVisible();
  });

  test('username input found via cascading strategies', async ({ page }) => {
    await page.goto('/?broken');
    const input = await findElement(page, [
      () => page.getByTestId('signin-username'),      // fails
      () => page.locator('#username'),                 // fails — id changed
      () => page.getByLabel('Username'),               // works — aria-label intact
      () => page.getByPlaceholder('Enter username'),
    ]);
    await expect(input).toBeEditable();
  });
});
