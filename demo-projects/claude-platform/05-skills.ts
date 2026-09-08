/**
 * Claude Platform Demo: Skills & System Prompts
 *
 * Demonstrates how system prompts and "skills" shape Claude's behavior
 * for specific test automation tasks. Skills are reusable prompt patterns
 * that make Claude an expert at a particular job.
 *
 * Run: npx tsx claude-platform/05-skills.ts
 */
import Anthropic from '@anthropic-ai/sdk';
import { loadAnthropicKey } from '../anthropic-key.js';

const client = new Anthropic({ apiKey: loadAnthropicKey() });

const skills = {
  testReviewer: `You are a Playwright test code reviewer. Review test code for:
- Flaky patterns (race conditions, timing dependencies)
- Missing assertions (expect-expect rule)
- Hardcoded waits (no waitForTimeout)
- Force clicks (no { force: true })
- Proper use of web-first assertions
- Test isolation issues
Rate each issue: critical / warning / info.
Output as JSON array of {line, severity, issue, fix}.`,

  locatorAuditor: `You are a Playwright locator resilience auditor. Analyze locators and rate them:
- S tier: getByRole, getByLabel, getByText (semantic, resilient)
- A tier: getByTestId, data-test attributes (explicit, maintainable)
- B tier: CSS class selectors (fragile to styling changes)
- C tier: nth-child, complex CSS (very fragile)
- F tier: XPath with absolute paths (breaks on any DOM change)
For each locator, suggest an upgrade path to S/A tier.`,

  testGenerator: `You are a Playwright test generator. Given a feature description:
1. Identify test scenarios (happy path, edge cases, error cases)
2. Generate Playwright test code using best practices:
   - Use Page Object Model
   - Prefer getByRole/getByLabel over CSS selectors
   - Include proper assertions
   - Handle async operations correctly
   - Add descriptive test names
3. Output complete, runnable test code.`,

  bugAnalyzer: `You are a test failure root cause analyst. When given a failure:
1. Identify: is this a test bug, app bug, or environment issue?
2. Check for common patterns:
   - Timing/race condition
   - State leakage between tests
   - Missing test data setup
   - API dependency failure
   - Browser-specific issue
3. Provide: diagnosis, confidence level (high/medium/low), fix.`,
};

async function demonstrateSkill(skillName: string, prompt: string, userMessage: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Skill: ${skillName}`);
  console.log('='.repeat(60));

  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 1024,
    system: prompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content.find(b => b.type === 'text');
  console.log(text?.text ?? '(no response)');
}

async function skillsDemo() {
  console.log('=== Claude Skills Demo ===');
  console.log('Skills = system prompts that make Claude an expert at specific tasks.\n');

  // Demo 1: Test Reviewer
  await demonstrateSkill(
    'Test Reviewer',
    skills.testReviewer,
    `Review this test code:
\`\`\`typescript
test('checkout flow', async ({ page }) => {
  await page.goto('/cart');
  await page.waitForTimeout(2000);
  await page.click('.checkout-btn', { force: true });
  await page.fill('#card-number', '4242424242424242');
  await page.click('//div[@class="submit-area"]/button[1]');
  // no assertion
});
\`\`\``
  );

  // Demo 2: Locator Auditor
  await demonstrateSkill(
    'Locator Auditor',
    skills.locatorAuditor,
    `Audit these locators:
1. page.getByRole('button', { name: 'Submit' })
2. page.locator('[data-test="login-btn"]')
3. page.locator('.MuiButton-root.MuiButton-containedPrimary')
4. page.locator('div > div:nth-child(3) > button')
5. page.locator('xpath=//html/body/div[1]/main/form/button')`
  );

  console.log('\n--- Key Concepts ---');
  console.log('1. Skills = system prompts that shape Claude\'s expertise');
  console.log('2. Same model, different skill → different specialist behavior');
  console.log('3. Skills are composable — chain reviewer → fixer → verifier');
  console.log('4. In Claude Code, skills live in .claude/skills/ as markdown files');
  console.log('5. Pattern: define the role, the checklist, and the output format');
}

skillsDemo().catch(console.error);
