"""Context window management and long-session strategies (D5), measured.

1. count tokens BEFORE sending (messages.count_tokens) — know where you are
2. clear stale tool results (context editing) — keep the reasoning, drop the bulk
3. server-side compaction (beta) — the API summarises history for you; keep the compaction block
4. summarise-and-restart in your own code — the portable fallback
5. human-in-the-loop gate on a threshold — stop and ask before the window is gone

  python sessions/10-certification/context_management.py
"""

import sys
from pathlib import Path

import anthropic

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from _env import CHEAP, MODEL, ROOT  # noqa: E402

client = anthropic.Anthropic()
BIG = (ROOT / "README.md").read_text(encoding="utf-8")  # stands in for a large tool result


def count(messages, **kw) -> int:
    return client.messages.count_tokens(model=CHEAP, messages=messages, **kw).input_tokens


# a conversation that accumulated three big tool results
tool = {
    "name": "read_file",
    "description": "read a file",
    "input_schema": {"type": "object", "properties": {"path": {"type": "string"}}},
}
messages = [{"role": "user", "content": "Summarise the repo docs."}]
for i in range(3):
    messages.append(
        {
            "role": "assistant",
            "content": [
                {"type": "tool_use", "id": f"t{i}", "name": "read_file", "input": {"path": f"doc{i}.md"}}
            ],
        }
    )
    messages.append(
        {"role": "user", "content": [{"type": "tool_result", "tool_use_id": f"t{i}", "content": BIG}]}
    )
messages.append({"role": "assistant", "content": "I have read all three documents."})
messages.append({"role": "user", "content": "Now list the npm scripts in one line."})

print(f"1. tokens before sending: {count(messages, tools=[tool]):,}")

# 2. context editing: clear old tool results server-side (keeps tool_use, replaces results with a placeholder)
r = client.beta.messages.create(
    model=CHEAP,
    max_tokens=300,
    betas=["context-management-2025-06-27"],
    context_management={
        "edits": [
            {
                "type": "clear_tool_uses_20250919",
                "keep": {"type": "tool_uses", "value": 1},
                "trigger": {"type": "input_tokens", "value": 1000},
            }
        ]
    },  # default trigger is 100K
    tools=[tool],
    messages=messages,
)
cleared = r.context_management.applied_edits if r.context_management else []
print(f"2. context editing: input_tokens={r.usage.input_tokens:,}  applied_edits={[e.type for e in cleared]}")

# 3. compaction: the API summarises when history is large; you MUST append the returned content (incl. compaction block)
r = client.beta.messages.create(
    model=MODEL,
    max_tokens=300,
    betas=["compact-2026-01-12"],  # compaction: Opus/Sonnet-class models only
    context_management={
        "edits": [{"type": "compact_20260112", "trigger": {"type": "input_tokens", "value": 50_000}}]
    },  # API minimum
    tools=[tool],
    messages=messages,
)
kinds = [b.type for b in r.content]
print(
    f"3. compaction: input_tokens={r.usage.input_tokens:,}  response blocks={kinds}  "
    f"({'compacted' if 'compaction' in kinds else 'not triggered: under the 50K minimum'}; always append r.content back, not just text)"
)

# 4. summarise-and-restart: portable, model-agnostic
state = "\n".join(str(m["content"])[:300] for m in messages)
summary = (
    client.messages.create(
        model=CHEAP,
        max_tokens=300,
        messages=[
            {
                "role": "user",
                "content": f"Summarise this conversation's state in 3 bullets for a fresh session:\n{state}",
            }
        ],
    )
    .content[0]
    .text
)
fresh = [
    {
        "role": "user",
        "content": f"<previous_session_summary>\n{summary}\n</previous_session_summary>\n\nList the npm scripts in one line.",
    }
]
print(f"4. summarise-and-restart: {count(messages):,} -> {count(fresh):,} tokens")

# 5. HITL gate on a threshold
LIMIT, GATE = 200_000, 0.8
used = count(messages, tools=[tool])
if used / LIMIT > GATE:
    print("5. gate: >80% of the window used — pause and ask the user before continuing")
else:
    print(
        f"5. gate: {used / LIMIT:.1%} of a {LIMIT:,}-token window used — under the {GATE:.0%} threshold, continue"
    )
