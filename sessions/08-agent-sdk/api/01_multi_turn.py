"""API 1 — making a request, and multi-turn conversations.

The Messages API is stateless: every call sends the WHOLE history. "Memory" is just the list
you keep appending to. Response content is a list of typed blocks — check .type before .text.

    python sessions/08-agent-sdk/api/01_multi_turn.py
"""

import sys
from pathlib import Path

import anthropic

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from _env import MODEL  # noqa: E402

client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN / ant profile)
SYSTEM = "You are a terse Playwright expert. Answer in one sentence unless asked for more."
history: list[dict] = []


def chat(user_text: str) -> str:
    history.append({"role": "user", "content": user_text})
    msg = client.messages.create(model=MODEL, max_tokens=1024, system=SYSTEM, messages=history)
    answer = "".join(b.text for b in msg.content if b.type == "text")
    history.append({"role": "assistant", "content": answer})  # append text (or msg.content for full blocks)
    print(f"[{msg.stop_reason}, {msg.usage.input_tokens} in / {msg.usage.output_tokens} out] {answer}\n")
    return answer


chat("My test id attribute is `data-test`, not `data-testid`. Which Playwright config key sets that?")
chat("Show me the one-line config for it.")  # relies on turn 1 — works only because history is resent
chat("What attribute did I say I use?")  # proves memory lives in the list, not the server

assert "data-test" in history[-1]["content"], "the model should recall the attribute from turn 1"
print(
    f"history holds {len(history)} messages; input tokens grow every turn — that is the cost of statelessness"
)
