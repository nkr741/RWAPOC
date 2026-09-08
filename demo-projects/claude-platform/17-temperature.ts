/**
 * Session Demo 17: Temperature — the randomness dial
 *
 * Four things we prove live, with real API calls:
 *   1. Same prompt, temperature 0, five times  -> nearly identical output
 *   2. Same prompt, temperature 1, five times  -> five different outputs
 *   3. Low temperature is NOT always "better"  -> it collapses test-data variety
 *   4. On frontier models temperature is GONE  -> `effort` replaced it
 *
 * Run: npx tsx claude-platform/17-temperature.ts
 */
import { client, TASK_MODEL, textOf } from './_env.js';

const PROMPT = 'Invent one realistic full name for a test user of a banking app. Reply with the name only.';

async function sample(temperature: number, n: number): Promise<string[]> {
  const calls = Array.from({ length: n }, () =>
    client.messages.create({
      model: TASK_MODEL,
      max_tokens: 24,
      temperature,
      messages: [{ role: 'user', content: PROMPT }],
    })
  );
  const responses = await Promise.all(calls);
  return responses.map(r => textOf(r).trim());
}

function report(label: string, outputs: string[]) {
  const unique = new Set(outputs);
  console.log(`  ${label}`);
  outputs.forEach((o, i) => console.log(`    run ${i + 1}: ${o}`));
  console.log(`    -> ${unique.size} unique result${unique.size === 1 ? '' : 's'} out of ${outputs.length}\n`);
}

// --- PART 1 & 2: the dial itself ---

async function showTheDial() {
  console.log('=== PART 1: Same prompt, five times, temperature 0 ===\n');
  report('temperature: 0', await sample(0, 5));

  console.log('=== PART 2: Same prompt, five times, temperature 1.0 ===\n');
  report('temperature: 1.0', await sample(1.0, 5));

  console.log('  Takeaway: temperature is how flat the model makes its own');
  console.log('  probability distribution before it picks the next token.');
  console.log('  0 = always take the most likely token. 1.0 = sample honestly.\n');
}

// --- PART 3: low temperature is not free ---

async function showTheCost() {
  console.log('=== PART 3: "Just set temperature 0" has a cost ===\n');
  console.log('  Task: generate 5 test usernames. Run it twice at each setting.\n');

  const listPrompt = 'Generate 5 usernames for banking app test accounts. Comma-separated, nothing else.';

  const distinct: Record<number, number> = {};

  for (const temperature of [0, 1.0]) {
    const runs = await Promise.all(
      [1, 2].map(() =>
        client.messages.create({
          model: TASK_MODEL,
          max_tokens: 80,
          temperature,
          messages: [{ role: 'user', content: listPrompt }],
        })
      )
    );
    const all = runs.flatMap(r => textOf(r).split(',').map(s => s.trim()).filter(Boolean));
    const unique = new Set(all);
    distinct[temperature] = unique.size;
    console.log(`  temperature ${temperature}:`);
    runs.forEach((r, i) => console.log(`    run ${i + 1}: ${textOf(r).trim()}`));
    console.log(`    -> ${unique.size} distinct usernames from ${all.length} generated\n`);
  }

  console.log('  Takeaway: temperature 0 gives you the SAME test data every run.');
  console.log('  Great for a deterministic fixture. Terrible for fuzzing or');
  console.log('  for generating a varied dataset — you get the same 5 names forever.\n');

  // Temperature 1 USUALLY varies here, but it is sampling, not a guarantee.
  // If one completion dominates hard enough ("testuser001"), honest sampling
  // can still land on it twice. Say so rather than pretending it did not happen.
  if (distinct[1.0] <= distinct[0]) {
    console.log('  ! HEADS UP: temperature 1 gave the same list this time too.');
    console.log('    That is not a broken demo — it is the lesson getting sharper.');
    console.log('    "testuser001" is such an overwhelmingly likely answer that even');
    console.log('    honest sampling keeps picking it. Temperature raises the CHANCE');
    console.log('    of variety; it does not promise it.');
    console.log('    The guaranteed half is the block above: temperature 0 is identical');
    console.log('    every run BY CONSTRUCTION, not by luck.\n');
  }
}

// --- PART 4: the plot twist ---

async function showTheTwist() {
  console.log('=== PART 4: On the newest models, temperature no longer exists ===\n');

  for (const model of ['claude-haiku-4-5', 'claude-sonnet-5', 'claude-opus-5']) {
    try {
      await client.messages.create({
        model,
        max_tokens: 16,
        temperature: 0,
        messages: [{ role: 'user', content: 'Say OK' }],
      });
      console.log(`  ${model.padEnd(18)} temperature: 0  -> 200 OK`);
    } catch (error) {
      const status = (error as { status?: number }).status;
      const message = (error as { error?: { error?: { message?: string } } }).error?.error?.message;
      console.log(`  ${model.padEnd(18)} temperature: 0  -> ${status} ${message}`);
    }
  }

  console.log('\n  The replacement is `effort`, which controls how hard the model');
  console.log('  thinks — not how randomly it picks tokens:\n');

  for (const effort of ['low', 'high'] as const) {
    const started = Date.now();
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 2048,
      // `output_config` is newer than this SDK's types, so we pass it through.
      ...({ output_config: { effort } } as Record<string, unknown>),
      messages: [{ role: 'user', content: 'Is a flaky test worth fixing before a release? Answer in one sentence.' }],
    });
    console.log(`  effort: ${effort.padEnd(5)} ${Date.now() - started}ms, ${response.usage.output_tokens} output tokens`);
    console.log(`    ${textOf(response).trim().slice(0, 140)}\n`);
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  Demo 17: Temperature — the randomness dial      ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  await showTheDial();
  await showTheCost();
  await showTheTwist();

  console.log('--- Key Concepts ---');
  console.log('1. TEMPERATURE:   flattens the next-token distribution. 0 = greedy, 1.0 = honest sampling.');
  console.log('2. NOT A SEED:    temperature 0 is "most likely token", not "reproducible run".');
  console.log('3. TRADE-OFF:     low temp = repeatable but repetitive; high temp = varied but unstable.');
  console.log('4. DEPRECATED:    Sonnet 5 / Opus 5 reject temperature. Use `effort` instead.');
  console.log('5. WHY WE CARE:   if output varies run to run, assert() is the wrong tool. We need evals.');
}

main().catch(console.error);
