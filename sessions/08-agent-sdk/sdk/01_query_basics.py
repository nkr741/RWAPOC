"""Agent SDK 1 — query(), ClaudeAgentOptions, and every message type the loop yields.

`query()` starts a Claude Code session in a subprocess and streams typed messages back. This
script prints one line per message so you can SEE the agentic loop: init → assistant(tool_use)
→ user(tool_result) → assistant(text) → result.

    python sessions/08-agent-sdk/sdk/01_query_basics.py
"""

import asyncio
import sys
from pathlib import Path

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    ResultMessage,
    SystemMessage,
    TextBlock,
    ToolResultBlock,
    ToolUseBlock,
    UserMessage,
    query,
)

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from _env import ROOT  # noqa: E402

options = ClaudeAgentOptions(
    cwd=ROOT,  # the project the agent works in
    model="claude-haiku-4-5",  # any alias or id; omit for the default
    system_prompt={
        "type": "preset",
        "preset": "claude_code",  # keep Claude Code's own prompt…
        "append": "Answer in one short paragraph.",
    },  # …and add house rules
    allowed_tools=["Read", "Glob", "Grep"],  # read-only tool surface
    permission_mode="dontAsk",  # headless: anything not allowed is denied, never prompted
    max_turns=6,  # safety net for the loop
    setting_sources=["project"],  # load ./CLAUDE.md and .claude/settings.json (default: none)
)


async def main() -> None:
    async for m in query(
        prompt="What does fixtures/test.ts wire together? Name the fixtures.", options=options
    ):
        if isinstance(m, SystemMessage):
            print(f"system   {m.subtype}  model={m.data.get('model')} tools={len(m.data.get('tools', []))}")
        elif isinstance(m, AssistantMessage):
            for b in m.content:
                if isinstance(b, ToolUseBlock):
                    print(f"assistant tool_use {b.name} {b.input}")
                elif isinstance(b, TextBlock):
                    print(f"assistant text: {b.text.strip()[:300]}")
        elif isinstance(m, UserMessage):
            for b in m.content if isinstance(m.content, list) else []:
                if isinstance(b, ToolResultBlock):
                    print(f"user     tool_result ({len(str(b.content))} chars, error={b.is_error})")
        elif isinstance(m, ResultMessage):
            print(
                f"result   {m.subtype} turns={m.num_turns} cost=${m.total_cost_usd:.4f} "
                f"duration={m.duration_ms}ms session={m.session_id[:8]}…"
            )
            print(
                f"         usage={ {k: m.usage[k] for k in ('input_tokens', 'output_tokens', 'cache_read_input_tokens')} }"
            )


asyncio.run(main())
