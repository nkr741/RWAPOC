/**
 * Claude Platform Demo: Tool Use (Function Calling)
 *
 * Demonstrates defining tools, sending them to Claude, and executing
 * the tool calls Claude returns — the core building block of agents.
 *
 * Run: npx tsx claude-platform/02-tool-use.ts
 */
import Anthropic from '@anthropic-ai/sdk';
import { loadAnthropicKey } from '../anthropic-key.js';

const client = new Anthropic({ apiKey: loadAnthropicKey() });

const tools: Anthropic.Tool[] = [
  {
    name: 'run_playwright_test',
    description: 'Run a Playwright test file and return results',
    input_schema: {
      type: 'object' as const,
      properties: {
        testFile: { type: 'string', description: 'Path to the test file' },
        grep: { type: 'string', description: 'Optional test name filter' },
      },
      required: ['testFile'],
    },
  },
  {
    name: 'get_page_html',
    description: 'Get the current HTML content of a page at a URL',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: { type: 'string', description: 'URL to fetch' },
      },
      required: ['url'],
    },
  },
  {
    name: 'suggest_locator',
    description: 'Given an element description and HTML, suggest the best Playwright locator',
    input_schema: {
      type: 'object' as const,
      properties: {
        element: { type: 'string', description: 'Description of the element' },
        html: { type: 'string', description: 'HTML snippet containing the element' },
      },
      required: ['element', 'html'],
    },
  },
];

function executeToolCall(name: string, input: Record<string, string>): string {
  console.log(`  [Executing] ${name}(${JSON.stringify(input).slice(0, 100)})`);
  switch (name) {
    case 'run_playwright_test':
      return JSON.stringify({
        passed: 3,
        failed: 1,
        failures: [
          {
            test: 'should show dashboard after login',
            error: 'locator("[data-test=user-greeting]") resolved to 0 elements',
            file: input.testFile,
          },
        ],
      });
    case 'get_page_html':
      return '<div data-qa="user_greeting_v2">Hello, Demo User!</div>';
    case 'suggest_locator':
      return JSON.stringify({
        primary: 'getByText(/welcome|hello/i)',
        fallback: '[data-qa="user_greeting_v2"]',
        reasoning: 'Text-based locator survives attribute renames',
      });
    default:
      return 'Unknown tool';
  }
}

async function toolUseDemo() {
  console.log('=== Claude Tool Use Demo ===\n');

  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 1024,
    tools,
    messages: [
      {
        role: 'user',
        content:
          'Run the login test suite at "tests/login.spec.ts". If any tests fail, check the page HTML and suggest fixed locators.',
      },
    ],
  });

  console.log('Response blocks:', response.content.length);
  console.log('Stop reason:', response.stop_reason);
  console.log();

  for (const block of response.content) {
    if (block.type === 'text') {
      console.log('Claude says:', block.text);
    } else if (block.type === 'tool_use') {
      console.log(`\nTool call: ${block.name}`);
      console.log('Input:', JSON.stringify(block.input, null, 2));
      const result = executeToolCall(block.name, block.input as Record<string, string>);
      console.log('Result:', result);
    }
  }

  console.log('\n--- Key Concepts ---');
  console.log('1. Tools are defined with JSON Schema input specs');
  console.log('2. Claude decides WHEN and WHICH tools to call');
  console.log('3. You execute the tool and return the result');
  console.log('4. Claude reasons about results and may call more tools');
  console.log('5. stop_reason="tool_use" means Claude wants to call a tool');
  console.log('6. stop_reason="end_turn" means Claude is done');
}

toolUseDemo().catch(console.error);
