/**
 * The temperature dial, as a command you type in front of people.
 *
 * Demo 17 runs both settings for you, which is fine — but the room never sees
 * you change anything. Here the number is in the command, so they watch you
 * turn the dial and watch the answer change.
 *
 *   npx tsx claude-platform/_temp-dial.ts 0     <- always takes the top option
 *   npx tsx claude-platform/_temp-dial.ts 1     <- picks fairly from the list
 *   npx tsx claude-platform/_temp-dial.ts 0 8   <- 8 runs instead of 5
 */
import { client, TASK_MODEL, textOf } from './_env.js';

const temperature = Number(process.argv[2] ?? 0);
const runs = Number(process.argv[3] ?? 5);

if (Number.isNaN(temperature) || temperature < 0 || temperature > 1) {
  console.error('Temperature must be a number between 0 and 1. Try: npx tsx claude-platform/_temp-dial.ts 0');
  process.exit(1);
}

const PROMPT = 'Invent one realistic full name for a test user of a banking app. Reply with the name only.';

async function main() {
  // Show the setting going out, so nobody has to take your word for it.
  console.log();
  console.log('  Sending this, ' + runs + ' times:');
  console.log();
  console.log('    {');
  console.log(`      "model": "${TASK_MODEL}",`);
  console.log(`      "temperature": ${temperature},        <-- the dial`);
  console.log(`      "messages": [{ "role": "user", "content": "${PROMPT.slice(0, 46)}..." }]`);
  console.log('    }');
  console.log();

  const responses = await Promise.all(
    Array.from({ length: runs }, () =>
      client.messages.create({
        model: TASK_MODEL,
        max_tokens: 24,
        temperature,
        messages: [{ role: 'user', content: PROMPT }],
      })
    )
  );

  const answers = responses.map(r => textOf(r).trim());
  answers.forEach((a, i) => console.log(`    run ${i + 1}:  ${a}`));

  const unique = new Set(answers);
  console.log();
  console.log(`    ${unique.size} different answer${unique.size === 1 ? '' : 's'} out of ${runs}`);
  console.log();
  console.log(
    unique.size === 1
      ? '    Same answer every time. It took the top option on every run.'
      : `    Different answers. It picked from the list instead of always taking the top.`
  );
  console.log();
}

main().catch(console.error);
