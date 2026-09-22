"""Agent SDK 4 — custom tools with input schemas and handlers, plus a can_use_tool gate.

  @tool(name, description, input_schema)  → an in-process MCP tool (no subprocess).
  create_sdk_mcp_server(name, tools=[…])  → registers them under mcp__<name>__<tool>.
  can_use_tool                            → your code approves / rewrites / denies EVERY tool
                                            call — programmatic human-in-the-loop.

Domain: the same RWA test-results data as Session 5, plus one "dangerous" tool to gate.

    python sessions/08-agent-sdk/sdk/04_custom_tools.py
"""

import asyncio
import json
import sys
from pathlib import Path
from typing import Annotated, TypedDict

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    PermissionResultAllow,
    PermissionResultDeny,
    ResultMessage,
    TextBlock,
    ToolUseBlock,
    create_sdk_mcp_server,
    query,
    tool,
)

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from _env import ROOT  # noqa: E402

RESULTS = json.loads((ROOT / "sessions/05-mcp/data/results.json").read_text())


class FailuresIn(TypedDict):  # TypedDict ⇒ JSON schema; Annotated ⇒ per-field description
    include_flaky: Annotated[bool, "also return specs that passed on retry"]


@tool("list_failures", "Failed Playwright specs from the latest run", FailuresIn)
async def list_failures(args: FailuresIn) -> dict:
    rows = []
    for suite in RESULTS["suites"]:
        for spec in suite["specs"]:
            failed = any(r["status"] != "passed" for t in spec["tests"] for r in t["results"])
            if failed and (args["include_flaky"] or not spec["ok"]):
                rows.append(
                    f"{spec['file']}:{spec['line']} {'flaky' if spec['ok'] else 'failed'} — {spec['title']}"
                )
    return {"content": [{"type": "text", "text": "\n".join(rows) or "no failures"}]}


@tool(
    "quarantine_test", "Mark a spec as quarantined (skips it in CI). Destructive.", {"file": str, "line": int}
)
async def quarantine_test(args: dict) -> dict:
    if not (ROOT / args["file"]).exists():  # validate inside the handler too
        return {"content": [{"type": "text", "text": f"no such file: {args['file']}"}], "is_error": True}
    return {"content": [{"type": "text", "text": f"(pretend) quarantined {args['file']}:{args['line']}"}]}


async def gate(tool_name: str, tool_input: dict, ctx) -> PermissionResultAllow | PermissionResultDeny:
    """Runs for every tool call NOT already in allowed_tools (those bypass it). Policy lives here."""
    if tool_name == "mcp__ci__quarantine_test":
        if tool_input["file"].startswith("tests/api/"):
            return PermissionResultDeny(message="API specs are never quarantined — file an APP_BUG instead.")
        return PermissionResultAllow(
            updated_input={**tool_input, "line": int(tool_input["line"])}
        )  # may rewrite input
    return PermissionResultDeny(message=f"{tool_name} is not permitted in this agent.")


options = ClaudeAgentOptions(
    model="claude-haiku-4-5",
    cwd=ROOT,
    max_turns=8,
    mcp_servers={"ci": create_sdk_mcp_server("ci", tools=[list_failures, quarantine_test])},
    allowed_tools=[
        "mcp__ci__list_failures"
    ],  # pre-approved; quarantine_test deliberately NOT here so `gate` sees it
    can_use_tool=gate,
    strict_mcp_config=True,  # ignore .mcp.json — only the servers declared above exist
    system_prompt="Be terse. Quarantine every FAILED (not flaky) spec, then report what happened.",
)


async def main() -> None:
    async for m in query(prompt="List failures, quarantine the failed ones, report.", options=options):
        if isinstance(m, AssistantMessage):
            for b in m.content:
                if isinstance(b, ToolUseBlock):
                    print(f"  -> {b.name} {b.input}")
                elif isinstance(b, TextBlock) and b.text.strip():
                    print(b.text.strip())
        elif isinstance(m, ResultMessage):
            print(f"\nturns={m.num_turns} denials={[d['tool_name'] for d in m.permission_denials]}")


asyncio.run(main())
