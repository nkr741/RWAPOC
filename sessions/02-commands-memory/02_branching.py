"""Session 2 — session checkpointing and conversation branching, headless.

Interactive Claude Code gives you /rewind (Esc Esc) to restore code and/or conversation to any
earlier turn, and /branch to fork the conversation. Headless, the same thing is
`--resume <id> --fork-session`: the fork starts from the parent's transcript but gets its own id,
so two branches can diverge without touching each other.

    python sessions/02-commands-memory/02_branching.py
"""

import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from _env import ROOT  # noqa: E402


def ask(prompt: str, *args: str) -> dict:
    cmd = ["claude", "-p", "--model", "haiku", "--output-format", "json", *args, prompt]
    run = subprocess.run(
        cmd, capture_output=True, text=True, encoding="utf-8", cwd=ROOT, shell=sys.platform == "win32"
    )
    if run.returncode:
        sys.exit(run.stderr)
    return json.loads(run.stdout)


base = ask("Remember: the secret number is 17. Reply only 'stored'.")
print(f"base   {base['session_id']}  -> {base['result'].strip()}")

fork_a = ask(
    "Add 3 to the secret number. Reply with just the number.",
    "--resume",
    base["session_id"],
    "--fork-session",
)
fork_b = ask(
    "Multiply the secret number by 2. Reply with just the number.",
    "--resume",
    base["session_id"],
    "--fork-session",
)
print(f"fork A {fork_a['session_id']}  -> {fork_a['result'].strip()}")
print(f"fork B {fork_b['session_id']}  -> {fork_b['result'].strip()}")

# each fork continues its own history only
again_a = ask("What did you reply last time? Just the number.", "--resume", fork_a["session_id"])
print(f"fork A again -> {again_a['result'].strip()}")

ids = {base["session_id"], fork_a["session_id"], fork_b["session_id"]}
assert len(ids) == 3, "forks must get fresh session ids"
assert "20" in fork_a["result"] and "34" in fork_b["result"], "both forks inherit the base memory"
assert "20" in again_a["result"], "a fork resumes its own branch, not the sibling's"
print("\nOK — three ids, both forks saw the base turn, A's follow-up stayed on A")
