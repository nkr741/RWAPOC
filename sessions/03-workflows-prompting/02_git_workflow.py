"""Session 3 — git workflow with Claude Code, headless: commit message, PR description, changelog.

Reads real git data from this repo and asks Claude (haiku, --bare so no CLAUDE.md or hooks) to
draft each artefact. Prints only; commits nothing. In an interactive session the same prompts
are simply "commit this", "write the PR description", "changelog since v1.2".

    python sessions/03-workflows-prompting/02_git_workflow.py [<ref>]   # default HEAD
"""

import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from _env import ROOT  # noqa: E402

REF = sys.argv[1] if len(sys.argv) > 1 else "HEAD"


def git(*args: str) -> str:
    return subprocess.run(
        ["git", *args], capture_output=True, text=True, encoding="utf-8", cwd=ROOT, check=True
    ).stdout


def claude(prompt: str, stdin: str) -> str:
    cmd = ["claude", "-p", "--model", "haiku", "--bare", prompt]
    run = subprocess.run(
        cmd,
        input=stdin,
        capture_output=True,
        text=True,
        encoding="utf-8",
        cwd=ROOT,
        shell=sys.platform == "win32",
    )
    if run.returncode:
        sys.exit(run.stderr)
    return run.stdout.strip()


diff = git("show", "--stat", "--patch", "--no-color", REF)[:20000]  # cap: a diff is data, not a novel
log = git("log", "--no-merges", "--pretty=%h %s", "-15")

print(f"== commit message for {REF} ==")
print(
    claude(
        "Write a conventional-commit message for this diff: a type(scope): summary line under "
        "72 chars, blank line, then 1-3 bullets on WHY. Output the message only.",
        diff,
    )
)

print("\n== PR description ==")
print(
    claude(
        "Write a pull-request description for this diff with sections: Summary (2 sentences), "
        "Changes (bullets), Test plan (checklist). Markdown only, no preamble.",
        diff,
    )
)

print("\n== changelog from the last 15 commits ==")
print(
    claude(
        "Group these commits into a CHANGELOG section with headings Added / Changed / Fixed. "
        "Drop chores and docs-only commits. Markdown only.",
        log,
    )
)
