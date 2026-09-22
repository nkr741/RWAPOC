"""Compact table of every failed/flaky spec in a Playwright JSON report.

python .claude/skills/ci-triage/scripts/summarize.py [results.json]
"""

import json
import sys
from pathlib import Path

path = Path(sys.argv[1] if len(sys.argv) > 1 else "test-results/results.json")
if not path.exists():
    sys.exit(f"no report at {path} — run playwright with --reporter=json")

rows = []
for suite in json.loads(path.read_text())["suites"]:
    for spec in suite["specs"]:
        attempts = [(t["projectName"], r) for t in spec["tests"] for r in t["results"]]
        failed = [(p, r) for p, r in attempts if r["status"] in ("failed", "timedOut")]
        if not failed:
            continue
        status = "flaky" if spec["ok"] else "failed"
        first = failed[0][1]["error"]["message"].splitlines()[0][:110]
        rows.append(
            (f"{spec['file']}:{spec['line']}", status, failed[0][0], f"{len(failed)}/{len(attempts)}", first)
        )

print(f"{'spec':<44} {'status':<7} {'project':<9} {'fails':<6} first error")
for r in rows:
    print(f"{r[0]:<44} {r[1]:<7} {r[2]:<9} {r[3]:<6} {r[4]}")
print(f"\n{len(rows)} spec(s) need triage")
