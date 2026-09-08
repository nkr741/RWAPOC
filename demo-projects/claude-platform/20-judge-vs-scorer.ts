/**
 * Session Demo 20: Trusting the judge — bias, calibration, and choosing
 *
 * A judge is not an oracle. It is an LLM with an opinion, and it has known,
 * measurable failure modes. If you ship a judge without checking these, you
 * are not measuring quality — you are measuring the judge's habits.
 *
 * We measure three things live:
 *   1. Verbosity bias  — does padding a correct answer raise its score?
 *   2. Position bias   — does the same pair get a different winner if swapped?
 *   3. Calibration     — does the judge agree with our own human labels?
 *
 * Run: npx tsx claude-platform/20-judge-vs-scorer.ts
 */
import { client, JUDGE_MODEL, textOf, costOf } from './_env.js';

let spend = 0;

async function ask(prompt: string, maxTokens = 3000): Promise<string> {
  const response = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: maxTokens,
    ...({ output_config: { effort: 'low' } } as Record<string, unknown>),
    messages: [{ role: 'user', content: prompt }],
  });
  spend += costOf(response, JUDGE_MODEL);
  return textOf(response).replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
}

// --- PART 1: VERBOSITY BIAS ---

const TERSE = 'The test is flaky because the assertion runs before the API response arrives. Await the response, then assert.';

const PADDED = `Great question — this is a really common issue that trips up a lot of teams.

The root cause here is a race condition. Specifically, what is happening is that
your assertion is being evaluated before the asynchronous API response has actually
been received and processed by the client. This is a classic timing problem in
end-to-end testing.

To resolve this, you will want to explicitly await the API response before running
your assertion. This ensures the data is present at the moment of evaluation.

Hope this helps! Let me know if you would like me to elaborate further.`;

async function verbosityBias() {
  console.log('=== PART 1: Verbosity bias ===\n');
  console.log('  Two answers. Identical technical content. One is 20 words, one is 120.\n');

  const rate = async (answer: string, label: string) => {
    const raw = await ask(
      `Rate this answer to "why is my test flaky?" for helpfulness, 1-10.
Reply with ONLY JSON: {"score":N,"reason":"one sentence"}

ANSWER:
${answer}`
    );
    const parsed = JSON.parse(raw) as { score: number; reason: string };
    console.log(`  ${label.padEnd(22)} ${'█'.repeat(parsed.score)}${'░'.repeat(10 - parsed.score)} ${parsed.score}/10`);
    console.log(`      ${parsed.reason}`);
    return parsed.score;
  };

  const terseScore = await rate(TERSE, 'terse (20 words)');
  const paddedScore = await rate(PADDED, 'padded (120 words)');

  const delta = paddedScore - terseScore;
  console.log(`\n  Delta: ${delta > 0 ? '+' : ''}${delta} points for saying the same thing at 6x the length.`);
  console.log(delta > 0
    ? '  -> Verbosity bias is present. Your judge is partly rewarding word count.'
    : '  -> No verbosity bias on this run. Do not assume it holds for every rubric.');
  console.log('  Mitigation: name length-independence in the rubric, or normalise length first.\n');
}

// --- PART 2: POSITION BIAS ---

const ANSWER_A = 'Use getByRole for the submit button. It survives CSS refactors because it targets the accessibility tree, not the markup.';
const ANSWER_B = 'Use a data-test attribute on the submit button. It is explicit, owned by the test suite, and never changes for styling reasons.';

