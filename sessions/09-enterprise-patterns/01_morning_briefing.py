"""Pattern: MORNING BRIEFING — gather facts with code, let Claude write the narrative.

Deterministic collectors (git, test results, TODO scan) produce the facts; ONE model call turns
them into a briefing. Code gathers, model summarises — never the other way round. Schedule it
with /schedule (cloud routine), a cron, or the Desktop scheduled tasks (Session 6).

    python sessions/09-enterprise-patterns/01_morning_briefing.py [days=1]
"""

import json
import re
import subprocess
import sys
from datetime import date, timedelta
from pathlib import Path

import anthropic

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from _env import MODEL, ROOT  # noqa: E402

DAYS = int(sys.argv[1]) if len(sys.argv) > 1 else 1
since = (date.today() - timedelta(days=DAYS)).isoformat()


def git(*a: str) -> str:
    return subprocess.run(
        ["git", *a], capture_output=True, text=True, encoding="utf-8", cwd=ROOT
    ).stdout.strip()


facts = {
    "date": date.today().isoformat(),
    "branch": git("rev-parse", "--abbrev-ref", "HEAD"),
    "commits_since": git("log", f"--since={since}", "--pretty=%h %an: %s") or "(none)",
    "uncommitted_files": len(git("status", "--porcelain").splitlines()),
    "todos": [
        f"{p.relative_to(ROOT)}:{i + 1} {ln.strip()[:80]}"
        for p in list(ROOT.glob("tests/**/*.ts")) + list(ROOT.glob("utils/*.ts"))
        for i, ln in enumerate(p.read_text(encoding="utf-8", errors="replace").splitlines())
        if re.search(r"\b(TODO|FIXME)\b", ln)
    ][:10],
    "last_ci_results": json.loads((ROOT / "sessions/05-mcp/data/results.json").read_text())[
        "suites"
    ],  # stand-in for the nightly artifact
}

r = anthropic.Anthropic().messages.create(
    model=MODEL,
    max_tokens=800,
    system="You write a morning briefing for a QA lead. Under 12 lines. Lead with what needs a decision today. "
    "Plain text, no headings. Every claim must come from the facts given.",
    messages=[{"role": "user", "content": f"<facts>\n{json.dumps(facts, indent=1)[:12000]}\n</facts>"}],
)
print(f"Briefing for {facts['date']} (last {DAYS} day(s))\n")
print("".join(b.text for b in r.content if b.type == "text").strip())
