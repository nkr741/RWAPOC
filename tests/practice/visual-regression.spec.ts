import { test, expect } from '@playwright/test';

test.skip(!!process.env.CI, 'Visual regression skipped in CI — no Linux baselines');

test.describe('Visual Regression — toHaveScreenshot', () => {
  test('should match full page screenshot', async ({ page }) => {
    await page.setContent(`
      <div style="padding:20px;font-family:Arial,sans-serif;background:white">
        <h1 style="color:#333;margin:0 0 12px">Visual Regression Test</h1>
        <p style="color:#666">Deterministic content for screenshot comparison.</p>
        <div style="width:200px;height:80px;background:#4CAF50;border-radius:8px;margin:16px 0;
                    display:flex;align-items:center;justify-content:center;color:white;font-weight:bold">
          Green Box
        </div>
      </div>
    `);

    await expect(page).toHaveScreenshot('full-page.png');
  });

  test('should match element-level screenshot', async ({ page }) => {
    await page.setContent(`
      <div style="padding:20px">
        <button style="padding:12px 24px;background:#2196F3;color:white;border:none;
                       border-radius:4px;font-size:16px;cursor:pointer">
          Primary Button
        </button>
      </div>
    `);

    await expect(page.locator('button')).toHaveScreenshot('button-element.png');
  });
});
