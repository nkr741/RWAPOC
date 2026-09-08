/**
 * Session Demo 18: Score-based evaluation — grading with code
 *
 * "Score-based" (a.k.a. programmatic, deterministic, rule-based) grading means
 * a plain function decides pass/fail. No second model involved. It is cheap,
 * instant, reproducible — and it is the FIRST thing you should reach for.
 *
 * We show:
 *   1. A real eval set + a naive exact-match scorer, and why it lies to you
 *   2. The same run, scored properly (normalise, then constrain the output)
 *   3. Non-quality scorers you get for free: schema validity, latency, cost
 *
 * Run: npx tsx claude-platform/18-score-based-eval.ts
 */
import { client, TASK_MODEL, textOf, costOf } from './_env.js';

// --- THE EVAL SET: inputs with a known-correct answer ---

const EVAL_SET = [
  { ticket: 'Checkout button does nothing on Safari. No error shown. All users affected.', expected: 'critical' },
  { ticket: 'Footer copyright year still says 2023.', expected: 'low' },
  { ticket: 'Password reset email arrives after ~20 minutes instead of instantly.', expected: 'medium' },
  { ticket: 'Users can view other customers account balances by editing the URL.', expected: 'critical' },
  { ticket: 'Transaction list sorts by date descending when the user picked ascending.', expected: 'medium' },
  { ticket: 'Tooltip on the Help icon is cut off by 2px on 1366x768 screens.', expected: 'low' },
] as const;

interface Run {
  ticket: string;
  expected: string;
  raw: string;
  ms: number;
  cost: number;
}

// --- STEP 1: run the task under test ---

async function runTask(instruction: string): Promise<Run[]> {
  return Promise.all(
    EVAL_SET.map(async ({ ticket, expected }) => {
      const started = Date.now();
      const response = await client.messages.create({
        model: TASK_MODEL,
        max_tokens: 64,
        temperature: 0,
        messages: [{ role: 'user', content: `${instruction}\n\nTicket: ${ticket}` }],
      });
      return {
        ticket,
        expected,
        raw: textOf(response).trim(),
        ms: Date.now() - started,
        cost: costOf(response, TASK_MODEL),
      };
    })
  );
}

// --- STEP 2: the scorers. Just functions. That is the whole idea. ---

const exactMatch = (run: Run) => run.raw === run.expected;

const normalisedMatch = (run: Run) =>
  run.raw.toLowerCase().replace(/[^a-z]/g, '').includes(run.expected);

/** Naive: assumes the model returned bare JSON. It almost never does. */
function isValidJson(run: Run): boolean {
  try {
    const parsed = JSON.parse(run.raw) as { severity?: unknown };
    return typeof parsed.severity === 'string';
  } catch {
    return false;
  }
}

/** Models love to wrap JSON in a markdown fence. Strip it before parsing. */
function unfence(text: string): string {
  return text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
}

const jsonSeverityMatch = (run: Run) => {
  try {
    return (JSON.parse(unfence(run.raw)) as { severity?: string }).severity?.toLowerCase() === run.expected;
  } catch {
    return false;
  }
};

function score(label: string, runs: Run[], scorer: (run: Run) => boolean) {
  const passed = runs.filter(scorer).length;
  const pct = ((passed / runs.length) * 100).toFixed(0);
  console.log(`  ${label.padEnd(28)} ${passed}/${runs.length} (${pct}%)`);
  for (const run of runs) {
    if (!scorer(run)) {
      console.log(`      ✗ expected "${run.expected}", model said ${JSON.stringify(run.raw.slice(0, 60))}`);
    }
  }
  return passed / runs.length;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  Demo 18: Score-based eval — grading with code   ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // --- PART 1: the naive version ---
  console.log('=== PART 1: Free-text answer, scored by exact match ===\n');
  const loose = await runTask('Classify this bug ticket severity as critical, medium, or low.');

  console.log('  Raw model output:');
  for (const run of loose) console.log(`    [${run.expected.padEnd(8)}] ${JSON.stringify(run.raw)}`);
  console.log();

  const exactRate = score('exactMatch', loose, exactMatch);
  console.log();
  const normalisedRate = score('normalisedMatch', loose, normalisedMatch);
  console.log(`\n  Same model, same answers. The scorer alone moved the number from`);
  console.log(`  ${(exactRate * 100).toFixed(0)}% to ${(normalisedRate * 100).toFixed(0)}%. A bad scorer is indistinguishable from a bad model.\n`);

  // --- PART 2: constrain the output, then the scorer can be strict ---
  console.log('=== PART 2: Constrain the format, and strict scoring becomes honest ===\n');
  const strict = await runTask(
    'Classify this bug ticket severity. Reply with ONLY this JSON and nothing else: {"severity": "critical" | "medium" | "low"}'
  );

  console.log('  Raw model output:');
  for (const run of strict) console.log(`    [${run.expected.padEnd(8)}] ${JSON.stringify(run.raw)}`);
  console.log();

  console.log('  Scorer A — JSON.parse() straight off the response:');
  score('isValidJson', strict, isValidJson);
  console.log('\n  Every single case failed. The model IS right — it just wrapped the');
  console.log('  JSON in a ```json fence. This is the #1 bug in homemade eval harnesses:');
  console.log('  a 0% score that is entirely the scorer\'s fault.\n');

  console.log('  Scorer B — same check, but strip the fence first:');
  score('jsonSeverityMatch', strict, jsonSeverityMatch);
  console.log('\n  Takeaway: when an eval reports a suspiciously round number (0%, 100%),');
  console.log('  read the raw output before you touch the prompt. In production you');
  console.log('  remove this whole class of bug with structured outputs, so the API');
  console.log('  guarantees schema-valid JSON and there is no fence to strip.\n');

  // --- PART 3: the scorers that have nothing to do with correctness ---
  console.log('=== PART 3: Free scorers you already know how to write ===\n');
  const slowest = Math.max(...strict.map(r => r.ms));
  const totalCost = strict.reduce((sum, r) => sum + r.cost, 0);
  const p50 = strict.map(r => r.ms).sort((a, b) => a - b)[Math.floor(strict.length / 2)];

  console.log(`  latency p50            ${p50}ms`);
  console.log(`  latency worst case     ${slowest}ms       ${slowest < 5000 ? '✓ under 5000ms budget' : '✗ over budget'}`);
  console.log(`  cost for ${strict.length} cases      $${totalCost.toFixed(5)}  ($${(totalCost / strict.length).toFixed(5)} per case)`);
  console.log(`  cost at 10k cases/day  $${(totalCost / strict.length * 10_000).toFixed(2)}/day`);

  console.log('\n--- Key Concepts ---');
  console.log('1. SCORE-BASED:   a function grades the output. No second model, no API cost.');
  console.log('2. NEEDS TRUTH:   every case needs a known-correct answer. That is the expensive part.');
  console.log('3. SCORER BUGS:   a strict scorer on unconstrained output reports a fake failure rate.');
  console.log('4. ORDER:         constrain the output format FIRST, then score strictly.');
  console.log('5. NOT JUST PASS: latency, cost, and schema validity are scorers too — and free.');
  console.log('6. THE LIMIT:     none of this can grade "is this bug summary actually any good?"');
}

main().catch(console.error);
