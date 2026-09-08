/**
 * Resolves the Anthropic API key for everything in demo-projects.
 *
 * Why this exists: `node --env-file=.env` does NOT override a variable that is
 * already set in your shell, and neither does anything else. A stale exported
 * ANTHROPIC_API_KEY therefore silently shadows .env and every call dies with a
 * 401 that looks like a broken key rather than a shadowed one.
 *
 * So we read .env explicitly and prefer it, falling back to the environment.
 * Also strips the UTF-8 BOM that Windows editors add, which corrupts the first
 * key name in the file.
 *
 * Note: this deliberately avoids `import.meta.url`. The tsx scripts run as ESM
 * but Playwright compiles specs to CommonJS, where import.meta is a syntax
 * error — so we walk up from the working directory instead.
 */
import fs from 'node:fs';
import path from 'node:path';

function findEnvFile(): string | null {
  let dir = process.cwd();
  for (let i = 0; i < 5; i += 1) {
    const candidate = path.join(dir, '.env');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export function loadAnthropicKey(): string {
  const envPath = findEnvFile();

  if (envPath) {
    const text = fs.readFileSync(envPath, 'utf8').replace(/^﻿/, '');
    const match = text.match(/^ANTHROPIC_API_KEY=(.*)$/m);
    const key = match?.[1]?.trim();
    if (key) return key;
  }

  const fromShell = process.env.ANTHROPIC_API_KEY?.trim();
  if (fromShell) return fromShell;

  throw new Error(
    'No ANTHROPIC_API_KEY found. Add it to demo-projects/.env or export it in your shell.'
  );
}
