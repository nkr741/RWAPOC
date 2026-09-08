import { test, expect } from '@playwright/test';
import { generatePageObject, askClaude, stripComments } from './claude-healer';

// The system under test here is a language model: the same prompt can produce
// different output run to run, so a strict assertion occasionally misses even
// when the model is right. Retries are the correct tool for a stochastic
// dependency — loosening the assertions would hide real regressions instead.
test.describe.configure({ retries: 2 });


test.describe('AI Self-Healing: Page Object Regeneration', () => {
  test('Claude generates LoginPage object from HTML', async ({ page }) => {
    await page.goto('/?broken');
    const html = await page.content();

    const pageObjectCode = await generatePageObject({
      pageHtml: html,
      pageName: 'Login',
    });

    console.log('Generated LoginPage:\n', pageObjectCode);

    expect(pageObjectCode).toContain('class LoginPage');
    expect(pageObjectCode).toContain('waitForLoaded');
    // Should use semantic locators since data-test is gone
    const usesSemanticLocators = /getByRole|getByLabel|getByPlaceholder/.test(pageObjectCode);
    expect(usesSemanticLocators).toBe(true);
  });

  test('Claude generates DashboardPage object', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-test="signin-username"]', 'demo');
    await page.fill('[data-test="signin-password"]', 'password123');
    await page.click('[data-test="signin-submit"]');
    await page.waitForSelector('[data-test="user-greeting"]');

    const html = await page.content();
    const pageObjectCode = await generatePageObject({
      pageHtml: html,
      pageName: 'Dashboard',
    });

    console.log('Generated DashboardPage:\n', pageObjectCode);

    expect(pageObjectCode).toContain('class DashboardPage');
    expect(pageObjectCode).toContain('waitForLoaded');
  });

  test('Claude compares old vs new page object', async ({ page }) => {
    const oldPageObject = `
export class LoginPage {
  readonly usernameInput = this.page.locator('[data-test="signin-username"]');
  readonly passwordInput = this.page.locator('[data-test="signin-password"]');
  readonly submitButton = this.page.locator('[data-test="signin-submit"]');
  constructor(private page: Page) {}
  async login(user: string, pass: string) {
    await this.usernameInput.fill(user);
    await this.passwordInput.fill(pass);
    await this.submitButton.click();
  }
}`;

    await page.goto('/?broken');
    const html = await page.content();

    const prompt = `Compare this old Page Object with the current HTML and generate an updated version.

Old Page Object:
\`\`\`typescript
${oldPageObject}
\`\`\`

Current HTML (data-test attributes have been removed):
\`\`\`html
${html.slice(0, 6000)}
\`\`\`

Generate the updated Page Object class that works with the current HTML.
Show what changed with // CHANGED comments on modified lines.
Return only TypeScript code, no markdown fences.`;

    const updated = await askClaude(prompt);
    console.log('Updated Page Object:\n', updated);

    expect(updated).toContain('class LoginPage');
    // The prompt above asks for "// CHANGED" comments showing what was replaced,
    // so the old [data-test=...] selectors legitimately appear in comments.
    // Assert against the code with comments stripped, or the two contradict.
    expect(stripComments(updated)).not.toContain('[data-test=');
    expect(updated).toContain('CHANGED');
  });
});
