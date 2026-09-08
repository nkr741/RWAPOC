import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

test.describe('Self-Healing: Structural Locators', () => {
  async function login(page: Page) {
    await page.goto('/');
    await page.fill('[data-test="signin-username"]', 'demo');
    await page.fill('[data-test="signin-password"]', 'password123');
    await page.click('[data-test="signin-submit"]');
    await page.waitForSelector('[data-test="user-greeting"]');
  }

  test('finds nav items using parent-child relationship', async ({ page }) => {
    await login(page);
    // Even if nav IDs change, structure stays: sidebar > links
    const nav = page.locator('nav[aria-label="Main navigation"]');
    const links = nav.locator('a');
    await expect(links).toHaveCount(4);
  });

  test('finds transaction rows using .filter()', async ({ page }) => {
    await login(page);
    await page.click('[data-test="nav-transactions"]');
    const rows = page.locator('[data-test="transactions-body"] tr');
    const incomeRows = rows.filter({ has: page.locator('.amount-positive') });
    await expect(incomeRows).toHaveCount(2);
  });

  test('finds balance section using layout structure', async ({ page }) => {
    await login(page);
    const balanceCards = page.locator('.balance-row .balance-card');
    await expect(balanceCards).toHaveCount(3);
    await expect(balanceCards.nth(0)).toContainText('Total Balance');
  });

  test('finds form inputs via parent form traversal', async ({ page }) => {
    await page.goto('/');
    const form = page.locator('#login-form');
    const inputs = form.locator('input');
    await expect(inputs).toHaveCount(2); // username + password
  });

  test('finds button using :has-text inside structural context', async ({ page }) => {
    await login(page);
    const topbar = page.locator('.topbar');
    const logoutBtn = topbar.locator('button', { hasText: /logout/i });
    await expect(logoutBtn).toBeVisible();
  });

  test('structural locators survive broken page', async ({ page }) => {
    await page.goto('/?broken');
    const form = page.locator('#login-form');
    await expect(form.locator('input')).toHaveCount(2);
    await page.getByPlaceholder('Enter username').fill('demo');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: /log in/i }).click();

    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav.locator('a')).toHaveCount(4);
  });
});
