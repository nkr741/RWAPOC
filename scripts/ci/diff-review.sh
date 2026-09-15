#!/usr/bin/env bash
# Claude code review of the diff against a base ref, as markdown on stdout.
# Used by .gitlab-ci.yml to post an MR note; GitHub uses claude-code-action instead.
#
#   scripts/ci/diff-review.sh [base-ref]        default base: origin/main
set -euo pipefail

BASE="${1:-origin/main}"
MODEL="${CLAUDE_MODEL:-claude-sonnet-5}"

DIFF=$(git diff "$BASE...HEAD" -- . ':!package-lock.json' ':!*.png' ':!*.snap')
if [ -z "$DIFF" ]; then
  echo "_No reviewable changes vs \`$BASE\`._"
  exit 0
fi

read -r -d '' PROMPT <<'EOF' || true
You are reviewing a merge request for a Playwright + TypeScript E2E framework (CLAUDE.md
describes the conventions: POM + fixtures, `data-test` ids, no `any`, no waitForTimeout, no
force clicks, every test asserts). Review ONLY the diff inside <diff>; open neighbouring files
when you need context.

Write the review as markdown with exactly these sections:

## Summary
Two or three sentences: what the change does and whether it is safe to merge.

## Findings
A bullet per issue, most severe first, each as `**[HIGH|MEDIUM|LOW]** \`file:line\` — what and
the fix`. Say "None." if the diff is clean. Only report real defects, not style preferences.

## Verdict
One of **APPROVE**, **APPROVE WITH NITS**, or **REQUEST CHANGES**, followed by one sentence.
EOF

claude -p "$PROMPT

<diff>
$DIFF
</diff>" --model "$MODEL" --output-format json | jq -r '.result'
