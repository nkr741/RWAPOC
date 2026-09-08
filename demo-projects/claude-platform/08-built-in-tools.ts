/**
 * Claude Platform Demo: Built-in Tools
 *
 * Claude Code ships with native tools (Read, Write, Edit, Bash, Grep, Glob)
 * that let it interact with your filesystem and terminal directly. This script
 * simulates how those built-in tools work internally.
 *
 * Run: npx tsx claude-platform/08-built-in-tools.ts
 */

interface BuiltInTool {
  name: string;
  purpose: string;
  example: string;
  whenUsed: string;
}

const BUILT_IN_TOOLS: BuiltInTool[] = [
  {
    name: 'Read',
    purpose: 'Read file contents with line numbers',
    example: 'Read({ file_path: "tests/login.spec.ts", offset: 10, limit: 20 })',
    whenUsed: 'Claude needs to see code before editing it',
  },
  {
    name: 'Write',
    purpose: 'Create a new file or completely rewrite an existing one',
    example: 'Write({ file_path: "tests/new.spec.ts", content: "..." })',
    whenUsed: 'Creating new test files, config files, or full rewrites',
  },
  {
    name: 'Edit',
    purpose: 'Make surgical edits — find and replace specific strings',
    example: 'Edit({ file_path: "page.ts", old_string: "[data-test=\\"btn\\"]", new_string: "getByRole(\'button\')" })',
    whenUsed: 'Fixing locators, renaming variables, small code changes',
  },
  {
    name: 'Bash',
    purpose: 'Run shell commands and get output',
    example: 'Bash({ command: "npx playwright test --grep login" })',
    whenUsed: 'Running tests, installing packages, git operations',
  },
  {
    name: 'Grep',
    purpose: 'Search file contents using regex patterns',
    example: 'Grep({ pattern: "data-test=", glob: "**/*.spec.ts" })',
    whenUsed: 'Finding all locators, searching for patterns across files',
  },
  {
    name: 'Glob',
    purpose: 'Find files by name/path patterns',
    example: 'Glob({ pattern: "tests/**/*.spec.ts" })',
    whenUsed: 'Discovering test files, finding configs, listing pages',
  },
];

function simulateBuiltInTools() {
  console.log('=== Claude Code Built-in Tools ===\n');
  console.log('These tools are ALWAYS available to Claude Code — no MCP, no SDK, no setup.\n');

  for (const tool of BUILT_IN_TOOLS) {
    console.log(`  ${tool.name}`);
    console.log(`    Purpose:  ${tool.purpose}`);
    console.log(`    Example:  ${tool.example}`);
    console.log(`    Used for: ${tool.whenUsed}`);
    console.log();
  }

  console.log('--- How It Works in Practice ---\n');
  console.log('When you ask Claude Code: "Fix all broken locators in the login test"\n');
  console.log('Claude Code internally:');
  console.log('  1. Glob({ pattern: "**/login*.spec.ts" })         → finds the file');
  console.log('  2. Read({ file_path: "tests/login.spec.ts" })     → reads the code');
  console.log('  3. Grep({ pattern: "data-test=", path: "..." })   → finds locators');
  console.log('  4. Edit({ old: "[data-test=\\"x\\"]", new: "getByRole(...)" }) → fixes each');
  console.log('  5. Bash({ command: "npx playwright test ..." })   → runs to verify');
  console.log();

  console.log('--- Built-in vs Custom Tools ---\n');
  console.log('  Built-in tools    | Custom tools (via MCP or Tool Use)');
  console.log('  ------------------|------------------------------------');
  console.log('  Always available  | Must be configured');
  console.log('  File/shell only   | Any API, database, service');
  console.log('  No setup needed   | Requires MCP server or tool schema');
  console.log('  Claude Code only  | Works via API and Claude Code');
  console.log();

  console.log('--- Key Concepts ---');
  console.log('1. Claude Code has 6 built-in tools: Read, Write, Edit, Bash, Grep, Glob');
  console.log('2. These let Claude interact with your filesystem and terminal');
  console.log('3. No configuration needed — they work out of the box');
  console.log('4. Claude decides which tools to use based on your request');
  console.log('5. MCP extends Claude Code with ADDITIONAL tools beyond these 6');
}

simulateBuiltInTools();
