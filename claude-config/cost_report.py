"""Cost report from Claude Code's local session transcripts - no admin key needed.

    python claude-config/cost_report.py                 # last 14 days, every project on this machine
    python claude-config/cost_report.py --days 30
    python claude-config/cost_report.py --project ryvan-e2e
    python claude-config/cost_report.py --by session    # top sessions instead of by day

Claude Code writes every API response to ~/.claude/projects/<project>/<session>.jsonl (or
$CLAUDE_CONFIG_DIR). Each assistant line carries `message.model` and `message.usage` with the
four token buckets that pricing cares about. This script sums them and prices them at list rate.

Two things the naive version gets wrong, both handled here:
  1. A streamed reply is written as SEVERAL lines that share one `message.id` (one per content
     block) and each repeats the same `usage`. Count each message.id once, using its last line.
  2. Cache tokens are not input tokens: cache writes cost 1.25x input, cache reads cost 0.1x.
     Ignoring that overstates a typical Claude Code session by 5-10x.

Same figure Claude Code shows in `/usage` (Session block) and in `claude -p --output-format json`
as total_cost_usd - this just aggregates it across sessions and days. Subscription users: these
are what the tokens WOULD cost at API list price; the plan is billed per seat, not per token.
Rates as of 2026-09 - update PRICING when Anthropic changes the price list.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from pathlib import Path

# USD per million tokens: (input, output). Cache write = 1.25 x input, cache read = 0.10 x input.
PRICING = {
    "claude-opus-5": (5.00, 25.00),
    "claude-opus-4-8": (5.00, 25.00),
    "claude-opus-4-7": (5.00, 25.00),
    "claude-opus-4-6": (5.00, 25.00),
    "claude-sonnet-5": (2.00, 10.00),
    "claude-sonnet-4-6": (3.00, 15.00),
    "claude-haiku-4-5": (1.00, 5.00),
    "claude-fable-5-1": (10.00, 50.00),
    "claude-fable-5": (10.00, 50.00),
}
CACHE_WRITE_MULT = 1.25
CACHE_READ_MULT = 0.10


def price_key(model: str) -> str | None:
    """'claude-opus-4-6-20250514[1m]' -> 'claude-opus-4-6'. Longest matching prefix wins."""
    m = model.split("[")[0]
    for k in sorted(PRICING, key=len, reverse=True):
        if m.startswith(k):
            return k
    return None


def cost_usd(model: str, u: dict) -> float:
    k = price_key(model)
    if k is None:
        return 0.0
    inp, out = PRICING[k]
    return (
        u.get("input_tokens", 0) * inp
        + u.get("output_tokens", 0) * out
        + u.get("cache_creation_input_tokens", 0) * inp * CACHE_WRITE_MULT
        + u.get("cache_read_input_tokens", 0) * inp * CACHE_READ_MULT
    ) / 1_000_000


def iter_messages(root: Path, since: datetime, project_filter: str | None):
    """Yield (project, session_id, timestamp, model, usage) - one per unique message.id."""
    for proj_dir in sorted(root.iterdir()):
        if not proj_dir.is_dir():
            continue
        project = proj_dir.name
        if project_filter and project_filter.lower() not in project.lower():
            continue
        for f in proj_dir.glob("*.jsonl"):
            last_by_id: dict[str, tuple] = {}
            with f.open(encoding="utf-8", errors="replace") as fh:
                for line in fh:
                    if '"usage"' not in line:
                        continue  # cheap pre-filter; user/tool lines have no usage
                    try:
                        d = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if d.get("type") != "assistant":
                        continue
                    if (d.get("message") or {}).get("model") == "<synthetic>":
                        continue  # Claude Code internal placeholder, no tokens billed
                    msg = d.get("message") or {}
                    usage = msg.get("usage")
                    if not usage:
                        continue
                    ts = d.get("timestamp")
                    if not ts:
                        continue
                    when = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                    if when < since:
                        continue
                    mid = msg.get("id") or d.get("requestId") or d.get("uuid")
                    last_by_id[mid] = (project, f.stem, when, msg.get("model", "?"), usage)
            yield from last_by_id.values()


def fmt_tokens(n: int) -> str:
    return f"{n / 1000:.1f}k" if n >= 1000 else str(n)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=14)
    ap.add_argument("--project", help="substring of the project dir name, e.g. ryvan-e2e")
    ap.add_argument("--by", choices=["day", "session", "model", "project"], default="day")
    ap.add_argument("--top", type=int, default=15)
    args = ap.parse_args()

    root = Path(os.environ.get("CLAUDE_CONFIG_DIR", Path.home() / ".claude")) / "projects"
    if not root.exists():
        print(f"No transcripts at {root}")
        return 1
    since = datetime.now(UTC) - timedelta(days=args.days)

    totals = defaultdict(lambda: {"cost": 0.0, "msgs": 0, "in": 0, "out": 0, "cw": 0, "cr": 0})
    by_model = defaultdict(float)
    unknown_models: set[str] = set()
    grand = 0.0

    for project, session, when, model, u in iter_messages(root, since, args.project):
        c = cost_usd(model, u)
        if price_key(model) is None:
            unknown_models.add(model)
        key = {
            "day": when.astimezone().strftime("%Y-%m-%d"),
            "session": f"{project[:28]:28} {session[:8]}",
            "model": model,
            "project": project,
        }[args.by]
        t = totals[key]
        t["cost"] += c
        t["msgs"] += 1
        t["in"] += u.get("input_tokens", 0)
        t["out"] += u.get("output_tokens", 0)
        t["cw"] += u.get("cache_creation_input_tokens", 0)
        t["cr"] += u.get("cache_read_input_tokens", 0)
        by_model[model] += c
        grand += c

    if not totals:
        print(
            f"No assistant messages in the last {args.days} days"
            + (f" for project '{args.project}'" if args.project else "")
        )
        return 0

    print(
        f"Claude Code spend at API list price - last {args.days} days"
        + (f", project ~ '{args.project}'" if args.project else ", all projects")
        + f"\nSource: {root}\n"
    )
    print(f"{args.by:38} {'cost $':>8} {'msgs':>6} {'input':>8} {'output':>8} {'cache w':>9} {'cache r':>9}")
    print("-" * 92)
    rows = sorted(totals.items(), key=lambda kv: kv[0] if args.by == "day" else -kv[1]["cost"])
    for key, t in rows[: args.top if args.by != "day" else None]:
        print(
            f"{key:38} {t['cost']:8.2f} {t['msgs']:6d} {fmt_tokens(t['in']):>8} {fmt_tokens(t['out']):>8} "
            f"{fmt_tokens(t['cw']):>9} {fmt_tokens(t['cr']):>9}"
        )
    print("-" * 92)
    print(f"{'TOTAL':38} {grand:8.2f}")

    print("\nBy model:")
    for model, c in sorted(by_model.items(), key=lambda kv: -kv[1]):
        share = 100 * c / grand if grand else 0
        print(f"  {model:36} {c:8.2f}  ({share:4.1f}%)")
    if unknown_models:
        print(f"\n! Not in PRICING (counted as $0): {sorted(unknown_models)}")

    cw = sum(t["cw"] for t in totals.values())
    cr = sum(t["cr"] for t in totals.values())
    if cw + cr:
        print(
            f"\nCache: {fmt_tokens(cr)} read vs {fmt_tokens(cw)} written - "
            f"{100 * cr / (cw + cr):.0f}% of cached tokens were reads (the cheap kind). "
            "A low % means sessions idle past the cache TTL and re-pay for context."
        )
    print(
        "\nCompare: /usage inside Claude Code (this session), platform.claude.com/usage (authoritative bill)."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
