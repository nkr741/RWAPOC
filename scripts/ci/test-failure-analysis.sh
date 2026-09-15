#!/usr/bin/env bash
# Root-cause analysis of Playwright failures with Claude.
#
#   scripts/ci/test-failure-analysis.sh [results.json]   default: test-results/results.json
#
# Reads the Playwright JSON reporter output, hands every failed spec (with its error) to Claude,
# and writes test-failure-analysis.md — one section per failure, each classified as
# APP_BUG / TEST_BUG / FLAKY / ENV with the evidence and a concrete fix. Claude may open the
# failing spec and page objects for context; it cannot edit anything in -p mode.
# Appends to $GITHUB_STEP_SUMMARY when set. Exit 0 when there is nothing to analyse.
set -euo pipefail

RESULTS="${1:-test-results/results.json}"
MODEL="${CLAUDE_MODEL:-claude-sonnet-5}"
OUT="test-failure-analysis.md"

if [ ! -f "$RESULTS" ]; then
  echo "No $RESULTS — nothing to analyse."
  exit 0
fi

# Every spec with ok=false, flattened to what Claude needs: file:line, title, project, error.
FAILURES=$(jq '[.. | objects | select(has("specs")) | .specs[] | select(.ok == false)
  | {file, line, title,
     runs: [.tests[] | {project: .projectName, results: [.results[]
       | select(.status != "passed" and .status != "skipped")
       | {status, error: (.error.message // ""), retry}]}]}]' "$RESULTS")

COUNT=$(jq 'length' <<<"$FAILURES")
if [ "$COUNT" -eq 0 ]; then
  echo "All specs passed — nothing to analyse."
  exit 0
fi
echo "Analysing $COUNT failed spec(s)..."

read -r -d '' PROMPT <<'EOF' || true
You are the on-call engineer for a Playwright + TypeScript E2E suite against the Cypress Real
World App (see CLAUDE.md for the architecture). Below is the JSON for every failed spec from
one CI run, including the Playwright error for each attempt (retries included).

For EACH failure, open the spec file and any page object it uses, then write:

### `<file>:<line>` — <title>
- **Root cause:** one of APP_BUG | TEST_BUG | FLAKY | ENV, then one sentence of evidence
  drawn from the error text and the code you read.
- **Why:** 2–4 sentences. Cite the exact locator, assertion, or wait that failed.
- **Fix:** the concrete change — file, what to edit, and why it resolves the cause. A code
  snippet if it is under ten lines.

Rules: a retry that passed after a failure is FLAKY unless the error is clearly deterministic.
Timeouts on navigation with no app error are ENV. Never suggest waitForTimeout or force clicks
— this repo lints them as errors. Output markdown only, starting with a one-line summary
`**N failures: X APP_BUG, Y TEST_BUG, Z FLAKY, W ENV**`.
EOF

claude -p "$PROMPT

<failures>
$FAILURES
</failures>" --model "$MODEL" --output-format json | jq -r '.result' > "$OUT"

{
  echo "## Claude test-failure analysis"
  echo
  cat "$OUT"
} | tee -a "${GITHUB_STEP_SUMMARY:-/dev/null}"
