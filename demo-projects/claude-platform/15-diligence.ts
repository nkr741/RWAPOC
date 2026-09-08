/**
 * AI Fluency Demo: Diligence
 *
 * Diligence = ensuring responsible AI interaction. Covers transparency,
 * data safety, attribution, bias awareness, and ethical use in the
 * context of test automation.
 *
 * Run: npx tsx claude-platform/15-diligence.ts
 */
import Anthropic from '@anthropic-ai/sdk';
import { loadAnthropicKey } from '../anthropic-key.js';

const client = new Anthropic({ apiKey: loadAnthropicKey() });

async function diligenceDemo() {
  console.log('=== AI Fluency: Diligence (Responsible AI Use) ===\n');
  console.log('Diligence = ensuring you interact with AI responsibly.\n');

  // PRINCIPLE 1: Transparency
  console.log('--- Principle 1: TRANSPARENCY ---');
  console.log('  Be open about AI\'s role in your work.\n');
  console.log('  ✓ "This test was generated with Claude and reviewed by me"');
  console.log('  ✓ Add Co-Authored-By: Claude in commit messages');
  console.log('  ✓ Document AI-assisted decisions in PR descriptions');
  console.log('  ✗ Presenting AI-generated work as entirely your own');
  console.log('  ✗ Hiding AI involvement when it could affect trust\n');

  // PRINCIPLE 2: Data Safety
  console.log('--- Principle 2: DATA SAFETY ---');
  console.log('  Never send sensitive data to AI systems.\n');

  console.log('  SAFE to send:');
  console.log('    ✓ Public HTML structures');
  console.log('    ✓ Test code (no secrets)');
  console.log('    ✓ Error messages and stack traces');
  console.log('    ✓ Open-source code');
  console.log();
  console.log('  NEVER send:');
  console.log('    ✗ API keys, passwords, tokens');
  console.log('    ✗ Customer PII (names, emails, SSNs)');
  console.log('    ✗ Production database contents');
  console.log('    ✗ Internal security configurations');
  console.log();

  // Live demo: catching a data safety issue
  console.log('  --- Live Demo: AI Catches a Safety Issue ---');
  const safety = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 128,
    messages: [{
      role: 'user',
      content: `Review this test code for security issues:
test('api test', async () => {
  const response = await fetch('https://api.example.com/users', {
    headers: { 'Authorization': 'Bearer sk-prod-abc123xyz' }
  });
});
One sentence answer.`,
    }],
  });
  const safetyText = safety.content.find(b => b.type === 'text');
  console.log('  Input: Test with hardcoded API key');
  console.log('  Claude says:', safetyText?.text?.trim());
  console.log('  → AI can HELP enforce safety, but YOU must be vigilant\n');

  // PRINCIPLE 3: Verification
  console.log('--- Principle 3: VERIFICATION ---');
  console.log('  Always verify AI-generated code before using it.\n');
  console.log('  Verification steps:');
  console.log('    1. Read the generated code — don\'t just copy-paste');
  console.log('    2. Run the tests — does the code actually work?');
  console.log('    3. Check for hallucinated APIs — does page.selfHeal() exist?');
  console.log('    4. Review locator quality — are they semantic or fragile?');
  console.log('    5. Check for security issues — any hardcoded secrets?\n');

  // PRINCIPLE 4: Bias Awareness
  console.log('--- Principle 4: BIAS AWARENESS ---');
  console.log('  AI reflects patterns in its training data.\n');
  console.log('  In test automation:');
  console.log('    • AI may default to English-only test data');
  console.log('    • AI may assume US date formats (MM/DD/YYYY)');
  console.log('    • AI may not consider accessibility testing');
  console.log('    • AI may favor popular frameworks over your specific stack');
  console.log('  → Always ask: "What perspectives or cases might AI miss?"\n');

  // PRINCIPLE 5: Attribution & IP
  console.log('--- Principle 5: ATTRIBUTION ---');
  console.log('  Give proper credit and respect intellectual property.\n');
  console.log('  ✓ Use "Co-Authored-By: Claude" in git commits');
  console.log('  ✓ Note AI assistance in documentation');
  console.log('  ✓ Check your org\'s AI usage policy');
  console.log('  ✓ Anthropic API data is NOT used for training (enterprise policy)');

  // Live demo: responsible commit
  console.log('\n  --- Live Demo: Responsible Git Commit ---');
  console.log('  git commit -m "feat: add semantic locators for login page');
  console.log('');
  console.log('  AI-assisted: Claude generated initial locators,');
  console.log('  manually reviewed and adjusted for our app structure.');
  console.log('');
  console.log('  Co-Authored-By: Claude <noreply@anthropic.com>"');

  console.log('\n--- Diligence Checklist ---');
  console.log('  □ Am I transparent about AI\'s role?');
  console.log('  □ Is the data I\'m sending safe (no secrets, no PII)?');
  console.log('  □ Have I verified the output before using it?');
  console.log('  □ Have I considered what AI might miss (bias)?');
  console.log('  □ Am I giving proper attribution?');
  console.log('  □ Does this comply with my org\'s AI policy?');

  console.log('\n--- Key Takeaways ---');
  console.log('1. TRANSPARENCY: Be open about AI involvement');
  console.log('2. DATA SAFETY: Never send secrets, PII, or prod data');
  console.log('3. VERIFICATION: Always review before using AI output');
  console.log('4. BIAS AWARENESS: Ask what AI might miss');
  console.log('5. ATTRIBUTION: Credit AI contributions properly');
}

diligenceDemo().catch(console.error);
