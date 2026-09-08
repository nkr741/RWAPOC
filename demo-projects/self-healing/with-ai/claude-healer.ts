import Anthropic from '@anthropic-ai/sdk';
import { loadAnthropicKey } from '../../anthropic-key.js';

// Read .env explicitly rather than trusting the environment — a stale exported
// ANTHROPIC_API_KEY silently shadows .env and every spec fails with a 401.
const client = new Anthropic({ apiKey: loadAnthropicKey() });

export async function askClaude(prompt: string, imageBase64?: string): Promise<string> {
  const content: Anthropic.MessageCreateParams['messages'][0]['content'] = imageBase64
    ? [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageBase64 } },
        { type: 'text', text: prompt },
      ]
    : prompt;

  const response = await client.messages.create({
    model: 'claude-opus-5',
    // A generated Page Object for a busy page runs to ~3.5k tokens. At the old
    // 2048 cap the reply was silently cut off mid-class, so methods declared
    // last (waitForLoaded) simply weren't there — which looked like the model
    // ignoring instructions rather than the response running out of room.
    max_tokens: 8192,
    messages: [{ role: 'user', content }],
  });

  // Never let a truncated reply pass as a complete one.
  if (response.stop_reason === 'max_tokens') {
    console.warn(
      `[claude-healer] Reply hit the ${8192}-token cap and was truncated. ` +
        'Raise max_tokens — downstream assertions will fail on the missing tail.'
    );
  }

  const textBlock = response.content.find(b => b.type === 'text');
  return textBlock ? textBlock.text : '';
}

/**
 * Strips // and block comments from generated code.
 *
 * Needed because asserting `not.toContain('data-test=')` over raw model output
 * fails on perfectly correct code the moment the model writes an explanatory
 * comment naming the selector it replaced — which is good documentation, and in
 * 05-page-object-regen we explicitly ask for those comments. The intent of the
 * assertion is "no data-test SELECTORS in the code", so check the code only.
 */
export function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

export async function healLocator(opts: {
  elementDescription: string;
  oldSelector: string;
  pageHtml: string;
  errorMessage?: string;
}): Promise<{ selector: string; strategy: string; explanation: string }> {
  const prompt = `You are a Playwright test automation expert. A locator has broken and needs healing.

Element description: ${opts.elementDescription}
Old selector that no longer works: ${opts.oldSelector}
Error: ${opts.errorMessage ?? 'Element not found'}

Here is the current page HTML:
\`\`\`html
${opts.pageHtml.slice(0, 8000)}
\`\`\`

Analyze the HTML and provide a new working Playwright selector.
Respond in this exact JSON format (no markdown, no code fences):
{"selector": "the new selector", "strategy": "which strategy (testId|role|text|css|xpath)", "explanation": "why this selector works"}`;

  const result = await askClaude(prompt);
  const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned) as { selector: string; strategy: string; explanation: string };
}

export async function analyzeScreenshot(opts: {
  screenshotBase64: string;
  elementDescription: string;
  pageHtml: string;
}): Promise<{ selector: string; explanation: string }> {
  const prompt = `You are looking at a screenshot of a web page. I need to find the "${opts.elementDescription}" element.

Page HTML (partial):
\`\`\`html
${opts.pageHtml.slice(0, 4000)}
\`\`\`

Based on the screenshot and HTML, provide a robust Playwright selector for the "${opts.elementDescription}" element.
Respond in this exact JSON format (no markdown, no code fences):
{"selector": "the playwright selector", "explanation": "why this works"}`;

  const result = await askClaude(prompt, opts.screenshotBase64);
  const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned) as { selector: string; explanation: string };
}

export async function generatePageObject(opts: {
  pageHtml: string;
  pageName: string;
}): Promise<string> {
  const prompt = `You are a Playwright automation architect. Generate a TypeScript Page Object class for the "${opts.pageName}" page.

HTML:
\`\`\`html
${opts.pageHtml.slice(0, 8000)}
\`\`\`

Requirements:
- Class name: ${opts.pageName}Page
- Use getByRole, getByLabel, getByPlaceholder, getByText over CSS/XPath
- Include locator properties and action methods
- Export the class

MANDATORY: the class must define a method named exactly \`waitForLoaded\`, with the
signature \`async waitForLoaded(): Promise<void>\`. It waits for the page's key
elements to be visible. Do not rename it, do not omit it, do not replace it with
an equivalent such as \`waitUntilReady\` or \`isLoaded\`.

Return only valid TypeScript code, no markdown fences.`;

  return askClaude(prompt);
}
