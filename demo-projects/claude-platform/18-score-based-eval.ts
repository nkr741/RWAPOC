/**
 * Demo 18: Score-Based Evaluation
 *
 * Claude generates an answer.
 * Our code checks the answer.
 *
 * Run:
 * npx tsx claude-platform/18-score-based-eval.ts
 */

import { client, TASK_MODEL, textOf } from './_env.js';

const TEST_CASES = [
  {
    ticket: 'Checkout button does nothing on Safari. All users affected.',
    expected: 'critical',
  },
  {
    ticket: 'Footer copyright year still says 2023.',
    expected: 'low',
  },
  {
    ticket: 'Password reset email arrives after 20 minutes.',
    expected: 'medium',
  },
  {
    ticket: 'Users can view other customers account balances.',
    expected: 'critical',
  },
];

async function askClaude(ticket: string) {
  const response = await client.messages.create({
    model: TASK_MODEL,
    max_tokens: 50,
    temperature: 0,
    messages: [
      {
        role: 'user',
        content: `
Classify this bug as critical, medium, or low.
Reply with only the severity.

Ticket: ${ticket}
        `,
      },
    ],
  });

  return textOf(response).trim().toLowerCase();
}

async function main() {
  console.log('=== Score-Based Evaluation ===\n');

  let passed = 0;

  for (const test of TEST_CASES) {
    const answer = await askClaude(test.ticket);

    const isCorrect = answer.includes(test.expected);

    console.log(`Ticket:   ${test.ticket}`);
    console.log(`Expected: ${test.expected}`);
    console.log(`Claude:   ${answer}`);
    console.log(`Result:   ${isCorrect ? 'PASS' : 'FAIL'}\n`);

    if (isCorrect) {
      passed++;
    }
  }

  const score = (passed / TEST_CASES.length) * 100;

  console.log('=== Final Score ===');
  console.log(`${passed}/${TEST_CASES.length} passed`);
  console.log(`Score: ${score}%`);
}

main().catch(console.error);