/**
 * Demo 19: Model-Based Evaluation
 *
 * One model does the task.
 * Another model evaluates the result.
 *
 * Run:
 * npx tsx claude-platform/19-model-based-eval.ts
 */

import { client, TASK_MODEL, JUDGE_MODEL, textOf } from './_env.js';

const TICKET = `
I was trying to pay my rent yesterday around 6pm.
I hit the transfer button and nothing happened.
Tried again on my iPhone using Safari and had the same problem.
It worked fine last week.
My colleague on Android said it worked for her.
Amount was 1450.
Account ends 8821.
`.trim();

async function generateSummary() {
  const response = await client.messages.create({
    model: TASK_MODEL,
    max_tokens: 300,
    temperature: 0,
    messages: [
      {
        role: 'user',
        content: `
Rewrite this support ticket as a clear bug report.

Include:
- Steps to Reproduce
- Expected Result
- Actual Result

Use only information from the ticket.

Ticket:
${TICKET}
        `,
      },
    ],
  });

  return textOf(response).trim();
}

async function judge(summary: string) {
  const response = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: `
You are reviewing an AI-generated bug report.

Compare the summary with the original ticket.

Give a score from 1 to 5 for:

1. Faithfulness
   Did the summary add information that was not in the ticket?

2. Completeness
   Did it capture the important information from the ticket?

3. Actionability
   Would a developer have enough information to start investigating?

Original ticket:
${TICKET}

Summary:
${summary}

Return:
- the score for each category
- one short reason for each score
- an overall score
        `,
      },
    ],
  });

  return textOf(response).trim();
}

async function main() {
  console.log('=== Model-Based Evaluation ===\n');

  console.log('--- Original Ticket ---\n');
  console.log(TICKET);

  console.log('\n--- Task Model Output ---\n');

  const summary = await generateSummary();

  console.log(summary);

  console.log('\n--- Judge Model Evaluation ---\n');

  const evaluation = await judge(summary);

  console.log(evaluation);

  console.log('\n--- Fabricated Example ---\n');

  const fabricated = `
Bug: Transfer fails on iOS Safari.

Steps:
1. Log in to account ending 8821.
2. Enter 1450.00 and select Landlord Property Management LLC.
3. Click Transfer.

Expected:
Transfer completes within 30 seconds.

Actual:
Request returns HTTP 502 after a 30-second timeout.
The issue affects 12% of iOS transfers and started in release 4.2.1.
  `.trim();

  console.log(fabricated);

  console.log('\n--- Judge Evaluation of Fabricated Example ---\n');

  const fabricatedEvaluation = await judge(fabricated);

  console.log(fabricatedEvaluation);
}

main().catch(console.error);