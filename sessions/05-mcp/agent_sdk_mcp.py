"""Session 5 — MCP inside the Claude Agent SDK: two kinds of server, one agent.

  * "sdk"   — an IN-PROCESS server: Python functions registered with @tool, no subprocess.
              Fastest, shares your process memory, perfect for app-specific tools.
  * "stdio" — an EXTERNAL server: the SDK spawns `python server.py` and speaks MCP over pipes.
              Same config shape as .mcp.json / `claude mcp add`.

Tools are named mcp__<server>__<tool>; allowed_tools whitelists them so nothing else runs.

    python sessions/05-mcp/agent_sdk_mcp.py
"""

import asyncio
import sys
from pathlib import Path

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    ResultMessage,
    TextBlock,
    ToolUseBlock,
    create_sdk_mcp_server,
    query,
    tool,
)

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import _env  # noqa: E402,F401

HERE = Path(__file__).parent


@tool("owner_of", "Who owns a test file (from the CODEOWNERS-style table)", {"path": str})
async def owner_of(args: dict) -> dict:
    owners = {"tests/e2e": "web-qa", "tests/api": "platform-qa"}
    owner = next((v for k, v in owners.items() if args["path"].startswith(k)), "unassigned")
    return {"content": [{"type": "text", "text": owner}]}


options = ClaudeAgentOptions(
    model="claude-haiku-4-5",
    mcp_servers={
        "owners": create_sdk_mcp_server("owners", tools=[owner_of]),  # in-process
        "results": {"type": "stdio", "command": sys.executable, "args": [str(HERE / "server.py")]},
    },
    allowed_tools=["mcp__owners__owner_of", "mcp__results__failures", "mcp__results__summarize_run"],
    permission_mode="dontAsk",  # anything not in allowed_tools is denied, never prompted
    max_turns=8,
    system_prompt="Be terse. Use the tools; do not guess.",
)


async def main() -> None:
    async for m in query(
        prompt="List the failed specs (not flaky) and the owning team of each. One line per spec.",
        options=options,
    ):
        if isinstance(m, AssistantMessage):
            for b in m.content:
                if isinstance(b, ToolUseBlock):
                    print(f"  -> tool {b.name} {b.input}")
                elif isinstance(b, TextBlock) and b.text.strip():
                    print(b.text)
        elif isinstance(m, ResultMessage):
            print(f"\nturns={m.num_turns} cost=${m.total_cost_usd:.4f} denials={m.permission_denials}")


asyncio.run(main())
