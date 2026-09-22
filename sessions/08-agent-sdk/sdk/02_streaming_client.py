"""Agent SDK 2 — streaming events and the multi-turn ClaudeSDKClient.

* query() + include_partial_messages=True  → StreamEvent objects carrying raw API stream
  events (message_start, content_block_delta …) so text appears token by token.
* ClaudeSDKClient keeps ONE session open: send several prompts, interrupt, change model or
  permission mode mid-conversation, read context usage.

  python sessions/08-agent-sdk/sdk/02_streaming_client.py
"""

import asyncio
import sys
from pathlib import Path

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    ClaudeSDKClient,
    ResultMessage,
    StreamEvent,
    TextBlock,
    query,
)

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from _env import ROOT  # noqa: E402

base = dict(
    cwd=ROOT,
    model="claude-haiku-4-5",
    allowed_tools=["Read", "Grep", "Glob"],
    permission_mode="dontAsk",
    max_turns=4,
)


async def streaming() -> None:
    print("== 1. token-level streaming with query() ==")
    opts = ClaudeAgentOptions(**base, include_partial_messages=True)
    async for m in query(prompt="In two sentences, what is a Playwright fixture?", options=opts):
        if isinstance(m, StreamEvent):
            ev = m.event
            if ev.get("type") == "content_block_delta" and ev["delta"].get("type") == "text_delta":
                print(ev["delta"]["text"], end="", flush=True)
        elif isinstance(m, ResultMessage):
            print(f"\n   [result] stop_reason={m.stop_reason} cost=${m.total_cost_usd:.4f}")


async def multi_turn() -> None:
    print("\n== 2. multi-turn ClaudeSDKClient ==")
    async with ClaudeSDKClient(options=ClaudeAgentOptions(**base)) as client:
        await client.query("Read package.json and tell me the test runner in five words.")
        async for m in client.receive_response():  # yields until the ResultMessage
            if isinstance(m, AssistantMessage) and any(isinstance(b, TextBlock) for b in m.content):
                print("   turn 1:", *(b.text.strip() for b in m.content if isinstance(b, TextBlock)))

        await client.set_model("claude-sonnet-4-6")  # change model mid-session
        await client.query("Same answer, but as a haiku poem.")  # context carries over
        async for m in client.receive_response():
            if isinstance(m, AssistantMessage) and any(isinstance(b, TextBlock) for b in m.content):
                print(
                    "   turn 2:",
                    " / ".join(
                        b.text.strip().replace("\n", " / ") for b in m.content if isinstance(b, TextBlock)
                    ),
                )
            elif isinstance(m, ResultMessage):
                print(
                    f"   session {m.session_id[:8]}… turns so far={m.num_turns} cost=${m.total_cost_usd:.4f}"
                )

        usage = await client.get_context_usage()
        print(
            f"   context usage: {usage['totalTokens']}/{usage['maxTokens']} tokens "
            f"({usage['percentage']:.1f}%) auto-compact={usage['isAutoCompactEnabled']}"
        )


asyncio.run(streaming())
asyncio.run(multi_turn())
