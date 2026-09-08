/**
 * AI Fluency Demo: Model-Based Code & Data Generation + Evaluation
 *
 * The complete pipeline: Generate test data → Generate test code →
 * Run it → Evaluate quality. Shows how to use Claude as a code/data
 * generator AND evaluator in one automated workflow.
 *
 * Run: npx tsx claude-platform/16-model-eval-pipeline.ts
 */
import Anthropic from '@anthropic-ai/sdk';
import { loadAnthropicKey } from '../anthropic-key.js';

const client = new Anthropic({ apiKey: loadAnthropicKey() });

// --- PHASE 1: MODEL-BASED TEST DATA GENERATION ---

async function generateTestData(): Promise<string> {
  console.log('=== PHASE 1: Model-Based Test Data Generation ===\n');
  console.log('  Asking Claude to generate realistic test data...\n');

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Generate test data for a banking app login test in TypeScript.
Create a const object with:
- 3 valid users (username, password, expectedName)
- 3 invalid scenarios (username, password, expectedError)
- Edge cases: empty fields, special characters, SQL injection attempt

Return ONLY the TypeScript code, no explanation. Use "as const".`,
    }],
  });

  const text = response.content.find(b => b.type === 'text')?.text ?? '';
  console.log('  Generated test data:');
  console.log('  ' + text.split('\n').slice(0, 15).join('\n  '));
  if (text.split('\n').length > 15) console.log('  ... (truncated)');
  console.log(`\n  Tokens used: ${response.usage.input_tokens} in / ${response.usage.output_tokens} out`);
  console.log('  Cost: ~$' + ((response.usage.input_tokens * 1 + response.usage.output_tokens * 5) / 1_000_000).toFixed(4));
  return text;
}

// --- PHASE 2: MODEL-BASED CODE GENERATION ---

async function generateTestCode(testData: string): Promise<string> {
  console.log('\n=== PHASE 2: Model-Based Code Generation ===\n');
  console.log('  Asking Claude to write test code using the generated data...\n');

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Using this test data:
${testData}

Write a Playwright test file that:
1. Imports the test data
2. Tests each valid user can login (loop over validUsers)
3. Tests each invalid scenario shows the correct error
4. Uses getByRole and getByLabel locators (NOT CSS selectors)
5. Uses Playwright's test.describe and test blocks
6. Does NOT use waitForTimeout

Return ONLY the code.`,
    }],
  });

  const text = response.content.find(b => b.type === 'text')?.text ?? '';
  console.log('  Generated test code:');
  console.log('  ' + text.split('\n').slice(0, 20).join('\n  '));
  if (text.split('\n').length > 20) console.log('  ... (truncated)');
  console.log(`\n  Tokens used: ${response.usage.input_tokens} in / ${response.usage.output_tokens} out`);
  return text;
}

// --- PHASE 3: SIMULATED TEST RUN ---

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

function simulateTestRun(code: string): TestResult[] {
  console.log('\n=== PHASE 3: Running Generated Tests (Simulated) ===\n');

  const results: TestResult[] = [
    { name: 'valid login - user demo', status: 'passed', duration: 1234 },
    { name: 'valid login - user admin', status: 'passed', duration: 987 },
    { name: 'valid login - user testuser', status: 'passed', duration: 1102 },
    { name: 'invalid login - wrong password', status: 'passed', duration: 856 },
    { name: 'invalid login - nonexistent user', status: 'passed', duration: 743 },
    { name: 'invalid login - empty fields', status: 'passed', duration: 612 },
    { name: 'edge case - special characters', status: 'passed', duration: 891 },
    { name: 'edge case - SQL injection', status: 'passed', duration: 934 },
    { name: 'edge case - XSS attempt', status: 'failed', duration: 2001, error: 'Timeout: locator not found' },
  ];

  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;

  console.log('  Test Results:');
  for (const r of results) {
    const icon = r.status === 'passed' ? '✓' : '✗';
    const suffix = r.error ? ` — ${r.error}` : '';
    console.log(`    ${icon} ${r.name} (${r.duration}ms)${suffix}`);
  }
  console.log(`\n  Summary: ${passed} passed, ${failed} failed, ${results.length} total`);

  return results;
}

// --- PHASE 4: MODEL-BASED EVALUATION ---

interface EvalResult {
  overallScore: number;
  categories: { name: string; score: number; feedback: string }[];
  verdict: string;
}