async function positionBias() {
  console.log('=== PART 2: Position bias ===\n');
  console.log('  Same two answers, asked twice. The only change is which one is listed first.\n');

  const compare = async (first: string, second: string, firstLabel: string, secondLabel: string) => {
    const raw = await ask(
      `Which answer is better for "how should I locate the submit button in a Playwright test?"
Reply with ONLY JSON: {"winner":"FIRST" or "SECOND","reason":"one sentence"}

FIRST:
${first}

SECOND:
${second}`
    );
    const parsed = JSON.parse(raw) as { winner: string; reason: string };
    const winnerLabel = parsed.winner === 'FIRST' ? firstLabel : secondLabel;
    console.log(`  order [${firstLabel} then ${secondLabel}]  -> winner: ${winnerLabel}`);
    console.log(`      ${parsed.reason}`);
    return winnerLabel;
  };

  const round1 = await compare(ANSWER_A, ANSWER_B, 'A', 'B');
  const round2 = await compare(ANSWER_B, ANSWER_A, 'B', 'A');

  console.log(
    round1 === round2
      ? `\n  Consistent: "${round1}" won both times. This pair is stable.\n`
      : `\n  FLIPPED: "${round1}" won, then "${round2}" won — same content, different order.\n  -> The verdict is being driven by position, not quality.\n`
  );
  console.log('  Mitigation: always run pairwise comparisons both ways and only trust');
  console.log('  a result that survives the swap. Treat a flip as "tie", not as a win.\n');
}

// --- PART 3: CALIBRATION AGAINST HUMAN LABELS ---

const HUMAN_LABELLED = [
  { answer: 'Add a 5 second waitForTimeout before the assertion.', human: 'bad', why: 'hardcoded wait, banned by our lint rules' },
  { answer: 'Await the network response with page.waitForResponse, then assert.', human: 'good', why: 'deterministic and event-driven' },
  { answer: 'Wrap the assertion in a retry loop that runs up to 10 times.', human: 'bad', why: 'hides the race instead of fixing it' },
  { answer: 'Use expect(locator).toBeVisible(), which auto-retries until the timeout.', human: 'good', why: 'idiomatic Playwright auto-waiting' },
] as const;

async function calibration() {
  console.log('=== PART 3: Calibration — does the judge agree with us? ===\n');
  console.log('  Four answers WE have already labelled good/bad by hand.\n');

  let agreements = 0;

  for (const { answer, human, why } of HUMAN_LABELLED) {
    const raw = await ask(
      `A developer suggests this fix for a flaky Playwright test. Is it good practice?
Reply with ONLY JSON: {"label":"good" or "bad","reason":"one sentence"}

SUGGESTION: ${answer}`
    );
    const parsed = JSON.parse(raw) as { label: string; reason: string };
    const agrees = parsed.label === human;
    if (agrees) agreements += 1;
    console.log(`  ${agrees ? '✓ agree   ' : '✗ DISAGREE'} human=${human.padEnd(5)} judge=${parsed.label.padEnd(5)} | ${answer.slice(0, 58)}`);
    if (!agrees) console.log(`      our reasoning:   ${why}`);
    if (!agrees) console.log(`      judge reasoning: ${parsed.reason}`);
  }

  const rate = ((agreements / HUMAN_LABELLED.length) * 100).toFixed(0);
  console.log(`\n  Agreement: ${agreements}/${HUMAN_LABELLED.length} (${rate}%)`);
  console.log('  This number is the only thing that entitles you to trust the judge.');
  console.log('  Below ~80%, fix the rubric before you use the judge to make decisions.\n');
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  Demo 20: Trusting the judge — bias & choosing   ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  await verbosityBias();
  await positionBias();
  await calibration();

  console.log('=== The decision table ===\n');
  console.log('  Can a function check it?           -> score-based. Always. Free and instant.');
  console.log('  Is there one known-correct answer? -> score-based, after constraining the format.');
  console.log('  Is it open-ended prose or code?    -> model-based, with a rubric + evidence.');
  console.log('  Is the decision high-stakes?       -> model-based to triage, human to decide.');
  console.log(`\n  Total judge spend for this demo: $${spend.toFixed(4)}`);

  console.log('\n--- Key Concepts ---');
  console.log('1. VERBOSITY BIAS: judges tend to reward length. Measure it before trusting scores.');
  console.log('2. POSITION BIAS:  swap the order and re-run. A flipped verdict means "tie".');
  console.log('3. CALIBRATION:    agreement with human labels is what earns the judge its authority.');
  console.log('4. LAYERED:        score-based first, judge only what code cannot reach.');
  console.log('5. NOT A RUBBER STAMP: a judge narrows what humans review. It does not replace them.');
}

main().catch(console.error);
