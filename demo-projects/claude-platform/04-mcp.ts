/**
 * Claude Platform Demo: Model Context Protocol (MCP)
 *
 * MCP is an open standard for connecting AI models to external tools and data.
 * This demo shows the MCP message structure and how a test framework could
 * expose its capabilities as an MCP server.
 *
 * Run: npx tsx claude-platform/04-mcp.ts
 */

// MCP defines a JSON-RPC protocol. Here's what the messages look like:

interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

interface McpResource {
  uri: string;
  name: string;
  mimeType: string;
  description: string;
}

// A Playwright MCP server would expose these tools:
const playwrightMcpTools: McpTool[] = [
  {
    name: 'playwright_navigate',
    description: 'Navigate to a URL in the browser',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to navigate to' },
      },
      required: ['url'],
    },
  },
  {
    name: 'playwright_screenshot',
    description: 'Take a screenshot of the current page',
    inputSchema: {
      type: 'object',
      properties: {
        fullPage: { type: 'string', description: 'Capture full page (true/false)' },
      },
      required: [],
    },
  },
  {
    name: 'playwright_click',
    description: 'Click an element on the page',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Playwright selector' },
      },
      required: ['selector'],
    },
  },
  {
    name: 'playwright_fill',
    description: 'Fill a form field',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Input selector' },
        value: { type: 'string', description: 'Value to fill' },
      },
      required: ['selector', 'value'],
    },
  },
  {
    name: 'playwright_get_html',
    description: 'Get the page HTML content',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Optional: get HTML of specific element' },
      },
      required: [],
    },
  },
];

// And expose test data as MCP resources:
const playwrightMcpResources: McpResource[] = [
  {
    uri: 'playwright://config',
    name: 'Playwright Configuration',
    mimeType: 'application/json',
    description: 'Current playwright.config.ts settings',
  },
  {
    uri: 'playwright://test-results/latest',
    name: 'Latest Test Results',
    mimeType: 'application/json',
    description: 'Results from the most recent test run',
  },
  {
    uri: 'playwright://page/snapshot',
    name: 'Page Snapshot',
    mimeType: 'text/html',
    description: 'Current accessibility snapshot of the page',
  },
];

// Simulate MCP JSON-RPC message flow
function simulateMcpFlow() {
  console.log('=== MCP (Model Context Protocol) Demo ===\n');
  console.log('MCP enables Claude to connect to external tools via a standard protocol.\n');

  console.log('--- 1. Server advertises capabilities ---');
  const initResponse = {
    jsonrpc: '2.0',
    id: 1,
    result: {
      capabilities: { tools: { listChanged: true }, resources: { subscribe: true } },
      serverInfo: { name: 'playwright-mcp-server', version: '1.0.0' },
    },
  };
  console.log(JSON.stringify(initResponse, null, 2));

  console.log('\n--- 2. Client lists available tools ---');
  const toolsList = {
    jsonrpc: '2.0',
    id: 2,
    result: { tools: playwrightMcpTools.map(t => ({ name: t.name, description: t.description })) },
  };
  console.log(JSON.stringify(toolsList, null, 2));

  console.log('\n--- 3. Client calls a tool ---');
  const toolCall = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'playwright_navigate',
      arguments: { url: 'http://localhost:4200' },
    },
  };
  console.log('Request:', JSON.stringify(toolCall, null, 2));

  const toolResult = {
    jsonrpc: '2.0',
    id: 3,
    result: {
      content: [{ type: 'text', text: 'Navigated to http://localhost:4200. Page title: "Demo Banking App"' }],
    },
  };
  console.log('Response:', JSON.stringify(toolResult, null, 2));

  console.log('\n--- 4. Client reads a resource ---');
  const resourceRead = {
    jsonrpc: '2.0',
    id: 4,
    method: 'resources/read',
    params: { uri: 'playwright://test-results/latest' },
  };
  console.log('Request:', JSON.stringify(resourceRead, null, 2));

  const resourceResult = {
    jsonrpc: '2.0',
    id: 4,
    result: {
      contents: [
        {
          uri: 'playwright://test-results/latest',
          mimeType: 'application/json',
          text: JSON.stringify({ passed: 112, failed: 2, skipped: 0, duration: '4m 32s' }),
        },
      ],
    },
  };
  console.log('Response:', JSON.stringify(resourceResult, null, 2));

  console.log('\n--- Key Concepts ---');
  console.log('1. MCP uses JSON-RPC 2.0 over stdio or HTTP/SSE');
  console.log('2. Servers expose tools (actions) and resources (data)');
  console.log('3. Claude Code uses MCP to connect to Playwright, GitHub, Slack, etc.');
  console.log('4. Tools = "what can I do?" | Resources = "what can I read?"');
  console.log('5. Any test framework can become an MCP server');
  console.log('6. Config: claude mcp add playwright -- npx @anthropic/playwright-mcp');
}

simulateMcpFlow();
