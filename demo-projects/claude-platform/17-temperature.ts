/**
 * Demo 17: Temperature
 *
 * Run:
 * npx tsx claude-platform/17-temperature.ts
 */

import { client, TASK_MODEL, textOf } from './_env.js';

const PROMPT =
  'Invent one realistic full name for a test user of a banking app. Reply with the name only.';

async function generate(temperature: number, count: number) {
  const responses = await Promise.all(
    Array.from({ length: count }, () =>
      client.messages.create({
        model: TASK_MODEL,
        max_tokens: 24,
        temperature,
        messages: [{ role: 'user', content: PROMPT }],
      })
    )
  );

  return responses.map(r => textOf(r).trim());
}

function showResults(temperature: number, results: string[]) {
  console.log(`Temperature: ${temperature}`);

  results.forEach((result, index) => {
    console.log(`  ${index + 1}. ${result}`);
  });

  console.log(`  Unique results: ${new Set(results).size}\n`);
}

async function main() {
  console.log('=== Temperature Demo ===\n');

  const low = await generate(0, 5);
  showResults(0, low);

  const high = await generate(1, 5);
  showResults(1, high);

  console.log('=== Test Data Example ===\n');

  const prompt =
    'Generate 5 usernames for banking app test accounts. Comma-separated, nothing else.';

  for (const temperature of [0, 1]) {
    const response = await client.messages.create({
      model: TASK_MODEL,
      max_tokens: 80,
      temperature,
      messages: [{ role: 'user', content: prompt }],
    });

    console.log(`Temperature: ${temperature}`);
    console.log(`  ${textOf(response).trim()}\n`);
  }

  console.log('=== Model Support ===\n');

  for (const model of [
    'claude-haiku-4-5',
    'claude-sonnet-5',
    'claude-opus-5',
  ]) {
    try {
      await client.messages.create({
        model,
        max_tokens: 16,
        temperature: 0,
        messages: [{ role: 'user', content: 'Say OK' }],
      });

      console.log(`${model}: temperature supported`);
    } catch (error) {
      const status = (error as { status?: number }).status;
      console.log(`${model}: temperature not accepted (${status})`);
    }
  }
}

main().catch(console.error);