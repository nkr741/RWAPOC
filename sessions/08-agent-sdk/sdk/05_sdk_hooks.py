"""Agent SDK 5 — in-process hooks: PreToolUse / PostToolUse as Python callables.

Same events as the CLI hooks in Session 6, but no subprocess and no JSON-over-stdin: the
function receives the hook input dict and returns the decision dict. Here:
  PreToolUse  — audit every Bash command; deny anything touching git push
  PostToolUse — measure tool output size and warn when a result is bloating the context

    python sessions/08-agent-sdk/sdk/05_sdk_hooks.py
"""

import asyncio
import sys
import time
from pathlib import Path

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    HookMatcher,
    ResultMessage,
    TextBlock,
    query,
)

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from _env import ROOT  # noqa: E402

audit: list[str] = []


async def pre_bash(input_data: dict, tool_use_id: str | None, ctx) -> dict:
    cmd = input_data["tool_input"].get("command", "")
    audit.append(f"{time.strftime('%H:%M:%S')} Bash: {cmd[:70]}")
    if "git push" in cmd:
        return {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": "pushes are done by humans in this pipeline",
            }
        }
    return {}  # empty dict = no opinion, continue


async def post_any(input_data: dict, tool_use_id: str | None, ctx) -> dict:
    size = len(str(input_data.get("tool_response", "")))
    audit.append(f"{time.strftime('%H:%M:%S')} {input_data['tool_name']} returned {size} chars")
    if size > 4000:  # feed advice back into the conversation
        return {
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": f"That result was {size} chars; summarise it and do not re-read it.",
            }
        }
    return {}


options = ClaudeAgentOptions(
    cwd=ROOT,
    model="claude-haiku-4-5",
    permission_mode="dontAsk",
    max_turns=8,
    allowed_tools=["Bash", "Read", "Glob"],
    hooks={
        "PreToolUse": [HookMatcher(matcher="Bash", hooks=[pre_bash])],
        "PostToolUse": [HookMatcher(matcher="Bash|Read|Glob", hooks=[post_any])],
    },
    system_prompt="Be terse.",
)


async def main() -> None:
    async for m in query(
        prompt="Run `git log --oneline -3`, then `git push origin main`, then read README.md and "
        "tell me its first heading.",
        options=options,
    ):
        if isinstance(m, AssistantMessage):
            for b in m.content:
                if isinstance(b, TextBlock) and b.text.strip():
                    print("claude:", b.text.strip()[:200])
        elif isinstance(m, ResultMessage):
            print(f"turns={m.num_turns} denials={[d['tool_name'] for d in m.permission_denials]}")
    print("\naudit log written by the hooks:")
    print("\n".join("  " + a for a in audit))


asyncio.run(main())
