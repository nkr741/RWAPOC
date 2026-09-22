"""Custom Claude Code status line: model | context % | session cost | cache | git branch.

Wire it up in ~/.claude/settings.json (status line is a personal preference, not a team one):

    { "statusLine": { "type": "command", "command": "python C:/ryvan-e2e/claude-config/statusline.py" } }

Claude Code runs the command after every API response and pipes session JSON on stdin; whatever
we print is the bar. Field reference: https://code.claude.com/docs/en/statusline
Test without Claude:  python claude-config/statusline.py < claude-config/statusline.sample.json

Why Python and not the docs' bash examples: works identically in PowerShell, cmd, Git Bash and
Linux, and needs no jq on Windows.
"""

import json
import subprocess
import sys


def bar(pct: float, width: int = 10) -> str:
    filled = round(width * pct / 100)
    return "#" * filled + "-" * (width - filled)


def git_branch(cwd: str) -> str:
    try:
        r = subprocess.run(
            ["git", "-C", cwd, "branch", "--show-current"], capture_output=True, text=True, timeout=2
        )
        return r.stdout.strip() or ""
    except Exception:
        return ""


def main() -> None:
    try:
        d = json.load(sys.stdin)
    except json.JSONDecodeError:
        print("statusline: no data")
        return

    model = d.get("model", {}).get("display_name", "?")
    ctx = d.get("context_window", {}) or {}
    pct = ctx.get("used_percentage") or 0
    cost = (d.get("cost", {}) or {}).get("total_cost_usd", 0.0)
    cache = d.get("prompt_cache") or {}
    hit = cache.get("hit_ratio")
    warm = cache.get("warm")
    cwd = (d.get("workspace", {}) or {}).get("current_dir", "")
    branch = git_branch(cwd) if cwd else ""
    limits = d.get("rate_limits") or {}
    five_h = (limits.get("five_hour") or {}).get("used_percentage")

    parts = [
        f"{model}",
        f"ctx [{bar(pct)}] {pct:.0f}%",
        f"${cost:.2f}",
    ]
    if hit is not None:
        parts.append(f"cache {hit * 100:.0f}% {'warm' if warm else 'cold'}")
    if five_h is not None:
        parts.append(f"5h {five_h:.0f}%")
    if branch:
        parts.append(f"git:{branch}")
    print(" | ".join(parts))


if __name__ == "__main__":
    main()
