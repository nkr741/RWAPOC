/**
 * Claude Platform Demo: Choosing the Right Model
 *
 * Demonstrates the difference between Claude model tiers — Haiku (fast/cheap),
 * Sonnet (balanced), and Opus (most capable) — and when to use each.
 *
 * Run: npx tsx claude-platform/07-choosing-model.ts
 */
import Anthropic from '@anthropic-ai/sdk';
import { loadAnthropicKey } from '../anthropic-key.js';

const client = new Anthropic({ apiKey: loadAnthropicKey() });

interface ModelProfile {
  id: string;
  tier: string;
  bestFor: string;
  costPer1MTokens: { input: string; output: string };
  speed: string;
}

const MODELS: ModelProfile[] = [
  {
    id: 'claude-haiku-4-5',
    tier: 'Haiku 4.5',
    bestFor: 'Fast classification, simple extraction, high-volume tasks',
    costPer1MTokens: { input: '$1', output: '$5' },
    speed: 'Fastest (~200 tok/s)',
  },
  {
    id: 'claude-sonnet-5',
    tier: 'Sonnet 5',
    bestFor: 'Balanced — code generation, analysis, tool use, most production work',
    costPer1MTokens: { input: '$2', output: '$10' },
    speed: 'Fast (~120 tok/s)',
  },
  {
    id: 'claude-opus-5',
    tier: 'Opus 5',
    bestFor: 'Hardest tasks — deep reasoning, complex architecture, research',
    costPer1MTokens: { input: '$5', output: '$25' },
    speed: 'Moderate (~60 tok/s)',
  },
];

async function modelComparisonDemo() {
  console.log('=== Choosing the Right Claude Model ===\n');

  console.log('--- Model Lineup ---');
  for (const m of MODELS) {
    console.log(`\n  ${m.tier} (${m.id})`);
    console.log(`    Best for: ${m.bestFor}`);
    console.log(`    Speed: ${m.speed}`);
    console.log(`    Cost: ${m.costPer1MTokens.input} input / ${m.costPer1MTokens.output} output per 1M tokens`);
  }

  console.log('\n--- Decision Matrix for Test Automation ---');
  console.log();

  const scenarios = [
    { task: 'Classify a test failure as flaky vs real', model: 'Haiku', why: 'Simple classification, high volume' },
    { task: 'Heal a broken locator from DOM diff', model: 'Sonnet', why: 'Balanced code gen + analysis' },
    { task: 'Generate a full page object from HTML', model: 'Sonnet', why: 'Structured code generation' },
    { task: 'Debug a complex race condition in tests', model: 'Opus', why: 'Deep multi-step reasoning needed' },
    { task: 'Architect a test framework from scratch', model: 'Opus', why: 'Complex design + tradeoff analysis' },
    { task: 'Extract test names from a report', model: 'Haiku', why: 'Simple extraction, cheapest option' },
  ];

  console.log('  Task                                        | Model   | Why');
  console.log('  --------------------------------------------|---------|---------------------------');
  for (const s of scenarios) {
    console.log(`  ${s.task.padEnd(44)}| ${s.model.padEnd(8)}| ${s.why}`);
  }

  // Live comparison: same prompt, two models
  console.log('\n--- Live Comparison ---');
  console.log('Prompt: "Write a Playwright getByRole locator for a submit button"\n');

  const prompt = 'Write a Playwright getByRole locator for a submit button. Just the code, nothing else.';

  const sonnetStart = Date.now();
  const sonnet = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 64,
    messages: [{ role: 'user', content: prompt }],
  });
  const sonnetTime = Date.now() - sonnetStart;
  const sonnetText = sonnet.content.find(b => b.type === 'text');

  console.log(`  Sonnet (${sonnetTime}ms, ${sonnet.usage.output_tokens} tokens): ${sonnetText?.text}`);

  console.log('\n--- Key Concepts ---');
  console.log('1. Three tiers: Haiku (fast/cheap) → Sonnet (balanced) → Opus (most capable)');
  console.log('2. Same API — just change the model string');
  console.log('3. Start with Sonnet for most work, downgrade to Haiku for volume');
  console.log('4. Upgrade to Opus only for hard reasoning tasks');
  console.log('5. Cost scales ~5x between tiers — choose the cheapest that works');
}

modelComparisonDemo().catch(console.error);
