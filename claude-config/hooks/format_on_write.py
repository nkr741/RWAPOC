"""PostToolUse hook: run Prettier on any file Claude just edited or wrote.

Wired in .claude/settings.json under hooks.PostToolUse with matcher "Edit|Write".
Claude Code sends the tool call as JSON on stdin; we pull tool_input.file_path out of it.

Contract (see https://code.claude.com/docs/en/hooks):
  - exit 0            -> fine, stdout is shown to the user only in verbose mode
  - exit 2            -> "blocking error": stderr is fed back to Claude as feedback
  - anything else     -> non-blocking error, shown to the user, Claude continues
We never block: formatting is a nicety, and a hook that fails must not stop the edit.
"""

import json
import subprocess
import sys
from pathlib import Path

FORMATTABLE = {".ts", ".tsx", ".js", ".mjs", ".json", ".md", ".yml", ".yaml"}


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0  # not our JSON, not our problem

    path = payload.get("tool_input", {}).get("file_path", "")
    if not path or Path(path).suffix.lower() not in FORMATTABLE:
        return 0

    # Prettier must run from the repo root to pick up .prettierrc; the hook's cwd is the
    # project dir already. --log-level warn keeps stdout quiet on success.
    result = subprocess.run(
        ["npx", "prettier", "--write", "--log-level", "warn", path],
        capture_output=True,
        text=True,
        shell=sys.platform == "win32",  # npx is a .cmd shim on Windows
    )
    if result.returncode != 0:
        # Non-blocking: tell the user, don't feed it back to Claude.
        print(f"format_on_write: prettier failed on {path}\n{result.stderr}", file=sys.stderr)
        return 1
    print(f"format_on_write: formatted {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
