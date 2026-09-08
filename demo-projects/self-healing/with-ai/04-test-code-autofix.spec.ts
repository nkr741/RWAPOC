import { test, expect } from '@playwright/test';
import { askClaude, stripComments } from './claude-healer';

// The system under test here is a language model: the same prompt can produce
// different output run to run, so a strict assertion occasionally misses even
// when the model is right. Retries are the correct tool for a stochastic
// dependency — loosening the assertions would hide real regressions instead.
test.describe.configure({ retries: 2 });


test.describe('AI Self-Healing: Test Code Auto-Fix', () => {
  const brokenTestCode = `
    test('should login successfully', async ({ page }) => {
      await page.goto('/');
      await page.fill('[data-test="signin-username"]', 'demo');
      await page.fill('[data-test="signin-password"]', 'password123');
      await page.click('[data-test="signin-submit"]');
      await expect(page.locator('[data-test="user-greeting"]')).toBeVisible();
    });
  `;

  test('Claude rewrites test code with working selectors', async ({ page }) => {
    await page.goto('/?broken');
    const html = await page.content();

    const prompt = `This Playwright test code is broken because data-test attributes were removed during a UI redesign:

\`\`\`typescript
${brokenTestCode}
\`\`\`

Current page HTML:
\`\`\`html
${html.slice(0, 6000)}
\`\`\`

Rewrite the test code using selectors that work with the current HTML.
Prefer semantic selectors (getByRole, getByLabel, getByPlaceholder, getByText).
Return ONLY the test function body code (the lines inside the test callback), no markdown fences, no test() wrapper.`;

    const fixedCode = await askClaude(prompt);
    console.log('Fixed test code:\n', fixedCode);

    expect(fixedCode).toBeTruthy();
    // Check the CODE, not the prose: the model often explains which data-test
    // selector it replaced, and that comment is documentation, not a defect.
    expect(stripComments(fixedCode)).not.toContain('data-test=');
    // Should use semantic locators
    const hasSemanticLocator = /getByRole|getByLabel|getByPlaceholder|getByText|aria-label/.test(fixedCode);
    expect(hasSemanticLocator).toBe(true);
  });

  test('Claude fixes a transaction page test', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-test="signin-username"]', 'demo');
    await page.fill('[data-test="signin-password"]', 'password123');
    await page.click('[data-test="signin-submit"]');
    await page.waitForSelector('[data-test="main-nav"]');

    // Break locators
    await page.evaluate(() => {
      document.querySelectorAll('[data-test]').forEach(el => {
        const old = el.getAttribute('data-test')!;
        el.removeAttribute('data-test');
        el.setAttribute('data-qa', old.replace(/-/g, '_') + '_v2');
      });
    });

    const html = await page.content();
    const brokenTxTest = `
      await page.click('[data-test="nav-transactions"]');
      await page.fill('[data-test="transaction-search"]', 'Coffee');
      const rows = page.locator('[data-test^="tx-row-"]');
      await expect(rows).toHaveCount(1);
    `;

    const prompt = `This test code is broken — data-test attributes changed to data-qa with _v2 suffix:

\`\`\`typescript
${brokenTxTest}
\`\`\`

Current HTML:
\`\`\`html
${html.slice(0, 6000)}
\`\`\`

Rewrite using selectors that work now. Return only the code, no fences.`;

    const fixed = await askClaude(prompt);
    console.log('Fixed transaction test:\n', fixed);
    expect(fixed).toBeTruthy();
  });
});
