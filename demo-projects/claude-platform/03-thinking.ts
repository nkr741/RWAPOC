/**
 * Claude Platform Demo: Extended Thinking
 *
 * Demonstrates Claude's extended thinking (chain-of-thought) for complex
 * test analysis — you can see Claude's internal reasoning before the answer.
 *
 * Run: npx tsx claude-platform/03-thinking.ts
 */
import Anthropic from '@anthropic-ai/sdk';
import { loadAnthropicKey } from '../anthropic-key.js';

const client = new Anthropic({ apiKey: loadAnthropicKey() });

async function thinkingDemo() {
  console.log('=== Claude Extended Thinking Demo ===\n');

  const testFailure = `
FAILED tests/e2e/transactions.spec.ts
  ✗ should filter transactions by amount range (12.4s)
    Error: expect(received).toHaveCount(expected)
    Expected: 3
    Received: 7

    Locator: [data-test="transaction-item"]

    Test code:
      await page.fill('[data-test="amount-min"]', '100');
      await page.fill('[data-test="amount-max"]', '500');
      await page.click('[data-test="filter-apply"]');
      await expect(page.locator('[data-test="transaction-item"]')).toHaveCount(3);

    The filter button click appears to work (no error), but the count doesn't change.
    This test was passing last week before the React 18 upgrade.
  `;

  console.log('Sending complex test failure for analysis with extended thinking...\n');

  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 16000,
    // Adaptive thinking: Claude decides how much reasoning each request needs.
    // The old fixed `budget_tokens` form is rejected outright on current models.
    // `display: 'summarized'` is opt-in — without it thinking blocks come back
    // empty and it looks like the model didn't reason at all.
    // How hard it thinks is now an effort level rather than a token budget.
    // Both fields are newer than the SDK version pinned here, so they're passed
    // through a cast; on a current SDK you'd write them as normal fields.
    ...({
      thinking: { type: 'adaptive', display: 'summarized' },
      output_config: { effort: 'high' },
    } as Record<string, unknown>),
    messages: [
      {
        role: 'user',
        content: `You are a senior test automation architect. Analyze this test failure deeply.

${testFailure}

Consider:
1. What could cause filters to "not apply" after a React upgrade?
2. What race conditions might exist?
3. What's the root cause vs symptoms?
4. Provide the fix with explanation.`,
      },
    ],
  });

  for (const block of response.content) {
    if (block.type === 'thinking') {
      console.log('=== CLAUDE\'S INTERNAL REASONING ===');
      console.log(block.thinking);
      console.log('=== END REASONING ===\n');
    } else if (block.type === 'text') {
      console.log('=== CLAUDE\'S ANSWER ===');
      console.log(block.text);
    }
  }

  console.log('\n--- Key Concepts ---');
  console.log('1. thinking: { type: "adaptive" } lets Claude decide how much to reason');
  console.log('2. display: "summarized" is opt-in — without it the thinking text is empty');
  console.log('3. A summary of the reasoning arrives in "thinking" blocks');
  console.log('4. The final "text" block is the polished answer');
  console.log('5. Extended thinking excels at: root cause analysis, debugging, architecture');
  console.log('6. output_config.effort (low..max) replaces the old budget_tokens dial');
}

thinkingDemo().catch(console.error);
