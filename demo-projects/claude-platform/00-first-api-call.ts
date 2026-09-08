/**
 * Claude Platform Demo: Your First API Call
 *
 * The simplest possible Claude API call — install, authenticate, send,
 * receive. This is "Hello World" for the Claude platform.
 *
 * Run: npx tsx claude-platform/00-first-api-call.ts
 */
import Anthropic from '@anthropic-ai/sdk';
import { loadAnthropicKey } from '../anthropic-key.js';

const client = new Anthropic({ apiKey: loadAnthropicKey() });

async function firstApiCall() {
  console.log('=== Your First Claude API Call ===\n');

  // Step 1: The simplest possible call
  console.log('Step 1: Basic message...');
  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 256,
    messages: [
      { role: 'user', content: 'What is Playwright in one sentence?' },
    ],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  console.log('Claude says:', textBlock?.text);
  console.log();

  // Step 2: Understanding the response object
  console.log('Step 2: Response metadata...');
  console.log('  Model used:', response.model);
  console.log('  Stop reason:', response.stop_reason);
  console.log('  Input tokens:', response.usage.input_tokens);
  console.log('  Output tokens:', response.usage.output_tokens);
  console.log('  Total tokens:', response.usage.input_tokens + response.usage.output_tokens);
  console.log();

  // Step 3: Multi-turn conversation
  console.log('Step 3: Multi-turn conversation...');
  const followUp = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 256,
    messages: [
      { role: 'user', content: 'What is Playwright?' },
      { role: 'assistant', content: 'Playwright is a browser automation framework by Microsoft for end-to-end testing.' },
      { role: 'user', content: 'How does it compare to Selenium in one sentence?' },
    ],
  });

  const followUpText = followUp.content.find(b => b.type === 'text');
  console.log('Claude says:', followUpText?.text);
  console.log();

  // Step 4: System prompt
  console.log('Step 4: With a system prompt...');
  const withSystem = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 128,
    system: 'You are a QA automation expert. Answer in exactly one sentence.',
    messages: [
      { role: 'user', content: 'What is the best locator strategy?' },
    ],
  });

  const sysText = withSystem.content.find(b => b.type === 'text');
  console.log('Claude says:', sysText?.text);

  console.log('\n--- Key Concepts ---');
  console.log('1. Install: npm install @anthropic-ai/sdk');
  console.log('2. Auth: Set ANTHROPIC_API_KEY env var (sk-ant-...)');
  console.log('3. Client: new Anthropic() reads the key automatically');
  console.log('4. Messages: client.messages.create({ model, max_tokens, messages })');
  console.log('5. Response: content[] array with text blocks, usage stats');
  console.log('6. Conversation: pass prior messages for context');
  console.log('7. System prompt: shapes Claude\'s persona and behavior');
}

firstApiCall().catch(console.error);
