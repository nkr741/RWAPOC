"""Agent SDK 6 — secure deployment: least privilege, budgets, rate limiting, observability.

Everything a production agent service needs around query():
  * least privilege   — read-only tool list, dontAsk, strict MCP config, no project settings, cwd pinned
  * sandbox           — SandboxSettings: OS-level isolation for Bash when the platform supports it
  * hard limits       — max_turns, max_budget_usd, per-request timeout
  * rate limiting     — an asyncio.Semaphore caps concurrent agent runs; RateLimitEvent is observed
  * observability     — structured log of tools, cost, tokens per model, session id, errors

    python sessions/08-agent-sdk/sdk/06_secure_deployment.py
"""

import asyncio
import json
import sys
import time
from pathlib import Path

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    RateLimitEvent,
    ResultMessage,
    ToolUseBlock,
    query,
)

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from _env import ROOT  # noqa: E402

MAX_CONCURRENT = 2
gate = asyncio.Semaphore(MAX_CONCURRENT)  # ponytail: process-local; use a shared limiter across replicas

HARDENED = ClaudeAgentOptions(
    cwd=ROOT,
    model="claude-haiku-4-5",
    permission_mode="dontAsk",  # never block on a prompt; unlisted tools are denied
    allowed_tools=["Read", "Grep", "Glob"],  # read-only surface — no Bash, no Edit, no Write
    disallowed_tools=["WebFetch", "WebSearch"],  # belt and braces
    strict_mcp_config=True,  # no servers from .mcp.json
    setting_sources=[],  # ignore user/project settings and hooks entirely
    max_turns=6,
    max_budget_usd=0.05,  # hard stop
    sandbox={
        "enabled": True,
        "autoAllowBashIfSandboxed": False,
    },  # OS sandbox where available (no-op on Windows)
    env={"CI": "1"},  # scrub: only what the agent needs; secrets stay in this process
    system_prompt="You are a read-only assistant. Answer briefly with file:line references.",
)


async def run_one(job_id: int, prompt: str) -> dict:
    log = {"job": job_id, "tools": [], "started": time.time()}
    async with gate:  # rate limit
        try:
            async for m in query(prompt=prompt, options=HARDENED):
                if isinstance(m, AssistantMessage):
                    log["tools"] += [b.name for b in m.content if isinstance(b, ToolUseBlock)]
                elif isinstance(m, RateLimitEvent):
                    log["rate_limit"] = m.rate_limit_info  # back off / alert here
                elif isinstance(m, ResultMessage):
                    log.update(
                        session=m.session_id,
                        subtype=m.subtype,
                        turns=m.num_turns,
                        cost_usd=round(m.total_cost_usd or 0, 4),
                        denials=len(m.permission_denials),
                        models={k: v["outputTokens"] for k, v in (m.model_usage or {}).items()},
                        answer=(m.result or "")[:120].replace("\n", " "),
                    )
        except Exception as e:  # never let one job take the service down
            log["error"] = f"{type(e).__name__}: {e}"
    log["seconds"] = round(time.time() - log.pop("started"), 1)
    return log


async def main() -> None:
    jobs = [
        "Which file defines the ApiError class?",
        "Delete the file tests/e2e/auth.spec.ts.",  # must be denied
        "How many page objects live under pages/?",
    ]
    results = await asyncio.gather(*(run_one(i, p) for i, p in enumerate(jobs, 1)))
    for r in results:
        print(json.dumps(r))  # one JSON line per job = what you ship to your log pipeline
    assert (
        results[1]["denials"] >= 1
        or "cannot" in results[1]["answer"].lower()
        or "read-only" in results[1]["answer"].lower()
    )
    print(
        "\nOK — the destructive job could not act; every job has cost, tools, session id, and models logged"
    )


asyncio.run(main())
