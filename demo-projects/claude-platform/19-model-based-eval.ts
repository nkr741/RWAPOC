/**
 * Session Demo 19: Model-based evaluation — LLM as judge
 *
 * Demo 18 ended on a wall: no function can grade "is this bug summary any good?".
 * So we hire a second model to grade the first one. That is model-based eval.
 *
 * We show:
 *   1. A rubric-driven judge scoring real generated output, with reasoning
 *   2. The thing no code scorer can do: catching an invented detail
 *   3. What the judge costs, so nobody is surprised by the bill
 *
 * Run: npx tsx claude-platform/19-model-based-eval.ts
 */
import { client, TASK_MODEL, JUDGE_MODEL, textOf, costOf } from './_env.js';

const MESSY_TICKET = `
so i was trying to pay my rent yesterday evening around 6ish, hit the transfer
button and nothing happened. tried again on my phone (iphone, safari) and same
deal. worked fine last week. my colleague on android said it worked for her.
amount was 1450. account ends 8821.
`.trim();

// --- The judge: a rubric, a strict output shape, and a demand for evidence ---

interface Verdict {
  scores: { criterion: string; score: number; evidence: string }[];
  overall: number;
  verdict: string;
}

async function judge(summary: string, label: string): Promise<Verdict & { cost: number }> {
  const response = await client.messages.create({
    model: JUDGE_MODEL,
    // Opus 5 thinks before it answers, and that thinking spends output tokens.
    // Too low a cap here truncates the JSON mid-string and you get a parse error
    // that looks like the judge failed, when it just ran out of room.
    max_tokens: 6000,
    ...({ output_config: { effort: 'medium' } } as Record<string, unknown>),
    system:
      'You are a strict QA reviewer. You grade bug repro summaries. ' +
      'You never reward confident writing that is not supported by the source ticket.',
    messages: [
      {
        role: 'user',
        content: `Grade this bug repro summary against the original ticket.

ORIGINAL TICKET:
${MESSY_TICKET}

SUMMARY TO GRADE:
${summary}

Score each criterion 1-5:
- faithfulness: does every fact in the summary appear in the ticket? Invented specifics score 1.
- completeness: are the reproduction-relevant facts from the ticket captured?
- actionability: could a developer start reproducing this without asking follow-ups?

For each criterion, quote the specific text that justifies your score.

Reply with ONLY this JSON, no markdown fence:
{"scores":[{"criterion":"...","score":N,"evidence":"..."}],"overall":N,"verdict":"one sentence"}`,
      },
    ],
  });

  const raw = textOf(response)
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  try {
    const parsed = JSON.parse(raw) as Verdict;
    return { ...parsed, cost: costOf(response, JUDGE_MODEL) };
  } catch {
    // Never let a judge parse failure look like a low score. Say what happened.
    console.error(`  ! Could not parse the judge's reply for "${label}" (stop_reason: ${response.stop_reason}).`);
    console.error(`  ! Raw: ${raw.slice(0, 200)}...`);
    throw new Error('Judge returned unparseable output — raise max_tokens or tighten the format instruction.');
  }
}

function render(label: string, result: Verdict & { cost: number }) {
  console.log(`  ${label}`);
  for (const s of result.scores) {
    const bar = '█'.repeat(s.score) + '░'.repeat(5 - s.score);
    console.log(`    ${s.criterion.padEnd(14)} ${bar} ${s.score}/5`);
    console.log(`      evidence: ${s.evidence.slice(0, 110)}`);
  }
  console.log(`    OVERALL: ${result.overall}/5 — ${result.verdict}`);
  console.log(`    judge cost: $${result.cost.toFixed(5)}\n`);
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  Demo 19: Model-based eval — LLM as judge        ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  console.log('=== The input: a real-world messy ticket ===\n');
  console.log(MESSY_TICKET.split('\n').map(l => '  ' + l).join('\n'));
  console.log();

  // --- PART 1: generate, then judge ---
  console.log('=== PART 1: The task model writes a repro summary ===\n');
  const generated = textOf(
    await client.messages.create({
      model: TASK_MODEL,
      max_tokens: 400,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: `Rewrite this support ticket as a clear bug report with Steps to Reproduce, Expected, and Actual. Use only facts present in the ticket.\n\n${MESSY_TICKET}`,
        },
      ],
    })
  ).trim();

  console.log(generated.split('\n').map(l => '  ' + l).join('\n'));
  console.log('\n  There is no assertion you can write against that. Hence a judge.\n');

  console.log('=== PART 2: The judge grades it ===\n');
  render('Model-generated summary:', await judge(generated, 'generated'));

  // --- PART 3: the thing code cannot do ---
  console.log('=== PART 3: A summary that is well-written and quietly wrong ===\n');

  const PLAUSIBLE_BUT_FABRICATED = `
Bug: Transfer fails on iOS Safari

Steps to Reproduce:
1. Log in as a user with a checking account ending 8821
2. Navigate to Transfers and enter amount 1450.00
3. Select recipient "Landlord Property Management LLC"
4. Tap Transfer

Expected: Transfer completes and a confirmation email is sent within 30 seconds.
Actual: Request fails with HTTP 502 after a 30-second timeout. Error rate is
approximately 12% of iOS transfer attempts. Regression introduced in release 4.2.1.
`.trim();

  console.log(PLAUSIBLE_BUT_FABRICATED.split('\n').map(l => '  ' + l).join('\n'));
  console.log();
  console.log('  A keyword scorer LOVES this: it has "8821", "1450", "Safari", "Transfer",');
  console.log('  Steps/Expected/Actual headings. It would outscore the honest summary.');
  console.log('  But the recipient name, the HTTP 502, the 30s timeout, the 12% error');
  console.log('  rate and the release number are all invented. Watch the judge:\n');

  render('Fabricated summary:', await judge(PLAUSIBLE_BUT_FABRICATED, 'fabricated'));

  console.log('--- Key Concepts ---');
  console.log('1. MODEL-BASED:   a second model grades output against a rubric. Handles open-ended work.');
  console.log('2. RUBRIC:        vague prompts give vague scores. Name criteria and a fixed scale.');
  console.log('3. EVIDENCE:      make the judge quote its justification — it curbs vibes-based scoring');
  console.log('                  and gives you something to check when you disagree with it.');
  console.log('4. JUDGE >= TASK: grade Haiku output with Opus. A weak judge cannot spot a strong error.');
  console.log('5. COST:          the judge is the expensive part. Score with code where code can.');
  console.log('6. THE CATCH:     the judge is itself an LLM, with its own biases. That is demo 20.');
}

main().catch(console.error);
