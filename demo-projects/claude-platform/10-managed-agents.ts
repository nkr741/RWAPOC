/**
 * Claude Platform Demo: Managed Agents
 *
 * Managed Agents are server-hosted Claude instances with a managed code sandbox.
 * They can run for hours, execute code, access files, and maintain state — all
 * managed by Anthropic's infrastructure. This script demonstrates the concept.
 *
 * Run: npx tsx claude-platform/10-managed-agents.ts
 */
import Anthropic from '@anthropic-ai/sdk';
import { loadAnthropicKey } from '../anthropic-key.js';

const client = new Anthropic({ apiKey: loadAnthropicKey() });

async function managedAgentsDemo() {
  console.log('=== Claude Managed Agents Demo ===\n');

  // 1. What are managed agents?
  console.log('--- 1. What Are Managed Agents? ---\n');
  console.log('  Regular API call:   You send a message → get a response → done');
  console.log('  Agent loop (local): You run the loop locally, calling tools yourself');
  console.log('  Managed Agent:      Anthropic hosts the agent + sandbox for you\n');
  console.log('  Key difference: YOU don\'t manage the loop, tools, or sandbox.');
  console.log('  Anthropic runs everything on their servers.\n');

  // 2. Managed Agent capabilities
  console.log('--- 2. What Managed Agents Can Do ---\n');
  console.log('  • Run in a cloud sandbox with file system, shell, and internet');
  console.log('  • Execute code (Python, Node.js) in an isolated environment');
  console.log('  • Run for hours on complex tasks (not limited to one API call)');
  console.log('  • Read/write files, install packages, access databases');
  console.log('  • Return structured results when done\n');

  // 3. When to use managed agents vs local agents
  console.log('--- 3. Managed vs Local Agents ---\n');
  console.log('  Use Case                           | Local Agent | Managed Agent');
  console.log('  -----------------------------------|-------------|---------------');
  console.log('  Quick locator fix                   | ✓           |              ');
  console.log('  Run tests + fix failures in a loop  |             | ✓            ');
  console.log('  Analyze a large codebase            |             | ✓            ');
  console.log('  CI/CD integration (long-running)    |             | ✓            ');
  console.log('  Interactive debugging with user     | ✓           |              ');
  console.log('  Batch process 100 test files        |             | ✓            ');
  console.log();

  // 4. Simulated managed agent creation
  console.log('--- 4. Creating a Managed Agent (Conceptual) ---\n');

  const agentConfig = {
    name: 'test-healer-agent',
    description: 'Automatically heal broken Playwright tests',
    instructions: `You are a test automation agent. When given a test failure:
1. Read the failing test file
2. Analyze the error message
3. Check the current page HTML
4. Generate a healed locator
5. Apply the fix
6. Run the test to verify
7. Report results`,
    tools: ['computer', 'text_editor', 'bash'],
    sandbox: {
      type: 'managed',
      packages: ['@playwright/test', 'typescript'],
      files: ['tests/', 'pages/', 'playwright.config.ts'],
    },
  };

  console.log('  Agent config:');
  console.log(`    Name: ${agentConfig.name}`);
  console.log(`    Tools: ${agentConfig.tools.join(', ')}`);
  console.log(`    Sandbox packages: ${agentConfig.sandbox.packages.join(', ')}`);
  console.log(`    Files uploaded: ${agentConfig.sandbox.files.join(', ')}`);
  console.log();

  // 5. Simulated managed agent invocation
  console.log('--- 5. Using the API ---\n');
  console.log('  // Create a managed agent');
  console.log('  const agent = await client.agents.create({');
  console.log('    model: "claude-opus-5",');
  console.log('    name: "test-healer",');
  console.log('    instructions: "...",');
  console.log('    tools: [{ type: "computer" }, { type: "text_editor" }, { type: "bash" }]');
  console.log('  });\n');
  console.log('  // Send a task');
  console.log('  const turn = await client.agents.turns.create(agent.id, {');
  console.log('    messages: [{ role: "user", content: "Fix the login test failure" }]');
  console.log('  });\n');
  console.log('  // Agent runs autonomously in Anthropic\'s sandbox');
  console.log('  // Poll for results or use webhooks');
  console.log('  const result = await client.agents.turns.retrieve(agent.id, turn.id);');
  console.log();

  // 6. Quick proof via regular API (shows the concept)
  console.log('--- 6. Concept Proof via Regular API ---\n');

  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `You are a managed test-healing agent. A test failed:
Error: locator('[data-test="submit-btn"]') resolved to 0 elements

The current HTML has: <button class="btn-primary" type="submit">Save Changes</button>

What locator would you use instead? Give just the Playwright code.`,
      },
    ],
  });

  const text = response.content.find(b => b.type === 'text');
  console.log('  Agent response:', text?.text);

  console.log('\n--- Key Concepts ---');
  console.log('1. Managed Agents = server-hosted Claude + managed sandbox');
  console.log('2. No local infrastructure needed — Anthropic runs everything');
  console.log('3. Can run for hours on complex tasks (not one-shot)');
  console.log('4. Have access to file system, shell, code execution');
  console.log('5. Best for: CI/CD pipelines, batch processing, long-running tasks');
  console.log('6. API: client.agents.create() → client.agents.turns.create()');
}

managedAgentsDemo().catch(console.error);
