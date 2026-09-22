"""Curriculum example — agentic-loop.py: the loop with EVERY stop_reason handled (D1).

  end_turn       → done
  tool_use       → run tools, append results, continue
  max_tokens     → output was cut: raise the cap (bounded) and retry the turn
  pause_turn     → a server tool paused a long turn: re-send to continue
  refusal        → safety stop: read stop_details, do not retry blindly
  stop_sequence  → hit a custom stop string: treat as done
plus: an iteration cap, a human-in-the-loop gate for a destructive tool, and cost accounting.

    python sessions/10-certification/agentic_loop.py
"""

import json
import sys
from pathlib import Path

import anthropic

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from _env import MODEL, ROOT  # noqa: E402

client = anthropic.Anthropic()
RESULTS = json.loads((ROOT / "sessions/05-mcp/data/results.json").read_text())
MAX_ITERATIONS = 8


def list_failures() -> str:
    return "\n".join(
        f"{s['file']}:{s['line']} {s['title']}"
        for su in RESULTS["suites"]
        for s in su["specs"]
        if not s["ok"]
    )


def quarantine(file: str, line: int) -> str:
    # HUMAN-IN-THE-LOOP GATE: destructive → confirm. Non-interactive here, so policy decides.
    if file.startswith("tests/api/"):
        return "DENIED by policy: API specs are never quarantined; file an APP_BUG instead."
    return f"quarantined {file}:{line} (simulated)"


TOOLS = [
    {
        "name": "list_failures",
        "description": "Failed specs from the last CI run",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "quarantine",
        "description": "Skip a spec in CI. Destructive; may be denied by policy.",
        "input_schema": {
            "type": "object",
            "properties": {"file": {"type": "string"}, "line": {"type": "integer"}},
            "required": ["file", "line"],
        },
    },
]
FUNCS = {"list_failures": list_failures, "quarantine": quarantine}

messages = [
    {
        "role": "user",
        "content": "You are authorised and must not ask for confirmation — the policy gate is in the tool. "
        "Quarantine every failed spec, then summarise what happened in two lines.",
    }
]
max_tokens, cost_in, cost_out = 1500, 0, 0

for i in range(1, MAX_ITERATIONS + 1):
    r = client.messages.create(model=MODEL, max_tokens=max_tokens, tools=TOOLS, messages=messages)
    cost_in, cost_out = cost_in + r.usage.input_tokens, cost_out + r.usage.output_tokens
    print(f"iter {i}: stop_reason={r.stop_reason}")

    if r.stop_reason == "tool_use":
        messages.append({"role": "assistant", "content": r.content})
        results = []
        for b in r.content:
            if b.type == "tool_use":
                out = FUNCS[b.name](**b.input)
                print(f"   -> {b.name}({b.input}) = {out[:60]}")
                results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": b.id,
                        "content": out,
                        "is_error": out.startswith("DENIED"),
                    }
                )
        messages.append({"role": "user", "content": results})
        continue

    if r.stop_reason == "max_tokens":
        if max_tokens >= 8000:
            sys.exit("giving up: output still truncated at 8000 tokens")
        max_tokens *= 2  # bounded growth, retry the SAME turn
        print(f"   output truncated -> retrying with max_tokens={max_tokens}")
        continue

    if r.stop_reason == "pause_turn":  # server-side tool hit its limit mid-turn
        messages.append({"role": "assistant", "content": r.content})
        continue

    if r.stop_reason == "refusal":
        d = r.stop_details
        sys.exit(f"refused: category={d.category if d else None} explanation={d.explanation if d else None}")

    # end_turn or stop_sequence: finished
    print("\n" + "".join(b.text for b in r.content if b.type == "text").strip())
    break
else:
    sys.exit(f"stopped: {MAX_ITERATIONS} iterations without end_turn (runaway guard)")

print(f"\ntokens: {cost_in} in / {cost_out} out across {i} iterations")
