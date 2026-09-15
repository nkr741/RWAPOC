#!/usr/bin/env bash
# Claude quality gate: review the diff against a base ref and exit 1 on any HIGH finding.
#
#   scripts/ci/quality-gate.sh [base-ref]        default base: origin/main
#
# Needs: ANTHROPIC_API_KEY, `claude` CLI (npm i -g @anthropic-ai/claude-code), jq, git.
# Writes quality-gate.json next to cwd and a markdown table to $GITHUB_STEP_SUMMARY when set.
set -euo pipefail

BASE="${1:-origin/main}"
MODEL="${CLAUDE_MODEL:-claude-sonnet-5}"
OUT="quality-gate.json"

DIFF=$(git diff "$BASE...HEAD" -- . ':!package-lock.json' ':!*.png' ':!*.snap' ':!*.md')
if [ -z "$DIFF" ]; then
  echo "No reviewable changes vs $BASE — gate passes."
  exit 0
fi

read -r -d '' PROMPT <<'EOF' || true
You are a strict senior reviewer for a Playwright + TypeScript E2E framework (see CLAUDE.md).
Review ONLY the diff inside <diff>. Read surrounding files if you need context. Report real
defects, not style.

Severity rubric:
- HIGH   — breaks or silently weakens tests, leaks secrets, or violates a hard repo rule:
           `any`, waitForTimeout, { force: true }, a test with no expect, a floating promise,
           hardcoded credentials, a locator that cannot match the RWA app.
- MEDIUM — likely flake (racy waits, order dependence), wrong layer (API call in a page
           object, locator in a test), missing assertion on a changed behaviour.
- LOW    — naming, dead code, comments, minor cleanup.

Respond with ONLY this JSON object — no prose, no markdown fences:
{"findings":[{"severity":"HIGH","file":"tests/x.spec.ts","line":12,"title":"short","detail":"why and the fix"}]}
Use an empty findings array when the diff is clean.
EOF

claude -p "$PROMPT

<diff>
$DIFF
</diff>" --model "$MODEL" --output-format json > claude-raw.json

# .result is the model's text; tolerate a stray ``` fence, then validate it parses.
jq -r '.result' claude-raw.json | sed -e '/^```/d' > "$OUT"
if ! jq -e '.findings' "$OUT" >/dev/null 2>&1; then
  echo "::error::Claude did not return parseable findings JSON:"
  cat "$OUT"
  exit 2
fi

HIGH=$(jq '[.findings[] | select(.severity=="HIGH")] | length' "$OUT")
TOTAL=$(jq '.findings | length' "$OUT")

{
  echo "## Claude quality gate — $TOTAL finding(s), $HIGH HIGH"
  echo
  if [ "$TOTAL" -gt 0 ]; then
    echo "| Severity | Location | Finding |"
    echo "|---|---|---|"
    jq -r '.findings[] | "| \(.severity) | `\(.file):\(.line // "")` | **\(.title)** — \(.detail) |"' "$OUT"
  else
    echo "Clean diff."
  fi
} | tee -a "${GITHUB_STEP_SUMMARY:-/dev/null}"

if [ "$HIGH" -gt 0 ]; then
  echo "::error::Quality gate failed: $HIGH HIGH severity finding(s)."
  exit 1
fi
echo "Quality gate passed."
