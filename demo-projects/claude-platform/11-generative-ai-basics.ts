/**
 * AI Fluency Demo: What is Generative AI?
 *
 * Shows what generative AI CAN and CANNOT do — using test automation
 * scenarios. Demonstrates capabilities (generate, transform, analyze)
 * and limitations (hallucination, no real execution, no memory).
 *
 * Run: npx tsx claude-platform/11-generative-ai-basics.ts
 */
import Anthropic from '@anthropic-ai/sdk';
import { loadAnthropicKey } from '../anthropic-key.js';

const client = new Anthropic({ apiKey: loadAnthropicKey() });

async function generativeAiDemo() {
  console.log('=== What is Generative AI? ===\n');
  console.log('Generative AI CREATES new content — it doesn\'t just search or retrieve.\n');

  // CAPABILITY 1: Generate — create new content from instructions
  console.log('--- Capability 1: GENERATE (Create New Content) ---');
  const generate = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: 'Write a Playwright test that verifies a user can see their account balance after login. Use getByRole locators. Just the test, no explanation.',
    }],
  });
  const genText = generate.content.find(b => b.type === 'text');
  console.log('  Prompt: "Write a test for account balance after login"');
  console.log('  Output:', genText?.text?.slice(0, 200), '...');
  console.log('  → AI GENERATED new code that never existed before\n');

  // CAPABILITY 2: Transform — change existing content
  console.log('--- Capability 2: TRANSFORM (Change Existing Content) ---');
  const transform = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 128,
    messages: [{
      role: 'user',
      content: `Convert this CSS selector to a getByRole locator:
page.click('[data-test="signin-submit"]')
The button says "Sign In". Just give the replacement line.`,
    }],
  });
  const transText = transform.content.find(b => b.type === 'text');
  console.log('  Input:  page.click(\'[data-test="signin-submit"]\')');
  console.log('  Output:', transText?.text?.trim());
  console.log('  → AI TRANSFORMED the locator strategy, same meaning\n');

  // CAPABILITY 3: Analyze — understand and explain
  console.log('--- Capability 3: ANALYZE (Understand & Explain) ---');
  const analyze = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `Why would this test fail?
await page.locator('#signin-btn').click();
Error: locator resolved to 0 elements
The HTML has: <button id="signin-btn-redesigned" class="button-primary">Log In</button>
One sentence answer.`,
    }],
  });
  const anaText = analyze.content.find(b => b.type === 'text');
  console.log('  Error: locator resolved to 0 elements');
  console.log('  Analysis:', anaText?.text?.trim());
  console.log('  → AI ANALYZED the root cause from context\n');

  // LIMITATION 1: Hallucination — confident but wrong
  console.log('=== LIMITATIONS ===\n');
  console.log('--- Limitation 1: HALLUCINATION (Confidently Wrong) ---');
  const hallucinate = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 128,
    messages: [{
      role: 'user',
      content: 'What is the Playwright method page.selfHeal() and how does it work? One sentence.',
    }],
  });
  const hallText = hallucinate.content.find(b => b.type === 'text');
  console.log('  Prompt: "What is page.selfHeal()?"');
  console.log('  Output:', hallText?.text?.trim());
  console.log('  → page.selfHeal() DOES NOT EXIST! AI may invent plausible-sounding answers.\n');

  // LIMITATION 2: No real execution
  console.log('--- Limitation 2: NO REAL EXECUTION ---');
  console.log('  AI cannot actually RUN your tests, click buttons, or open browsers.');
  console.log('  It can only GENERATE code for you to run.');
  console.log('  That\'s why we need MCP (Concept 4) — to give AI real tools.\n');

  // LIMITATION 3: No memory between calls
  console.log('--- Limitation 3: NO MEMORY ---');
  console.log('  Each API call starts from scratch. AI doesn\'t remember');
  console.log('  the test it wrote 5 minutes ago unless you send it again.\n');

  console.log('--- Key Takeaways ---');
  console.log('1. Generative AI CREATES (generate, transform, analyze) — not just retrieves');
  console.log('2. Capabilities: write tests, heal locators, explain failures, refactor code');
  console.log('3. Limitations: hallucination (invents answers), no execution, no memory');
  console.log('4. Always VERIFY AI output — never trust blindly (that\'s Discernment!)');
}

generativeAiDemo().catch(console.error);
