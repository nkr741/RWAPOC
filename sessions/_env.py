"""Load the repo's .env into os.environ (shell values win) and expose shared constants.

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))   # or parents[2] one level deeper
from _env import ROOT, MODEL
"""

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.stdout.reconfigure(encoding="utf-8")  # Windows consoles default to cp1252

for line in (ROOT / ".env").read_text().splitlines() if (ROOT / ".env").exists() else []:
    if "=" in line and not line.lstrip().startswith("#"):
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip("'\""))

# Windows: the Agent SDK spawns `claude`, which needs git-bash and does not always inherit PATH.
if sys.platform == "win32" and "CLAUDE_CODE_GIT_BASH_PATH" not in os.environ:
    import shutil
    import subprocess

    if shutil.which("git"):  # <git root>/mingw64/libexec/git-core -> <git root>/bin/bash.exe
        exec_path = subprocess.run(["git", "--exec-path"], capture_output=True, text=True).stdout.strip()
        bash = Path(exec_path).parents[2] / "bin" / "bash.exe"
        if bash.exists():
            os.environ["CLAUDE_CODE_GIT_BASH_PATH"] = str(bash)

# One knob for every API demo. ANTHROPIC_MODEL is also what Claude Code itself honours.
MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-opus-5")
CHEAP = "claude-haiku-4-5"  # graders, bulk workers, subagents
