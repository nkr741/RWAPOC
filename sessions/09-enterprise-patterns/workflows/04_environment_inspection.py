"""Agent pattern: ENVIRONMENT INSPECTION — the agent looks before it leaps.

Instead of guessing how to run the tests, the agent is given three read-only tools and a
question, and it inspects the repo (tree, files, a dry command) until it can answer with
evidence. This is the "agents and tools" half of the Academy workflows-vs-agents lesson: the
MODEL chooses the steps; the code only supplies tools and a turn cap.

    python sessions/09-enterprise-patterns/workflows/04_environment_inspection.py
"""

import subprocess
import sys
from pathlib import Path

import anthropic
from anthropic import beta_tool

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from _env import MODEL, ROOT  # noqa: E402

client = anthropic.Anthropic()


@beta_tool
def list_dir(path: str = ".") -> str:
    """List files and folders at a repo-relative path (non-recursive).

    Args:
        path: repo-relative directory, default the repo root.
    """
    p = (ROOT / path).resolve()
    if not p.is_relative_to(ROOT) or not p.is_dir():
        return f"ERROR: not a directory inside the repo: {path}"
    return "\n".join(
        sorted(
            f"{c.name}{'/' if c.is_dir() else ''}"
            for c in p.iterdir()
            if c.name not in ("node_modules", ".git")
        )
    )


@beta_tool
def read_file(path: str, max_chars: int = 4000) -> str:
    """Read a text file (truncated).

    Args:
        path: repo-relative file path.
        max_chars: cap on returned characters.
    """
    p = (ROOT / path).resolve()
    if not p.is_relative_to(ROOT) or not p.is_file():
        return f"ERROR: not a file inside the repo: {path}"
    return p.read_text(errors="replace")[:max_chars]


@beta_tool
def run_readonly(command: str) -> str:
    """Run a SAFE, read-only shell command (allowed: npx playwright test --list, git status, node --version, npm ls).

    Args:
        command: the exact command line.
    """
    allowed = (
        "npx playwright test --list",
        "git status",
        "node --version",
        "npm ls",
        "npm run",
        "git log --oneline",
    )
    if not command.startswith(allowed):
        return f"ERROR: command not in the allow-list {allowed}"
    r = subprocess.run(
        command, shell=True, capture_output=True, text=True, encoding="utf-8", cwd=ROOT, timeout=120
    )
    return (r.stdout + r.stderr)[-4000:]


runner = client.beta.messages.tool_runner(
    model=MODEL,
    max_tokens=4000,
    tools=[list_dir, read_file, run_readonly],
    messages=[
        {
            "role": "user",
            "content": (
                "I just cloned this repo. Inspect it and tell me: the exact command to run only the @smoke tests on Chromium, "
                "how many tests that selects, and what must be running first. Cite the files you used. Under 8 lines."
            ),
        }
    ],
)
for turn, message in enumerate(runner, 1):
    calls = [
        f"{b.name}({', '.join(f'{k}={str(v)[:30]}' for k, v in b.input.items())})"
        for b in message.content
        if b.type == "tool_use"
    ]
    print(f"turn {turn}: {calls or 'answer'}")
print("\n" + "".join(b.text for b in message.content if b.type == "text").strip())
