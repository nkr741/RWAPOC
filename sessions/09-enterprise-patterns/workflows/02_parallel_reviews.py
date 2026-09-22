"""Workflow: PARALLELIZATION — the same diff reviewed by three specialists at once, then merged.

Sectioning (different lenses on the same input) is the pattern; voting (same prompt N times,
majority wins) is the other flavour. AsyncAnthropic + asyncio.gather gives real concurrency.

    python sessions/09-enterprise-patterns/workflows/02_parallel_reviews.py [<git ref>]   # default HEAD
"""

import asyncio
import subprocess
import sys
import time
from pathlib import Path

import anthropic
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from _env import MODEL, ROOT  # noqa: E402

REF = sys.argv[1] if len(sys.argv) > 1 else "HEAD"
DIFF = subprocess.run(
    ["git", "show", "--patch", "--no-color", REF, "--", ".", ":!*.md", ":!package-lock.json"],
    capture_output=True,
    text=True,
    encoding="utf-8",
    cwd=ROOT,
).stdout[:30000]

LENSES = {
    "security": "secrets in code, injection, unsafe shell, permissions, supply chain",
    "flakiness": "timing races, order dependence, waitForTimeout, shared state, retries masking bugs",
    "maintainability": "naming, duplication, dead code, wrong layer (locator in a test, API call in a page object)",
}


class Review(BaseModel):
    findings: list[str]  # "file:line — issue — fix"
    verdict: str  # approve | request_changes


client = anthropic.AsyncAnthropic()


async def review(lens: str, focus: str) -> tuple[str, Review]:
    r = await client.messages.parse(
        model=MODEL,
        max_tokens=2000,
        output_format=Review,
        system=f"You are a {lens} reviewer. Look ONLY for: {focus}. Report at most 5 real findings; none is fine.",
        messages=[{"role": "user", "content": f"<diff>\n{DIFF}\n</diff>"}],
    )
    return lens, r.parsed_output


async def main() -> None:
    t0 = time.time()
    results = await asyncio.gather(*(review(k, v) for k, v in LENSES.items()))  # all three in flight together
    print(f"3 reviews of {REF} in {time.time() - t0:.1f}s (parallel)\n")
    for lens, rev in results:
        print(f"== {lens}: {rev.verdict} ==")
        for f in rev.findings:
            print("  -", f[:140])
    # merge step: any request_changes blocks; findings de-duplicated by file:line
    blocked = [lens for lens, rev in results if rev.verdict == "request_changes"]
    print(f"\nmerged verdict: {'REQUEST_CHANGES by ' + ', '.join(blocked) if blocked else 'APPROVE'}")


asyncio.run(main())
