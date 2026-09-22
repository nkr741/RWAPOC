"""Session 2 — model and effort selection, measured.

Same prompt through haiku / sonnet / opus and two effort levels; prints tokens, cost and
latency from the json envelope so the trade-off is data, not opinion.

    python sessions/02-commands-memory/03_models_effort.py
"""

import json
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from _env import ROOT  # noqa: E402

PROMPT = (
    "Explain in exactly three bullet points why Playwright's auto-waiting makes "
    "`waitForTimeout` unnecessary. No preamble."
)
RUNS = [("haiku", "low"), ("sonnet", "low"), ("sonnet", "high"), ("opus", "medium")]

print(f"{'model':<8}{'effort':<8}{'in':>7}{'out':>6}{'cost $':>9}{'secs':>6}  answer")
for model, effort in RUNS:
    t0 = time.time()
    cmd = ["claude", "-p", "--model", model, "--effort", effort, "--output-format", "json", "--bare", PROMPT]
    run = subprocess.run(
        cmd, capture_output=True, text=True, encoding="utf-8", cwd=ROOT, shell=sys.platform == "win32"
    )
    if run.returncode:
        sys.exit(run.stderr)
    env = json.loads(run.stdout)
    # modelUsage can list a second, tiny helper model (e.g. haiku for summaries); show the main one
    name, u = max(env["modelUsage"].items(), key=lambda kv: kv[1]["outputTokens"])
    print(
        f"{model:<8}{effort:<8}{u['inputTokens']:>7}{u['outputTokens']:>6}"
        f"{env['total_cost_usd']:>9.4f}{time.time() - t0:>6.1f}  {name}"
    )

print(
    "\nAliases resolve to the newest model of each tier; effort scales thinking depth "
    "(low→max). /model and /effort change them mid-session; ANTHROPIC_MODEL and settings "
    "`model` set defaults; `opusplan` = opus for plan mode, sonnet for execution."
)
