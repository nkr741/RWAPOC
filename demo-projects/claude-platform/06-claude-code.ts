/**
 * Claude Platform Demo: Claude Code Integration
 *
 * Demonstrates using Claude to generate Playwright tests from natural language
 * descriptions — the core pattern behind Claude Code's test generation.
 *
 * Run: npx tsx claude-platform/06-claude-code.ts
 */
import Anthropic from '@anthropic-ai/sdk';
import { loadAnthropicKey } from '../anthropic-key.js';

const client = new Anthropic({ apiKey: loadAnthropicKey() });

async function generateTestFromNaturalLanguage(featureDescription: string, pageHtml: string) {
  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 2048,
    system: `You are an expert Playwright test automation engineer. Generate production-ready Playwright tests from natural language descriptions.

Rules:
- Use TypeScript with @playwright/test
- Prefer semantic locators: getByRole, getByLabel, getByText, getByPlaceholder
- Use data-test attributes as fallback when semantic locators aren't suitable
- Include proper web-first assertions (toBeVisible, toHaveText, toContainText)
- No waitForTimeout — use auto-waiting and web-first assertions
- No force clicks
- Include test.describe blocks with meaningful names
- Add edge case tests where appropriate
- Output only valid TypeScript code, no markdown`,
    messages: [
      {
        role: 'user',
        content: `Generate Playwright tests for this feature:

${featureDescription}

Here is the HTML of the page being tested:
\`\`\`html
${pageHtml}
\`\`\``,
      },
    ],
  });

  const text = response.content.find(b => b.type === 'text');
  return text?.text ?? '';
}

async function claudeCodeDemo() {
  console.log('=== Claude Code Test Generation Demo ===\n');

  const pageHtml = `
<form data-test="login-form">
  <input data-test="signin-username" placeholder="Enter username" aria-label="Username">
  <input type="password" data-test="signin-password" placeholder="Enter password" aria-label="Password">
  <div data-test="login-error" class="alert-error" style="display:none"></div>
  <button type="submit" data-test="signin-submit">Sign In</button>
  <a data-test="signup-link">Sign Up</a>
</form>`;

  // Demo 1: Generate tests from natural language
  console.log('--- Demo 1: Natural Language → Test Code ---\n');
  const loginTests = await generateTestFromNaturalLanguage(
    `Test the login page:
    - User can login with valid credentials (demo/password123)
    - Show error message for invalid credentials
    - Username and password fields are required
    - Signup link is visible`,
    pageHtml
  );
  console.log(loginTests);

  // Demo 2: Generate tests for a more complex feature
  console.log('\n--- Demo 2: Complex Feature Test Generation ---\n');
  const dashboardHtml = `
<div data-test="page-dashboard">
  <h1 data-test="user-greeting">Welcome, Demo User</h1>
  <div class="balance-row">
    <div class="balance-card"><div class="value" data-test="account-balance">$1,234.56</div></div>
    <div class="balance-card"><div class="value" data-test="income-amount">$3,200.00</div></div>
    <div class="balance-card"><div class="value" data-test="expense-amount">$1,965.44</div></div>
  </div>
  <table data-test="recent-transactions-table">
    <tbody>
      <tr data-test="transaction-item-1"><td>Aug 15</td><td>Coffee Shop</td><td>-$4.50</td></tr>
      <tr data-test="transaction-item-2"><td>Aug 14</td><td>Salary Deposit</td><td>+$3,200.00</td></tr>
    </tbody>
  </table>
</div>`;

  const dashboardTests = await generateTestFromNaturalLanguage(
    `Test the banking dashboard:
    - Displays user greeting with their name
    - Shows account balance, income, and expense amounts
    - Recent transactions table shows at least 2 entries
    - Transaction amounts are formatted as currency`,
    dashboardHtml
  );
  console.log(dashboardTests);

  console.log('\n--- Key Concepts ---');
  console.log('1. Claude Code uses system prompts to enforce test best practices');
  console.log('2. HTML context helps generate accurate, working selectors');
  console.log('3. Natural language → structured test code is a core Claude Code pattern');
  console.log('4. The same approach works for: test gen, fixture gen, page object gen');
  console.log('5. In practice: `claude "write tests for the checkout flow"`');
}

claudeCodeDemo().catch(console.error);
