/**
 * RUN THIS FIRST — before demos 17-20.
 *
 * Answers one question: what actually happens when I type
 * `npx tsx claude-platform/17-temperature.ts`?
 *
 * There is no app, no browser, no server, no UI. It is a terminal program
 * that sends one HTTPS request and prints what comes back. This file shows
 * you that request and that response with nothing hidden — first written by
 * hand with plain fetch(), then the identical call through the SDK, so you
 * can see the SDK is a convenience wrapper and not magic.
 *
 * Run: npx tsx claude-platform/_under-the-hood.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { client, TASK_MODEL, textOf } from './_env.js';

const line = (s = '') => console.log(s);
const rule = (label: string) => {
  line();
  line(`── ${label} ${'─'.repeat(Math.max(0, 62 - label.length))}`);
  line();
};

// --- STEP 1: where does the key come from? ---

function showKeySource() {
  rule('STEP 1: Where the API key comes from');

  const here = path.dirname(fileURLToPath(import.meta.url));
  const envPath = path.join(here, '..', '.env');

  line(`  Looking for a file at:  ${envPath}`);
  line(`  Does it exist?          ${fs.existsSync(envPath) ? 'yes' : 'no'}`);

  const shellKey = process.env.ANTHROPIC_API_KEY;
  line(`  Shell variable set?     ${shellKey ? 'yes' : 'no'}`);
  line();
  line('  This is the ONLY secret involved. It identifies your Anthropic');
  line('  account so the request can be billed. Nothing else authenticates.');
}

// --- STEP 2: the raw HTTP request, written by hand ---

async function rawHttpCall() {
  rule('STEP 2: The actual HTTPS request (no SDK)');

  const key = client.apiKey as string;
  const url = 'https://api.anthropic.com/v1/messages';

  const headers = {
    'content-type': 'application/json',
    'anthropic-version': '2023-06-01',
    'x-api-key': key,
  };

  const body = {
    model: TASK_MODEL,
    max_tokens: 64,
    temperature: 0,
    messages: [{ role: 'user', content: 'Reply with exactly: hello from the API' }],
  };

  line(`  POST ${url}`);
  line();
  line('  Headers we send:');
  for (const [k, v] of Object.entries(headers)) {
    // Never print the key itself.
    line(`    ${k}: ${k === 'x-api-key' ? v.slice(0, 11) + '…' + ' (redacted)' : v}`);
  }
  line();
  line('  Body we send (this is the whole prompt — there is nothing else):');
  line(JSON.stringify(body, null, 2).split('\n').map(l => '    ' + l).join('\n'));

  const started = Date.now();
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const elapsed = Date.now() - started;
  const json = (await res.json()) as Record<string, unknown>;

  line();
  line(`  HTTP ${res.status} ${res.statusText}  (${elapsed}ms round trip)`);
  line();
  line('  Body we get back:');
  line(JSON.stringify(json, null, 2).split('\n').map(l => '    ' + l).join('\n'));

  line();
  line('  That is the entire interaction. One request out, one response back.');
  line('  Nothing is stored on our side. Nothing is running in the background.');
}

// --- STEP 3: the same call through the SDK ---

async function sdkCall() {
  rule('STEP 3: The identical call, through the SDK');

  line('  The code the demos actually use:');
  line();
  line('    const response = await client.messages.create({');
  line(`      model: '${TASK_MODEL}',`);
  line('      max_tokens: 64,');
  line('      temperature: 0,');
  line("      messages: [{ role: 'user', content: 'Reply with exactly: hello from the API' }],");
  line('    });');
  line();

  const started = Date.now();
  const response = await client.messages.create({
    model: TASK_MODEL,
    max_tokens: 64,
    temperature: 0,
    messages: [{ role: 'user', content: 'Reply with exactly: hello from the API' }],
  });
  const elapsed = Date.now() - started;

  line(`  Got back in ${elapsed}ms.`);
  line();
  line('  The SDK did three things for us and nothing more:');
  line('    1. Built that same JSON body');
  line('    2. Attached the key and version headers');
  line('    3. Parsed the reply into a typed object');
  line();
  line('  Reading the answer out of the response:');
  line(`    response.content            -> an array of ${response.content.length} content block(s)`);
  line(`    response.content[0].type    -> '${response.content[0]?.type}'`);
  line(`    textOf(response)            -> '${textOf(response).trim()}'`);
  line();
  line('  Note that content is a LIST, not a string. That is why every demo');
  line("  calls textOf() instead of just reading response.text — there is no");
  line('  .text. A reply can contain several blocks of different kinds.');
  line();
  line('  What the same response tells us about cost:');
  line(`    input_tokens               -> ${response.usage.input_tokens}`);
  line(`    output_tokens              -> ${response.usage.output_tokens}`);
  line(`    stop_reason                -> '${response.stop_reason}'`);
}

// --- STEP 4: what is NOT happening ---

function whatIsNotHappening() {
  rule('STEP 4: What is NOT involved');

  const notInvolved = [
    ['Claude Code', 'wrote these files. Not running now. Not called by this script.'],
    ['A web app / UI', 'there is none. Output goes to this terminal and nowhere else.'],
    ['A local server', 'nothing is listening on any port. This is not the demo-app on 4200.'],
    ['Playwright / a browser', 'never launched. These four demos never open a browser.'],
    ['A database', 'nothing is written to disk. Close the terminal and it is all gone.'],
    ['The model itself', 'runs on Anthropic servers, not your laptop. You send text, you get text.'],
  ];

  for (const [thing, why] of notInvolved) {
    line(`  ✗ ${thing.padEnd(22)} ${why}`);
  }
}

async function main() {
  line('╔══════════════════════════════════════════════════╗');
  line('║  Under the hood: what `npx tsx` actually does    ║');
  line('╚══════════════════════════════════════════════════╝');

  rule('STEP 0: The command itself');
  line('  npx tsx claude-platform/17-temperature.ts');
  line('   │   │            │');
  line('   │   │            └─ the TypeScript file you want to run');
  line('   │   └─ tsx: compiles that TypeScript in memory and runs it on Node.');
  line('   │      No build step. No .js files are produced.');
  line('   └─ npx: finds the tsx program inside node_modules and runs it.');
  line();
  line('  So: Node executes your file. Your file makes an HTTPS call.');
  line('  That is the whole architecture.');

  showKeySource();
  await rawHttpCall();
  await sdkCall();
  whatIsNotHappening();

  rule('Where to start and where to end');
  line('  This file          -> what is running and how  (you are here)');
  line('  17-temperature     -> why answers change run to run');
  line('  18-score-based     -> grading with code');
  line('  19-model-based     -> grading with a second model');
  line('  20-judge-vs-scorer -> checking whether the judge can be trusted');
  line();
  line('  Run them in that order. Each one is a standalone program that starts,');
  line('  prints, and exits. Nothing carries over between them.');
  line();
}

main().catch(console.error);
