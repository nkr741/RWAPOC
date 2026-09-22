"""Session 6 — subagents: delegate reading to cheap, isolated workers; keep the coordinator's
context small. Two agents are defined in code (the same shape as .claude/agents/*.md), the
coordinator (Sonnet) fans work out to them (Haiku) and merges the answers.

    python sessions/06-hooks-skills-agents/02_subagents_demo.py
"""

import asyncio
import sys
from pathlib import Path

from claude_agent_sdk import (
    AgentDefinition,
    AssistantMessage,
    ClaudeAgentOptions,
    ResultMessage,
    TextBlock,
    ToolUseBlock,
    query,
)

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from _env import ROOT  # noqa: E402

options = ClaudeAgentOptions(
    cwd=ROOT,
    model="claude-sonnet-4-6",
    permission_mode="dontAsk",
    allowed_tools=["Agent", "Task", "Read", "Grep", "Glob"],  # Agent = the delegation tool (older CLIs: Task)
    max_turns=12,
    agents={
        "spec-reader": AgentDefinition(
            description="Reads Playwright spec files and reports what each test covers. Use for any question about test coverage.",
            prompt="Read the spec files you are given. Reply with one line per test: `file:line — title — what it asserts`. No file contents.",
            tools=["Read", "Grep", "Glob"],
            model="haiku",
        ),
        "page-reader": AgentDefinition(
            description="Reads page objects under pages/ and lists their locators. Use for any question about locators or page objects.",
            prompt="Read the page object you are given. Reply with a table of locator name -> selector strategy (role/label/data-test/css). No file contents.",
            tools=["Read", "Grep", "Glob"],
            model="haiku",
        ),
    },
    system_prompt=(
        "You coordinate. Delegate ALL file reading to the spec-reader and page-reader subagents "
        "(run them in parallel), then answer from their summaries only."
    ),
)

PROMPT = (
    "Which locators does pages/bankaccount.page.ts use, and which tests in tests/e2e/bank-accounts.spec.ts "
    "exercise them? Answer with a 5-line summary."
)


async def main() -> None:
    async for m in query(prompt=PROMPT, options=options):
        if isinstance(m, AssistantMessage):
            who = "subagent" if m.parent_tool_use_id else "coordinator"
            for b in m.content:
                if isinstance(b, ToolUseBlock):
                    detail = (
                        (b.input.get("subagent_type") or b.input.get("description", ""))
                        if b.name in ("Agent", "Task")
                        else b.input.get("file_path", "")
                    )
                    print(f"  [{who:<11}] tool {b.name} {detail}")
                elif isinstance(b, TextBlock) and b.text.strip() and who == "coordinator":
                    print(f"\n{b.text.strip()}\n")
        elif isinstance(m, ResultMessage):
            print(f"turns={m.num_turns} cost=${m.total_cost_usd:.4f}")
            for model, u in (m.model_usage or {}).items():
                print(
                    f"  {model:<28} in={u['inputTokens']:>6} out={u['outputTokens']:>5} ${u['costUSD']:.4f}"
                )


asyncio.run(main())
