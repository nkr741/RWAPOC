import { test, expect } from '@playwright/test';

const HEROKU = 'https://the-internet.herokuapp.com';

test.describe('Soft Assertions', () => {
  test('should continue execution after soft assertion failures', async ({ page }) => {
    await page.goto(`${HEROKU}/checkboxes`);

    await expect.soft(page.locator('#checkboxes')).toBeVisible();
    await expect.soft(page.locator('#checkboxes input')).toHaveCount(2);
    await expect.soft(page.locator('#checkboxes input').last()).toBeChecked();
    await expect.soft(page.locator('h3')).toContainText('Checkboxes');

    await expect(page).toHaveURL(/\/checkboxes/);
  });

  test('should collect multiple soft assertions on a data page', async ({ page }) => {
    await page.goto(`${HEROKU}/challenging_dom`);

    await expect.soft(page.locator('table')).toBeVisible();
    await expect.soft(page.locator('table tr')).not.toHaveCount(0);
    await expect.soft(page.locator('.large-2.columns a').first()).toBeVisible();
    await expect.soft(page.locator('h3')).toHaveText('Challenging DOM');

    const rows = await page.locator('table tbody tr').count();
    expect(rows).toBeGreaterThan(0);
  });
});
