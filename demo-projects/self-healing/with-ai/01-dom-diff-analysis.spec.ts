import { test, expect } from '@playwright/test';
import { healLocator } from './claude-healer';

// The system under test here is a language model: the same prompt can produce
// different output run to run, so a strict assertion occasionally misses even
// when the model is right. Retries are the correct tool for a stochastic
// dependency — loosening the assertions would hide real regressions instead.
test.describe.configure({ retries: 2 });


test.describe('AI Self-Healing: DOM Diff Analysis', () => {
  test('Claude heals broken login button selector', async ({ page }) => {
    await page.goto('/?broken');
    const html = await page.content();

    const oldSelector = '[data-test="signin-submit"]';
    const found = await page.locator(oldSelector).count();
    expect(found).toBe(0); // confirm it's broken

    const healed = await healLocator({
      elementDescription: 'Login/Sign-in submit button',
      oldSelector,
      pageHtml: html,
    });

    console.log('Healed selector:', healed.selector);
    console.log('Strategy:', healed.strategy);
    console.log('Explanation:', healed.explanation);

    const healedElement = page.locator(healed.selector).first();
    await expect(healedElement).toBeVisible();
  });

  test('Claude heals broken username input selector', async ({ page }) => {
    await page.goto('/?broken');
    const html = await page.content();

    const healed = await healLocator({
      elementDescription: 'Username input field on login form',
      oldSelector: '[data-test="signin-username"]',
      pageHtml: html,
      errorMessage: 'data-test attribute was removed during redesign',
    });

    console.log('Healed:', JSON.stringify(healed, null, 2));

    const healedElement = page.locator(healed.selector).first();
    await expect(healedElement).toBeVisible();
    await healedElement.fill('demo');
    await expect(healedElement).toHaveValue('demo');
  });

  test('Claude heals broken nav selector', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-test="signin-username"]', 'demo');
    await page.fill('[data-test="signin-password"]', 'password123');
    await page.click('[data-test="signin-submit"]');
    await page.waitForSelector('[data-test="main-nav"]');

    // Now break the page
    await page.evaluate(() => {
      document.querySelectorAll('[data-test]').forEach(el => {
        const old = el.getAttribute('data-test')!;
        el.removeAttribute('data-test');
        el.setAttribute('data-qa', old.replace(/-/g, '_') + '_v2');
      });
    });

    const html = await page.content();
    const healed = await healLocator({
      elementDescription: 'Main sidebar navigation element',
      oldSelector: '[data-test="main-nav"]',
      pageHtml: html,
    });

    console.log('Healed nav:', JSON.stringify(healed, null, 2));
    const nav = page.locator(healed.selector).first();
    await expect(nav).toBeVisible();
  });
});
