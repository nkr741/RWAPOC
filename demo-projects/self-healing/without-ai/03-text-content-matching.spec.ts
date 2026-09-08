import { test, expect } from '@playwright/test';

test.describe('Self-Healing: Text & Semantic Matching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?broken');
  });

  test('finds login button by role even after text change', async ({ page }) => {
    // Text changed from "Sign In" to "Log In" — role+name still works
    const btn = page.getByRole('button', { name: /log in|sign in/i });
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  test('finds username input by placeholder', async ({ page }) => {
    const input = page.getByPlaceholder('Enter username');
    await expect(input).toBeVisible();
    await input.fill('demo');
    await expect(input).toHaveValue('demo');
  });

  test('finds password input by label', async ({ page }) => {
    const input = page.getByLabel('Password');
    await expect(input).toBeVisible();
    await input.fill('password123');
  });

  test('finds login title by text content', async ({ page }) => {
    const title = page.getByText(/sign in|log in/i).first();
    await expect(title).toBeVisible();
  });

  test('finds signup link by role', async ({ page }) => {
    const link = page.getByRole('link', { name: /sign up/i });
    await expect(link).toBeVisible();
  });

  test('full login flow using only semantic locators on broken page', async ({ page }) => {
    await page.getByPlaceholder('Enter username').fill('demo');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: /log in|sign in/i }).click();
    await expect(page.locator('h1', { hasText: /welcome|hello/i })).toBeVisible();
  });
});
