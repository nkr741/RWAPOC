/**
 * Shared client for the "Temperature, Scoring & Judging" session (demos 17-20).
 *
 * Why this exists: `node --env-file=.env` does NOT override a variable that is
 * already set in your shell. If you have a stale ANTHROPIC_API_KEY exported,
 * it silently shadows .env and every demo dies with a 401 mid-session.
 * So we read .env explicitly and prefer it. (Also strips the UTF-8 BOM that
 * Windows editors like to add, which corrupts the first key name.)
 */
import Anthropic from '@anthropic-ai/sdk';
import { loadAnthropicKey } from '../anthropic-key.js';

export const client = new Anthropic({ apiKey: loadAnthropicKey() });

/** The model we run the *task* on. Cheap, and still supports `temperature`. */
export const TASK_MODEL = 'claude-haiku-4-5';

/** The model we run the *judge* on. A judge should be at least as strong as the task model. */
export const JUDGE_MODEL = 'claude-opus-5';

/** Pull the plain text out of a response. */
export function textOf(response: Anthropic.Message): string {
  return response.content.find(b => b.type === 'text')?.text ?? '';
}

/** Rough USD cost. Haiku 4.5 = $1/$5 per MTok, Opus 5 = $5/$25 per MTok. */
export function costOf(response: Anthropic.Message, model: string): number {
  const [inRate, outRate] = model.startsWith('claude-opus') ? [5, 25] : [1, 5];
  return (response.usage.input_tokens * inRate + response.usage.output_tokens * outRate) / 1_000_000;
}
