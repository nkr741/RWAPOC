"""PreToolUse hook: block dangerous shell commands and this repo's test anti-patterns.

Wired in .claude/settings.json (hooks.PreToolUse, matcher "Bash|Edit|Write|MultiEdit").
Claude Code pipes the pending tool call as JSON on stdin; we answer with a JSON decision.

  stdin : {"hook_event_name": "PreToolUse", "tool_name": "Bash", "tool_input": {...}, "cwd": ..., ...}
  stdout: {"hookSpecificOutput": {"hookEventName": "PreToolUse",
                                  "permissionDecision": "allow" | "deny" | "ask",
                                  "permissionDecisionReason": "shown to Claude (deny) or the user (ask)"}}
  exit 0 = decision above applies · exit 2 = block, stderr goes to Claude · other = warn, continue

Why a hook and not a permissions rule: rules match tool NAMES and command PREFIXES; only code
can look inside the text Claude is about to write.
"""

import json
import re
import sys

BLOCKED_COMMANDS = [
    (r"\brm\s+-[a-z]*r[a-z]*f|\brm\s+-[a-z]*f[a-z]*r", "recursive force delete"),
    (r"\bgit\s+push\b.*(--force|-f)\b", "force push"),
    (r"\bgit\s+reset\s+--hard\b", "hard reset discards work"),
    (r"\bDROP\s+(TABLE|DATABASE)\b", "destructive SQL"),
]
BLOCKED_IN_TESTS = [
    (
        r"waitForTimeout\(",
        "waitForTimeout is banned (playwright/no-wait-for-timeout) — use auto-waiting or expect.poll",
    ),
    (r"force:\s*true", "force clicks are banned (playwright/no-force-option) — fix the locator instead"),
    (r":\s*any\b", "`any` is banned — use an explicit type assertion"),
]


def decide(call: dict) -> tuple[str, str]:
    tool, args = call.get("tool_name", ""), call.get("tool_input", {})
    if tool == "Bash":
        cmd = args.get("command", "")
        for pattern, why in BLOCKED_COMMANDS:
            if re.search(pattern, cmd, re.IGNORECASE):
                return "deny", f"Blocked by pre_tool_use hook: {why} (`{cmd[:80]}`). Ask the user to run it."
    elif tool in ("Edit", "Write", "MultiEdit"):
        path = args.get("file_path", "")
        text = args.get("new_string", "") + args.get("content", "") + json.dumps(args.get("edits", []))
        if re.search(r"\.(spec|test)\.ts$|/pages/|/fixtures/", path.replace("\\", "/")):
            for pattern, why in BLOCKED_IN_TESTS:
                if re.search(pattern, text):
                    return "deny", f"Blocked by pre_tool_use hook in {path}: {why}"
    return "allow", ""


if __name__ == "__main__":
    call = json.load(sys.stdin)
    decision, reason = decide(call)
    if decision != "allow":
        print(
            json.dumps(
                {
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "permissionDecision": decision,
                        "permissionDecisionReason": reason,
                    }
                }
            )
        )
    sys.exit(0)
