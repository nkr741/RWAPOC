import { test, expect } from '@playwright/test';

test.describe('Self-Healing: CSS + XPath Fallback', () => {
  test('CSS selector for login form', async ({ page }) => {
    await page.goto('/');
    const form = page.locator('css=form#login-form');
    await expect(form).toBeVisible();
  });

  test('XPath text predicate finds heading', async ({ page }) => {
    await page.goto('/');
    const heading = page.locator('xpath=//h2[contains(text(), "Sign In")]');
    await expect(heading).toBeVisible();
  });

  test('CSS fails, XPath text predicate succeeds on broken page', async ({ page }) => {
    await page.goto('/?broken');
    // CSS by ID fails (ID changed)
    const byId = page.locator('css=#login-form');
    const idCount = await byId.count();

    if (idCount === 0) {
      // XPath by form structure still works
      const byXpath = page.locator('xpath=//form[.//input[@type="password"]]');
      await expect(byXpath).toBeVisible();
    } else {
      await expect(byId).toBeVisible();
    }
  });

  test('XPath axis: find label from input', async ({ page }) => {
    await page.goto('/');
    // preceding-sibling axis to find the label for the username input
    const label = page.locator('xpath=//input[@data-test="signin-username"]/preceding-sibling::*[1]');
    // Falls back to ancestor axis on broken page
    if (await label.count() === 0) {
      const altLabel = page.locator('xpath=//input[@placeholder="Enter username"]/ancestor::div[1]/label');
      await expect(altLabel).toBeVisible();
    } else {
      await expect(label).toHaveText('Username');
    }
  });

  test('nth-child CSS selector for transaction rows', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-test="signin-username"]', 'demo');
    await page.fill('[data-test="signin-password"]', 'password123');
    await page.click('[data-test="signin-submit"]');
    await page.click('[data-test="nav-transactions"]');

    const thirdRow = page.locator('[data-test="transactions-body"] tr:nth-child(3)');
    await expect(thirdRow).toContainText('Electric Bill');
  });
});