async function evaluateWithModel(
  testData: string,
  testCode: string,
  testResults: TestResult[]
): Promise<EvalResult> {
  console.log('\n=== PHASE 4: Model-Based Evaluation ===\n');
  console.log('  Asking Claude to evaluate the generated code quality...\n');

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `You are a QA evaluation engine. Score this AI-generated test on a 1-10 scale.

TEST DATA GENERATED:
${testData.slice(0, 500)}

TEST CODE GENERATED:
${testCode.slice(0, 800)}

TEST RESULTS:
${JSON.stringify(testResults.map(r => ({ name: r.name, status: r.status })), null, 2)}

Evaluate these categories (1-10 each):
1. Locator Quality: Are locators semantic (getByRole/getByLabel) or fragile (CSS)?
2. Data Coverage: Does test data cover valid, invalid, and edge cases?
3. Assertion Quality: Are assertions meaningful and specific?
4. Code Structure: Is code well-organized with proper test blocks?
5. Security: Any hardcoded secrets or unsafe patterns?

Return JSON only:
{
  "overallScore": <number>,
  "categories": [{"name": "...", "score": <number>, "feedback": "..."}],
  "verdict": "<one sentence summary>"
}`,
    }],
  });

  const text = response.content.find(b => b.type === 'text')?.text ?? '{}';
  // Extract JSON from the response (handle markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const evalResult: EvalResult = JSON.parse(jsonMatch?.[0] ?? '{"overallScore":0,"categories":[],"verdict":"Parse error"}');

  console.log('  Evaluation Results:');
  console.log(`  Overall Score: ${evalResult.overallScore}/10\n`);
  for (const cat of evalResult.categories) {
    const bar = '█'.repeat(cat.score) + '░'.repeat(10 - cat.score);
    console.log(`    ${cat.name.padEnd(20)} ${bar} ${cat.score}/10`);
    console.log(`      ${cat.feedback}`);
  }
  console.log(`\n  Verdict: ${evalResult.verdict}`);
  console.log(`\n  Tokens used: ${response.usage.input_tokens} in / ${response.usage.output_tokens} out`);

  return evalResult;
}

// --- MAIN PIPELINE ---

async function runPipeline() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  Model-Based Code & Data Generation + Eval      ║');
  console.log('║  Generate → Run → Evaluate (Full Pipeline)      ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // Phase 1: Generate test data
  const testData = await generateTestData();

  // Phase 2: Generate test code using the data
  const testCode = await generateTestCode(testData);

  // Phase 3: Run the tests (simulated)
  const testResults = simulateTestRun(testCode);

  // Phase 4: Evaluate everything with AI
  const evaluation = await evaluateWithModel(testData, testCode, testResults);

  // Summary
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  PIPELINE SUMMARY                                ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`  Phase 1 - Data Generation:  ✓ Generated valid/invalid/edge case data`);
  console.log(`  Phase 2 - Code Generation:  ✓ Generated ${testCode.split('\n').length} lines of test code`);
  console.log(`  Phase 3 - Test Execution:   ${testResults.filter(r => r.status === 'passed').length}/${testResults.length} tests passed`);
  console.log(`  Phase 4 - AI Evaluation:    Score ${evaluation.overallScore}/10`);
  console.log();

  const passRate = testResults.filter(r => r.status === 'passed').length / testResults.length * 100;
  if (evaluation.overallScore >= 7 && passRate >= 80) {
    console.log('  ✓ PIPELINE VERDICT: Code is PRODUCTION-READY (score ≥ 7, pass rate ≥ 80%)');
  } else {
    console.log('  ✗ PIPELINE VERDICT: Code needs REFINEMENT (iterate with feedback)');
    console.log('  → Feed evaluation feedback back as a prompt to improve the code');
    console.log('  → This creates a self-improving loop: generate → run → eval → fix → repeat');
  }

  console.log('\n--- Key Concepts ---');
  console.log('1. MODEL-BASED DATA GEN:  AI creates realistic, diverse test data');
  console.log('2. MODEL-BASED CODE GEN:  AI writes test code using the generated data');
  console.log('3. EXECUTION:             Run the generated tests (real or simulated)');
  console.log('4. MODEL-BASED EVAL:      AI evaluates code quality on 5 dimensions');
  console.log('5. FEEDBACK LOOP:         Eval results feed back into generation (self-improving)');
  console.log('6. COST TRACKING:         Every phase shows token usage and estimated cost');
}

runPipeline().catch(console.error);
