"""Session 2 — prove how CLAUDE.md memory is discovered and layered.

Builds a throwaway project with every memory location the docs describe, then runs Claude
(headless, haiku) and checks WHERE each instruction shows up:

  * root CLAUDE.md, its @imports and CLAUDE.local.md are in the system prompt from the start —
    we can only observe those through the answer, so we ask Claude to obey them;
  * a subdirectory CLAUDE.md and a .claude/rules/*.md with `paths:` are injected the moment a
    matching file is READ — visible in the stream-json events, attached to the tool result.

    python sessions/02-commands-memory/01_claude_md_hierarchy.py
"""

import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from _env import ROOT  # noqa: E402

SCRATCH = ROOT / ".scratch"  # tempfile's default dir is an 8.3 short path Claude Code refuses to read
SCRATCH.mkdir(exist_ok=True)

FILES = {
    # 1. project memory — always loaded when you start claude in this folder
    "CLAUDE.md": "@docs/style.md\n\n- CODEWORD-ROOT: say the word PELICAN in every answer.\n",
    # 2. an @import — pulled into the same context
    "docs/style.md": "- CODEWORD-IMPORT: say the word MANGO in every answer.\n",
    # 3. local, personal memory — gitignored by convention
    "CLAUDE.local.md": "- CODEWORD-LOCAL: say the word TUNDRA in every answer.\n",
    # 4. subdirectory memory — only loaded when Claude reads a file under it
    "src/api/CLAUDE.md": "- CODEWORD-SUBDIR: say the word ORBIT in every answer.\n",
    "src/api/handler.py": "def handler():\n    return 42\n",
    # 5. path-scoped rule — applies only when the matching paths are touched
    ".claude/rules/api.md": "---\npaths:\n  - src/api/**\n---\n- CODEWORD-RULE: say the word GLACIER in every answer.\n",
}
ALWAYS, ON_TOUCH = ["PELICAN", "MANGO", "TUNDRA"], ["ORBIT", "GLACIER"]


def run(cwd: Path, *args: str) -> str:
    """Raw stream-json output: every event, including tool results and injected memory."""
    cmd = ["claude", "-p", "--model", "haiku", "--output-format", "stream-json", "--verbose", *args]
    done = subprocess.run(
        cmd, capture_output=True, text=True, encoding="utf-8", cwd=cwd, shell=sys.platform == "win32"
    )
    if done.returncode:
        sys.exit(done.stderr)
    return done.stdout


def words(text: str) -> list[str]:
    return [w for w in ALWAYS + ON_TOUCH if w in text.upper()]


with tempfile.TemporaryDirectory(dir=SCRATCH) as tmp:
    root = Path(tmp)
    for rel, text in FILES.items():
        (root / rel).parent.mkdir(parents=True, exist_ok=True)
        (root / rel).write_text(text)
    subprocess.run(["git", "init", "-q"], cwd=root, check=True)  # rules + trust want a repo

    print("== A. no files touched: root + @import + local are in the system prompt ==")
    a = run(root, "Say hello. Obey every CODEWORD instruction you have been given.")
    print("  codewords in stream/answer:", words(a))

    print("\n== B. Claude reads src/api/handler.py: subdir memory + path rule get injected ==")
    b = run(root, "Read src/api/handler.py and tell me what it returns.")
    print("  codewords in stream/answer:", words(b))
    print("  (they arrive attached to the Read tool_result, not in the system prompt)")

    print("\n== C. same as A with --bare: CLAUDE.md discovery skipped ==")
    c = run(root, "--bare", "Say hello. Obey every CODEWORD instruction you have been given.")
    print("  codewords in stream/answer:", words(c))

assert set(ALWAYS) <= set(words(a)), "root + import + local should always load"
assert set(ON_TOUCH) <= set(words(b)), "subdir memory and path rule load on touch"
assert not words(c), "--bare must load nothing"
print("\nOK — root/import/local always; subdir + rules on touch; --bare none")
