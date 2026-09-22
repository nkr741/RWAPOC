"""Session 1 — your first non-interactive Claude Code session, driven from Python.

Runs the same prompt three ways so you can see what each --output-format returns, then
resumes the session by id to prove the transcript persisted.

    python sessions/01-getting-started/01_first_session.py
"""

import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from _env import ROOT  # noqa: E402  (loads .env)

PROMPT = "In one sentence: what does this repo test? Do not edit anything."
MODEL = "haiku"  # cheapest; the point is the plumbing, not the answer


def claude(*args: str) -> str:
    """`claude -p ...` from the repo root; raise with stderr if the CLI fails."""
    cmd = ["claude", "-p", "--model", MODEL, *args]
    run = subprocess.run(
        cmd, capture_output=True, text=True, encoding="utf-8", cwd=ROOT, shell=sys.platform == "win32"
    )
    if run.returncode:
        sys.exit(f"claude exited {run.returncode}:\n{run.stderr}")
    return run.stdout


print("== 1. text (default) ==")
print(claude(PROMPT).strip())

print("\n== 2. json — one envelope, machine-readable ==")
env = json.loads(claude("--output-format", "json", PROMPT))
print(json.dumps({k: env[k] for k in ("subtype", "num_turns", "total_cost_usd", "session_id")}, indent=2))
print("result:", env["result"].strip())

print("\n== 3. stream-json — the agentic loop as events ==")
for line in claude("--output-format", "stream-json", "--verbose", PROMPT).splitlines():
    ev = json.loads(line)
    kind = ev["type"]
    if kind == "assistant":
        blocks = [b["type"] for b in ev["message"]["content"]]
        print(f"  assistant  blocks={blocks}")
    elif kind == "result":
        print(f"  result     turns={ev['num_turns']} cost=${ev['total_cost_usd']:.4f}")
    else:
        print(f"  {kind:<10} {ev.get('subtype', '')}")

print("\n== 4. resume the json session by id ==")
follow = json.loads(
    claude(
        "--resume", env["session_id"], "--output-format", "json", "What was my previous question? Quote it."
    )
)
print("result:", follow["result"].strip())
assert env["session_id"] == follow["session_id"], "resume must keep the same session id"
print("\nOK — same session id, transcript persisted under ~/.claude/projects/")
