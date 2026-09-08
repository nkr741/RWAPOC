/**
 * Claude Platform Demo: Context Management
 *
 * Shows how Claude manages conversation context — system prompts, multi-turn
 * history, token budgets, and prompt caching for cost savings.
 *
 * Run: npx tsx claude-platform/09-context-management.ts
 */
import Anthropic from '@anthropic-ai/sdk';
import { loadAnthropicKey } from '../anthropic-key.js';

const client = new Anthropic({ apiKey: loadAnthropicKey() });

async function contextManagementDemo() {
  console.log('=== Claude Context Management Demo ===\n');

  // 1. System prompts — persistent context
  console.log('--- 1. System Prompt (Persistent Context) ---');
  console.log('The system prompt is loaded ONCE and shapes every response.\n');

  const systemPrompt = `You are a Playwright test automation expert.
Rules:
- Always prefer getByRole over CSS selectors
- Never use waitForTimeout
- Use data-test attribute as testIdAttribute
- Write TypeScript, never JavaScript`;

  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 128,
    system: systemPrompt,
    messages: [
      { role: 'user', content: 'Write a locator for a login button.' },
    ],
  });

  const text = response.content.find(b => b.type === 'text');
  console.log('  System prompt sets the persona and rules');
  console.log('  Claude responds:', text?.text?.slice(0, 120));
  console.log();

  // 2. Conversation history — multi-turn memory
  console.log('--- 2. Conversation History (Multi-Turn Memory) ---');
  console.log('Claude has NO memory between API calls. YOU manage the history.\n');

  const history: Anthropic.MessageParam[] = [
    { role: 'user', content: 'Our app uses data-test attributes for testing.' },
    { role: 'assistant', content: 'Got it. I\'ll use getByTestId with data-test attributes for locators.' },
    { role: 'user', content: 'Now write a test for the signup form.' },
  ];

  console.log('  Messages sent to Claude:');
  for (const msg of history) {
    const preview = typeof msg.content === 'string' ? msg.content.slice(0, 70) : '[complex]';
    console.log(`    [${msg.role}] ${preview}`);
  }

  const historyResponse = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 128,
    messages: history,
  });
  console.log('  Claude remembers context from turn 1 when answering turn 2');
  console.log('  Tokens used:', historyResponse.usage.input_tokens, 'input,', historyResponse.usage.output_tokens, 'output');
  console.log();

  // 3. Token budgets
  console.log('--- 3. Token Budgets ---');
  console.log('Every API call has a token cost. Managing it matters.\n');

  console.log('  Context window: 200K tokens (Claude Sonnet/Opus)');
  console.log('  ~150K words fit in one conversation');
  console.log('  Pricing: input tokens are cheaper than output tokens');
  console.log();
  console.log('  Optimization strategies:');
  console.log('    • max_tokens: cap output length (e.g., 128 for short answers)');
  console.log('    • Trim old messages when context grows large');
  console.log('    • Summarize earlier turns instead of keeping full history');
  console.log('    • Use system prompt for stable context, messages for changing context');
  console.log();

  // 4. Prompt caching
  console.log('--- 4. Prompt Caching ---');
  console.log('Cache system prompts and large context to save 90% on repeated calls.\n');

  console.log('  Without caching: every call re-processes the system prompt');
  console.log('  With caching: mark blocks as cache_control: { type: "ephemeral" }');
  console.log('  Cached tokens cost 10% of normal input price');
  console.log('  Cache lives for 5 minutes after last use');
  console.log();
  console.log('  Example: cache a long system prompt');
  console.log('  system: [{ type: "text", text: "...", cache_control: { type: "ephemeral" } }]');
  console.log();

  // 5. Context window in Claude Code
  console.log('--- 5. Context in Claude Code ---');
  console.log('Claude Code manages context automatically:\n');
  console.log('  • CLAUDE.md files → loaded as system context every turn');
  console.log('  • File reads → added to conversation history');
  console.log('  • Auto-compaction → old turns summarized when window fills');
  console.log('  • Tool results → compressed after use');
  console.log('  • Skills → injected as system context when activated');

  console.log('\n--- Key Concepts ---');
  console.log('1. System prompt = persistent instructions (persona, rules)');
  console.log('2. Messages = conversation history (YOU manage it, Claude has no memory)');
  console.log('3. Token budget = context window size + cost control');
  console.log('4. Prompt caching = 90% cost savings on repeated context');
  console.log('5. Claude Code auto-manages context (CLAUDE.md, compaction, tool results)');
}

contextManagementDemo().catch(console.error);
