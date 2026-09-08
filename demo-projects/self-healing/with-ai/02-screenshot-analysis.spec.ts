import { test, expect } from '@playwright/test';
import { analyzeScreenshot } from './claude-healer';

// The system under test here is a language model: the same prompt can produce
// different output run to run, so a strict assertion occasionally misses even
// when the model is right. Retries are the correct tool for a stochastic
// dependency — loosening the assertions would hide real regressions instead.
test.describe.configure({ retries: 2 });


test.describe('AI Self-Healing: Screenshot Analysis (Vision)', () => {
  test('Claude identifies login button from screenshot', async ({ page }) => {
    await page.goto('/?broken');
    const screenshot = await page.screenshot();
    const html = await page.content();

    const result = await analyzeScreenshot({
      screenshotBase64: screenshot.toString('base64'),
      elementDescription: 'Login submit button',
      pageHtml: html,
    });

    console.log('Vision result:', JSON.stringify(result, null, 2));

    const element = page.locator(result.selector).first();
    await expect(element).toBeVisible();
  });

  test('Claude finds nav from screenshot after redesign', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-test="signin-username"]', 'demo');
    await page.fill('[data-test="signin-password"]', 'password123');
    await page.click('[data-test="signin-submit"]');
    await page.waitForSelector('[data-test="user-greeting"]');

    // Break locators in-page
    await page.evaluate(() => {
      document.querySelectorAll('[data-test]').forEach(el => {
        el.removeAttribute('data-test');
      });
    });

    const screenshot = await page.screenshot();
    const html = await page.content();

    const result = await analyzeScreenshot({
      screenshotBase64: screenshot.toString('base64'),
      elementDescription: 'Main navigation sidebar with links to Dashboard, Transactions, etc.',
      pageHtml: html,
    });

    console.log('Nav vision result:', JSON.stringify(result, null, 2));
    const nav = page.locator(result.selector).first();
    await expect(nav).toBeVisible();
  });
});
