/**
 * Claude Platform Demo: Agentic Loop Pattern
 *
 * Demonstrates an autonomous agent that iterates on test failures —
 * reads failure output, reasons about the fix, applies it, and re-runs.
 *
 * Run: npx tsx claude-platform/01-agent-loop.ts
 */
import Anthropic from '@anthropic-ai/sdk';
import { loadAnthropicKey } from '../anthropic-key.js';

const client = new Anthropic({ apiKey: loadAnthropicKey() });

interface AgentState {
  testFile: string;
  failureOutput: string;
  attempts: number;
  maxAttempts: number;
  fixed: boolean;
}

const tools: Anthropic.Tool[] = [
  {
    name: 'read_file',
    description: 'Read a test file to understand its structure',
    input_schema: {
      type: 'object' as const,
      properties: { path: { type: 'string', description: 'File path to read' } },
      required: ['path'],
    },
  },
  {
    name: 'analyze_failure',
    description: 'Analyze test failure output and suggest a fix',
    input_schema: {
      type: 'object' as const,
      properties: {
        failure: { type: 'string', description: 'Test failure output' },
        testCode: { type: 'string', description: 'Current test code' },
      },
      required: ['failure', 'testCode'],
    },
  },
  {
    name: 'apply_fix',
    description: 'Apply the suggested fix to the test file',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'File path' },
        oldCode: { type: 'string', description: 'Code to replace' },
        newCode: { type: 'string', description: 'Replacement code' },
      },
      required: ['path', 'oldCode', 'newCode'],
    },
  },
  {
    name: 'run_test',
    description: 'Run the Playwright test and get results',
    input_schema: {
      type: 'object' as const,
      properties: { path: { type: 'string', description: 'Test file path' } },
      required: ['path'],
    },
  },
];

function simulateToolExecution(name: string, input: Record<string, string>): string {
  switch (name) {
    case 'read_file':
      return `// Test file: ${input.path}\ntest('login', async ({ page }) => {\n  await page.click('[data-test="signin-submit"]');\n});`;
    case 'analyze_failure':
      return JSON.stringify({
        diagnosis: 'data-test attribute removed during redesign',
        suggestedFix: 'Replace [data-test="signin-submit"] with getByRole("button", { name: /sign in/i })',
      });
    case 'apply_fix':
      return `Applied fix: replaced "${input.oldCode}" with "${input.newCode}"`;
    case 'run_test':
      return 'Test passed! 1 test, 0 failures';
    default:
      return 'Unknown tool';
  }
}

async function agentLoop() {
  console.log('=== Claude Agentic Loop Demo ===\n');
  console.log('Pattern: Claude autonomously iterates on a test failure\n');

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `You are a test automation agent. A Playwright test has failed:

Test file: self-healing/without-ai/01-fallback-locators.spec.ts
Failure: Error: locator.click: Error: strict mode violation: locator('[data-test="signin-submit"]') resolved to 0 elements

Your task:
1. Read the test file to understand the test
2. Analyze why it failed
3. Apply a fix using resilient selectors
4. Run the test to verify the fix

Use the tools provided. Work autonomously until the test passes or you've exhausted options.`,
    },
  ];

  let iteration = 0;
  const maxIterations = 5;

  while (iteration < maxIterations) {
    iteration++;
    console.log(`--- Iteration ${iteration} ---`);

    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 1024,
      tools,
      messages,
    });

    console.log(`Stop reason: ${response.stop_reason}`);

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(b => b.type === 'text');
      console.log('\nAgent conclusion:', textBlock?.text ?? '(no text)');
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter(b => b.type === 'tool_use');
      messages.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        if (tu.type !== 'tool_use') continue;
        console.log(`  Tool call: ${tu.name}(${JSON.stringify(tu.input).slice(0, 80)}...)`);
        const result = simulateToolExecution(tu.name, tu.input as Record<string, string>);
        console.log(`  Result: ${result.slice(0, 100)}`);
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: result });
      }
      messages.push({ role: 'user', content: toolResults });
    }
  }

  console.log(`\nAgent completed in ${iteration} iterations.`);
  console.log('\nKey Takeaway: The agentic loop lets Claude autonomously');
  console.log('diagnose, fix, and verify — no human in the loop until done.');
}

agentLoop().catch(console.error);
