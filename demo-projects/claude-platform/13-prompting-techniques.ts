/**
 * AI Fluency Demo: Description & Effective Prompting Techniques
 *
 * Description = communicating clearly with AI. This demo shows the
 * difference between vague and precise prompts, and teaches 5 key
 * prompting techniques using test automation examples.
 *
 * Run: npx tsx claude-platform/13-prompting-techniques.ts
 */
import Anthropic from '@anthropic-ai/sdk';
import { loadAnthropicKey } from '../anthropic-key.js';

const client = new Anthropic({ apiKey: loadAnthropicKey() });

async function promptingDemo() {
  console.log('=== AI Fluency: Description & Prompting Techniques ===\n');
  console.log('Description = communicating effectively with AI systems.\n');

  // TECHNIQUE 1: Vague vs. Precise
  console.log('--- Technique 1: Be Specific (Vague vs. Precise) ---\n');

  const vague = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 128,
    messages: [{ role: 'user', content: 'Write a test.' }],
  });
  const vagueText = vague.content.find(b => b.type === 'text');
  console.log('  BAD prompt:  "Write a test."');
  console.log('  Result:', vagueText?.text?.slice(0, 100), '...');
  console.log('  Problem: Too vague — what test? For what? In what framework?\n');

  const precise = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `Write a Playwright test in TypeScript that:
- Tests login with valid credentials (username: "demo", password: "password123")
- Uses getByRole and getByLabel locators (not CSS selectors)
- Verifies the user sees a welcome message after login
- Uses the testIdAttribute: "data-test"
Just the test code, no explanation.`,
    }],
  });
  const preciseText = precise.content.find(b => b.type === 'text');
  console.log('  GOOD prompt: Specific framework, locator strategy, credentials, assertion');
  console.log('  Result:', preciseText?.text?.slice(0, 150), '...');
  console.log('  → Specific prompts get specific, usable results\n');

  // TECHNIQUE 2: Provide Context
  console.log('--- Technique 2: Provide Context ---\n');

  const noContext = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 128,
    messages: [{ role: 'user', content: 'Fix this locator: [data-test="submit-btn"]' }],
  });
  const noCtxText = noContext.content.find(b => b.type === 'text');
  console.log('  WITHOUT context: "Fix this locator: [data-test=\\"submit-btn\\"]"');
  console.log('  Result:', noCtxText?.text?.slice(0, 100));

  const withContext = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 128,
    messages: [{
      role: 'user',
      content: `Fix this broken locator: [data-test="submit-btn"]
Context: The data-test attributes were removed in a redesign.
Current HTML: <button type="submit" class="btn-primary">Save Changes</button>
Give just the Playwright locator code.`,
    }],
  });
  const ctxText = withContext.content.find(b => b.type === 'text');
  console.log('  WITH context: Includes current HTML and what changed');
  console.log('  Result:', ctxText?.text?.trim());
  console.log('  → Context = better answers. AI can\'t see your screen.\n');

  // TECHNIQUE 3: Few-Shot Examples
  console.log('--- Technique 3: Few-Shot Examples (Show, Don\'t Tell) ---\n');

  const fewShot = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 128,
    messages: [{
      role: 'user',
      content: `Convert CSS selectors to Playwright getByRole locators.

Examples:
- [data-test="login-btn"] → page.getByRole('button', { name: /log in/i })
- [data-test="email-input"] → page.getByRole('textbox', { name: /email/i })
- [data-test="nav-home"] → page.getByRole('link', { name: /home/i })

Now convert: [data-test="search-field"]
The input has placeholder "Search transactions..."`,
    }],
  });
  const fsText = fewShot.content.find(b => b.type === 'text');
  console.log('  Technique: Provide 3 examples of the pattern you want');
  console.log('  Result:', fsText?.text?.trim());
  console.log('  → Examples teach the pattern better than instructions\n');

  // TECHNIQUE 4: Role Assignment
  console.log('--- Technique 4: Role Assignment (Persona) ---\n');

  const withRole = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 128,
    system: 'You are a senior QA architect who writes bulletproof Playwright tests. You always use semantic locators and never hardcode waits.',
    messages: [{
      role: 'user',
      content: 'Write a locator for the main navigation menu.',
    }],
  });
  const roleText = withRole.content.find(b => b.type === 'text');
  console.log('  System prompt: "You are a senior QA architect..."');
  console.log('  Result:', roleText?.text?.trim());
  console.log('  → Roles shape tone, expertise level, and defaults\n');

  // TECHNIQUE 5: Chain of Thought
  console.log('--- Technique 5: Chain of Thought (Step by Step) ---\n');

  const cot = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `A test expects 3 transaction items but finds 7.

Step by step:
1. What could cause this discrepancy?
2. Is it a test bug or an app bug?
3. What's the fix?

Be brief.`,
    }],
  });
  const cotText = cot.content.find(b => b.type === 'text');
  console.log('  Technique: Ask Claude to reason step-by-step');
  console.log('  Result:', cotText?.text?.slice(0, 200));
  console.log('  → "Step by step" forces structured, deeper reasoning\n');

  // Summary
  console.log('--- 5 Prompting Techniques Summary ---');
  console.log('  1. BE SPECIFIC     — Framework, language, constraints, format');
  console.log('  2. GIVE CONTEXT    — HTML, error messages, what changed');
  console.log('  3. FEW-SHOT        — Show 2-3 examples of what you want');
  console.log('  4. ROLE ASSIGNMENT — "You are a senior QA architect..."');
  console.log('  5. CHAIN OF THOUGHT — "Step by step" for complex reasoning');
}

promptingDemo().catch(console.error);
