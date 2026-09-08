/**
 * AI Fluency Demo: Delegation
 *
 * Delegation = deciding what work to do with AI vs. yourself.
 * This demo classifies test automation tasks into: do yourself,
 * collaborate with AI, or let AI handle it.
 *
 * Run: npx tsx claude-platform/12-delegation.ts
 */
import Anthropic from '@anthropic-ai/sdk';
import { loadAnthropicKey } from '../anthropic-key.js';

const client = new Anthropic({ apiKey: loadAnthropicKey() });

interface Task {
  name: string;
  category: 'YOU' | 'COLLABORATE' | 'AI';
  reason: string;
}

const AUTOMATION_TASKS: Task[] = [
  { name: 'Define what to test (requirements)', category: 'YOU', reason: 'Only you know the business context and priorities' },
  { name: 'Write semantic locators for a page', category: 'COLLABORATE', reason: 'AI generates, you review for accuracy' },
  { name: 'Convert 50 CSS selectors to getByRole', category: 'AI', reason: 'Repetitive transformation — perfect for AI batch processing' },
  { name: 'Debug a flaky test', category: 'COLLABORATE', reason: 'AI analyzes patterns, you know the app\'s behavior' },
  { name: 'Decide the test framework', category: 'YOU', reason: 'Strategic decision requiring team/org context' },
  { name: 'Generate boilerplate test setup', category: 'AI', reason: 'Standard patterns AI can produce perfectly' },
  { name: 'Review test coverage gaps', category: 'COLLABORATE', reason: 'AI scans code, you judge business importance' },
  { name: 'Fix a broken locator', category: 'AI', reason: 'Mechanical fix — AI reads HTML and suggests the replacement' },
  { name: 'Design the Page Object architecture', category: 'YOU', reason: 'Architecture decisions need human judgment and team context' },
  { name: 'Write API test assertions', category: 'COLLABORATE', reason: 'AI generates assertions, you validate the expected values' },
];

async function delegationDemo() {
  console.log('=== AI Fluency: Delegation ===\n');
  console.log('Delegation = deciding what work to do WITH AI vs. doing YOURSELF.\n');

  // Show the 3 modes
  console.log('--- 3 Modes of Working with AI ---\n');
  console.log('  AUTOMATION  → AI executes a specific task based on your instructions');
  console.log('                Example: "Convert this CSS selector to getByRole"');
  console.log('  AUGMENTATION → You and AI collaborate as partners');
  console.log('                Example: "Help me debug this flaky test"');
  console.log('  AGENCY      → AI works independently on your behalf');
  console.log('                Example: "Monitor tests and heal broken locators overnight"\n');

  // Show task classification
  console.log('--- Task Classification for Test Automation ---\n');
  console.log('  Task                                | Who?        | Why');
  console.log('  ------------------------------------|-------------|---------------------------');
  for (const t of AUTOMATION_TASKS) {
    const who = t.category === 'YOU' ? '🧑 YOU' : t.category === 'COLLABORATE' ? '🤝 BOTH' : '🤖 AI';
    console.log(`  ${t.name.padEnd(36)}| ${who.padEnd(12)}| ${t.reason}`);
  }

  // Live demo: delegation decision
  console.log('\n--- Live Demo: Ask Claude to Help You Decide ---\n');

  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `I need to migrate 200 Cypress tests to Playwright. Classify these sub-tasks as "Do yourself", "Collaborate with AI", or "Let AI handle":
1. Choose the Playwright test structure (describe/it vs test blocks)
2. Convert cy.get('.btn') selectors to Playwright locators
3. Rewrite custom Cypress commands as Playwright fixtures
4. Update CI pipeline configuration
5. Decide which tests to keep vs. remove
Answer as a simple table.`,
    }],
  });
  const text = response.content.find(b => b.type === 'text');
  console.log('  Prompt: "Classify these Cypress→Playwright migration tasks"');
  console.log('  Claude says:\n');
  console.log(text?.text);

  // Decision framework
  console.log('\n--- Delegation Decision Framework ---\n');
  console.log('  Ask yourself these questions:');
  console.log('  1. Does this need BUSINESS CONTEXT?     → Do it yourself');
  console.log('  2. Is this REPETITIVE or MECHANICAL?     → Let AI handle it');
  console.log('  3. Does it need CREATIVITY + ACCURACY?   → Collaborate');
  console.log('  4. Could a wrong answer cause HARM?      → Do it yourself (or verify)');
  console.log('  5. Would this take ME hours but AI mins?  → Delegate to AI');

  console.log('\n--- Key Takeaways ---');
  console.log('1. Not everything should go to AI — strategic decisions stay with you');
  console.log('2. Repetitive/mechanical tasks are the best candidates for AI');
  console.log('3. Complex tasks work best as collaboration (AI drafts, you review)');
  console.log('4. The 3 modes: Automation (AI does), Augmentation (together), Agency (AI leads)');
}

delegationDemo().catch(console.error);
