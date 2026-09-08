import { test, expect } from '@playwright/test';
import { askClaude } from './claude-healer';

// The system under test here is a language model: the same prompt can produce
// different output run to run, so a strict assertion occasionally misses even
// when the model is right. Retries are the correct tool for a stochastic
// dependency — loosening the assertions would hide real regressions instead.
test.describe.configure({ retries: 2 });


test.describe('AI Self-Healing: Semantic Locator Generation', () => {
  test('Claude generates locator from intent description', async ({ page }) => {
    await page.goto('/?broken');
    const html = await page.content();

    const prompt = `Given this HTML page, I want to interact with specific elements. For each intent, provide the best Playwright locator.

HTML (partial):
\`\`\`html
${html.slice(0, 6000)}
\`\`\`

Intents:
1. "The field where users type their username"
2. "The field where users type their password"
3. "The button that submits the login form"
4. "The link to create a new account"

Respond as a JSON array of objects with {intent, selector, method} where method is the Playwright method name (getByRole, getByLabel, locator, etc). No markdown fences.`;

    const result = await askClaude(prompt);
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const locators = JSON.parse(cleaned) as Array<{ intent: string; selector: string; method: string }>;

    console.log('Intent-based locators:', JSON.stringify(locators, null, 2));
    expect(locators.length).toBeGreaterThanOrEqual(4);

    // Verify each generated locator actually works
    for (const loc of locators) {
      const element = page.locator(loc.selector).first();
      const count = await element.count();
      console.log(`  "${loc.intent}" → ${loc.selector} → found: ${count > 0}`);
      expect(count).toBeGreaterThan(0);
    }
  });

  test('Claude generates resilient locators for dashboard', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-test="signin-username"]', 'demo');
    await page.fill('[data-test="signin-password"]', 'password123');
    await page.click('[data-test="signin-submit"]');
    await page.waitForSelector('[data-test="user-greeting"]');

    // Break all data-test attributes
    await page.evaluate(() => {
      document.querySelectorAll('[data-test]').forEach(el => el.removeAttribute('data-test'));
    });

    const html = await page.content();
    const prompt = `Analyze this banking dashboard HTML and generate Playwright locators that are resilient to data-test attribute changes.

HTML:
\`\`\`html
${html.slice(0, 6000)}
\`\`\`

Generate locators for:
1. User greeting/welcome message
2. Account balance display
3. Logout button
4. Navigation link to Transactions

IMPORTANT: each "selector" must be a single CSS or XPath selector STRING that can be
passed directly to page.locator(). Do NOT return chained Playwright API expressions
(no page.getByRole(...), no .or(...), no .first()). Prefer stable, semantic hooks such
as [aria-label="..."], [role="..."], :has-text("..."), or structural CSS.

Respond as JSON array: [{name, selector, rationale}]. No markdown fences.`;

    const result = await askClaude(prompt);
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const locators = JSON.parse(cleaned) as Array<{ name: string; selector: string; rationale: string }>;

    for (const loc of locators) {
      console.log(`${loc.name}: ${loc.selector} (${loc.rationale})`);
      const el = page.locator(loc.selector).first();
      expect(await el.count()).toBeGreaterThan(0);
    }
  });
});
