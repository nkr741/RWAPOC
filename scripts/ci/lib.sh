# Shared helper for the Claude CI scripts. Source it: `. "$(dirname "$0")/lib.sh"`
#
# claude_text PROMPT [MODEL]
#   Runs `claude -p` headless and prints ONLY the model's text on stdout.
#   `--output-format json` puts failures (bad key, rate limit, refusal) inside the JSON on
#   stdout with is_error=true and exits 1 — without this wrapper they would be silently piped
#   into the output file and the job would die with no visible cause.
claude_text() {
  local prompt="$1" model="${2:-${CLAUDE_MODEL:-claude-sonnet-5}}" raw status
  raw=$(mktemp)
  # `|| status=$?` keeps set -e from killing us before we can print the diagnostic.
  status=0
  claude -p "$prompt" --model "$model" --output-format json > "$raw" 2> "$raw.err" || status=$?
  if [ "$status" -ne 0 ] || jq -e '.is_error == true' "$raw" >/dev/null 2>&1; then
    {
      echo "::error::claude -p failed (exit $status)"
      echo "--- stderr ---"; cat "$raw.err"
      echo "--- stdout ---"; cat "$raw"
    } >&2
    rm -f "$raw" "$raw.err"
    return 1
  fi
  jq -r '.result' "$raw"
  rm -f "$raw" "$raw.err"
}
