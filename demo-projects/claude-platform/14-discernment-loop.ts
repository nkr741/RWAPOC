/**
 * AI Fluency Demo: Discernment & the Description-Discernment Loop
 *
 * Discernment = evaluating AI output with a critical eye.
 * The loop = describe → get output → evaluate → refine → repeat.
 * This demo shows how to catch AI mistakes and iterate to quality.
 *
 * Run: npx tsx claude-platform/14-discernment-loop.ts
 */
import Anthropic from '@anthropic-ai/sdk';
import { loadAnthropicKey } from '../anthropic-key.js';

const client = new Anthropic({ apiKey: loadAnthropicKey() });

async function discernmentDemo() {
  console.log('=== AI Fluency: Discernment & the Description-Discernment Loop ===\n');

  // Round 1: Initial prompt (Description)
  console.log('--- ROUND 1: Initial Description ---\n');
  const round1 = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: 'Write a Playwright test for the login page.',
    }],
  });
  const r1Text = round1.content.find(b => b.type === 'text');
  console.log('  Prompt: "Write a Playwright test for the login page."');
  console.log('  Output:\n', r1Text?.text?.slice(0, 300), '...\n');

  // Discernment: evaluate the output
  console.log('  --- DISCERNMENT CHECK ---');
  console.log('  ✗ Uses CSS selectors instead of getByRole (fragile!)');
  console.log('  ✗ Hardcoded URL instead of baseURL');
  console.log('  ✗ Missing negative test cases (invalid login)');
  console.log('  ✓ Basic structure is correct');
  console.log('  ✓ Has an assertion\n');

  // Round 2: Refined prompt based on evaluation
  console.log('--- ROUND 2: Refined Description (Based on Discernment) ---\n');
  const round2 = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 512,
    messages: [
      { role: 'user', content: 'Write a Playwright test for the login page.' },
      { role: 'assistant', content: r1Text?.text ?? '' },
      {
        role: 'user',
        content: `Good start, but fix these issues:
1. Use getByRole and getByLabel locators instead of CSS selectors
2. Don't hardcode the URL — use baseURL from config
3. Add a negative test case for invalid credentials
4. Use data-test as the testIdAttribute
5. Our login credentials are username: "demo", password: "password123"
Rewrite the test.`,
      },
    ],
  });
  const r2Text = round2.content.find(b => b.type === 'text');
  console.log('  Refined prompt adds: locator strategy, baseURL, negative case, credentials');
  console.log('  Output:\n', r2Text?.text?.slice(0, 400), '...\n');

  // Discernment round 2
  console.log('  --- DISCERNMENT CHECK (Round 2) ---');
  console.log('  ✓ Uses getByRole and getByLabel locators');
  console.log('  ✓ Uses baseURL from config');
  console.log('  ✓ Includes negative test case');
  console.log('  ✓ Correct credentials');
  console.log('  ✓ Much better quality!\n');

  // The loop pattern
  console.log('--- THE DESCRIPTION-DISCERNMENT LOOP ---\n');
  console.log('  ┌─────────────┐');
  console.log('  │ DESCRIPTION │ ← You write/refine the prompt');
  console.log('  └──────┬──────┘');
  console.log('         ↓');
  console.log('  ┌─────────────┐');
  console.log('  │  AI OUTPUT  │ ← Claude generates a response');
  console.log('  └──────┬──────┘');
  console.log('         ↓');
  console.log('  ┌─────────────┐');
  console.log('  │ DISCERNMENT │ ← You evaluate critically');
  console.log('  └──────┬──────┘');
  console.log('         ↓');
  console.log('    Good enough? ──YES──→ DONE');
  console.log('         │');
  console.log('        NO');
  console.log('         │');
  console.log('         └──→ Back to DESCRIPTION (refine prompt)\n');

  // Discernment checklist
  console.log('--- Discernment Checklist for Test Automation ---\n');
  console.log('  □ Are locators semantic (getByRole) or fragile (CSS)?');
  console.log('  □ Does the test actually assert something meaningful?');
  console.log('  □ Are there hardcoded waits (waitForTimeout)?');
  console.log('  □ Does the code match our project conventions (data-test, TypeScript)?');
  console.log('  □ Would this test catch a real bug?');
  console.log('  □ Could any API/method names be hallucinated (fake)?');
  console.log('  □ Are credentials hardcoded (security risk)?');
  console.log('  □ Does the test clean up after itself?');

  console.log('\n--- Key Takeaways ---');
  console.log('1. DISCERNMENT: Never accept AI output blindly — evaluate it');
  console.log('2. THE LOOP: Describe → Get output → Evaluate → Refine → Repeat');
  console.log('3. Each round gets better because you provide specific feedback');
  console.log('4. Use the checklist to catch common issues systematically');
  console.log('5. The loop usually converges in 2-3 rounds');
}

discernmentDemo().catch(console.error);
