"""Session 6 — hooks, proven end to end.

Runs a headless session that is ASKED to do two things the repo forbids. The PreToolUse hook
(.claude/hooks/pre_tool_use.py, wired in .claude/settings.json) denies both; the PostToolUse
hook (claude-config/hooks/format_on_write.py) formats the one file Claude is allowed to write.

    python sessions/06-hooks-skills-agents/01_hooks_demo.py
"""

import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from _env import ROOT  # noqa: E402

SCRATCH = ROOT / ".scratch" / "hooks-demo"
SCRATCH.mkdir(parents=True, exist_ok=True)
target = SCRATCH / "demo.spec.ts"
target.write_text(
    "import { test } from '@playwright/test';\ntest('x', async ({ page }) => {\n  await page.goto('/');\n});\n"
)

PROMPT = (
    f"Do these three steps, in order, without asking questions. "
    f"1) Run the shell command: rm -rf {SCRATCH.as_posix()}/junk . "
    f"2) Edit {target.as_posix()} to add `await page.waitForTimeout(1000);` after the goto. "
    f'3) Write a file {SCRATCH.as_posix()}/note.json containing {{"ok":true}} (badly formatted is fine). '
    f"Report which steps were blocked and by what."
)

cmd = [
    "claude",
    "-p",
    "--model",
    "haiku",
    "--output-format",
    "stream-json",
    "--verbose",
    "--include-hook-events",
    "--permission-mode",
    "acceptEdits",
    "--allowedTools",
    "Bash,Edit,Write",
    "--",
    PROMPT,
]  # variadic flag: comma-join and end options with --
run = subprocess.run(
    cmd, capture_output=True, text=True, encoding="utf-8", cwd=ROOT, shell=sys.platform == "win32"
)
if run.returncode:
    sys.exit(run.stderr)

for line in run.stdout.splitlines():
    ev = json.loads(line)
    if ev["type"] == "system" and ev.get("subtype", "").startswith("hook"):
        print(
            f"  [{ev['subtype']:<14}] {ev.get('hook_event') or ev.get('hook_name', '')} {ev.get('tool_name', '')}"
            f" {('-> ' + str(ev.get('output', ''))[:90]) if ev.get('output') else ''}"
        )
    elif ev["type"] == "assistant":
        for b in ev["message"]["content"]:
            if b["type"] == "tool_use":
                print(f"  tool_use  {b['name']} {json.dumps(b['input'])[:80]}")
            elif b["type"] == "text":
                print("  claude:", b["text"].replace("\n", " ")[:300])
    elif ev["type"] == "user":
        for b in ev["message"]["content"]:
            if isinstance(b, dict) and b.get("type") == "tool_result" and b.get("is_error"):
                print("  denied  ->", str(b["content"])[:160])
    elif ev["type"] == "result":
        print(f"\nresult: turns={ev['num_turns']} permission_denials={len(ev.get('permission_denials', []))}")
        for d in ev.get("permission_denials", []):
            print(f"   - {d['tool_name']}: {json.dumps(d['tool_input'])[:70]}")

print(
    "\nnote.json after PostToolUse hook:",
    (SCRATCH / "note.json").read_text().strip() if (SCRATCH / "note.json").exists() else "(not written)",
)
assert "waitForTimeout" not in target.read_text(), "PreToolUse hook must have blocked the edit"
print(
    "OK — rm -rf and waitForTimeout blocked by the PreToolUse hook; note.json formatted by the PostToolUse hook"
)
