"""API 4 — tool use, end to end: tool functions, schemas, message blocks, sending results,
multiple turns, multiple tools, fine-grained control, and the SDK tool runner.

Part A is the MANUAL loop (you own every step — this is what the Agent SDK and Claude Code do
inside). Part B is the same task with client.beta.messages.tool_runner() and @beta_tool.

    python sessions/08-agent-sdk/api/04_tool_use.py
"""

import json
import sys
from pathlib import Path

import anthropic
from anthropic import beta_tool

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from _env import MODEL, ROOT  # noqa: E402

client = anthropic.Anthropic()
RESULTS = json.loads((ROOT / "sessions/05-mcp/data/results.json").read_text())


# ── tool FUNCTIONS: plain Python; they return strings the model will read ────────────────
def list_failed_specs() -> str:
    rows = [
        f"{s['file']}:{s['line']} {s['title']}"
        for suite in RESULTS["suites"]
        for s in suite["specs"]
        if not s["ok"]
    ]
    return "\n".join(rows)


def read_spec_lines(file: str, line: int, context: int = 3) -> str:
    path = ROOT / file
    if not path.exists():
        return f"ERROR: {file} does not exist"  # errors are strings too; see is_error below
    lines = path.read_text().splitlines()
    lo, hi = max(0, line - 1 - context), min(len(lines), line + context)
    return "\n".join(f"{i + 1}: {lines[i]}" for i in range(lo, hi))


TOOL_FUNCS = {"list_failed_specs": list_failed_specs, "read_spec_lines": read_spec_lines}

# ── tool SCHEMAS: what the model sees. The description is the prompt for the tool. ───────
TOOLS = [
    {
        "name": "list_failed_specs",
        "description": "List failed Playwright specs from the latest CI run as file:line title.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "read_spec_lines",
        "description": "Read a few lines of a spec file around a line number.",
        "input_schema": {
            "type": "object",
            "properties": {
                "file": {"type": "string", "description": "repo-relative path"},
                "line": {"type": "integer"},
                "context": {"type": "integer", "description": "lines before/after, default 3"},
            },
            "required": ["file", "line"],
        },
    },
]

TASK = "Which failed specs are there, and what assertion does each one make at the failing line? Two lines per spec."


def manual_loop() -> None:
    print("== A. manual agentic loop ==")
    messages = [{"role": "user", "content": TASK}]
    for turn in range(1, 10):
        r = client.messages.create(model=MODEL, max_tokens=4000, tools=TOOLS, messages=messages)
        print(f"  turn {turn}: stop_reason={r.stop_reason} blocks={[b.type for b in r.content]}")
        if r.stop_reason != "tool_use":  # end_turn, max_tokens, refusal → stop
            break
        messages.append({"role": "assistant", "content": r.content})  # keep the tool_use blocks verbatim
        results = []
        for b in r.content:  # MULTIPLE tools may be requested in one turn
            if b.type == "tool_use":
                print(f"          -> {b.name}({json.dumps(b.input)})")
                out = TOOL_FUNCS[b.name](**b.input)
                results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": b.id,
                        "content": out,
                        "is_error": out.startswith("ERROR"),
                    }
                )
        messages.append({"role": "user", "content": results})  # ALL results in ONE user message
    print("  answer:", "".join(b.text for b in r.content if b.type == "text").strip()[:400])


def fine_grained() -> None:
    print("\n== fine-grained control ==")
    for label, extra in [
        ("tool_choice=auto (default)", {"tool_choice": {"type": "auto"}}),
        ("tool_choice=any (must call something)", {"tool_choice": {"type": "any"}}),
        ("tool_choice=tool (call this one)", {"tool_choice": {"type": "tool", "name": "list_failed_specs"}}),
        ("tool_choice=none (never call)", {"tool_choice": {"type": "none"}}),
        (
            "disable_parallel_tool_use (one call per turn)",
            {"tool_choice": {"type": "auto", "disable_parallel_tool_use": True}},
        ),
    ]:
        r = client.messages.create(
            model=MODEL,
            max_tokens=1000,
            tools=TOOLS,
            messages=[{"role": "user", "content": "hi — what failed?"}],
            **extra,
        )
        print(
            f"  {label:<48} -> {[b.type + (':' + b.name if b.type == 'tool_use' else '') for b in r.content]}"
        )


def tool_runner() -> None:
    print("\n== B. SDK tool runner: same task, no loop code ==")

    @beta_tool
    def list_failed(dummy: str = "") -> str:
        """List failed Playwright specs from the latest CI run as file:line title.

        Args:
            dummy: ignored.
        """
        return list_failed_specs()

    @beta_tool
    def read_lines(file: str, line: int, context: int = 3) -> str:
        """Read a few lines of a spec file around a line number.

        Args:
            file: repo-relative path.
            line: 1-based line number.
            context: lines before/after.
        """
        return read_spec_lines(file, line, context)

    runner = client.beta.messages.tool_runner(
        model=MODEL,
        max_tokens=4000,
        tools=[list_failed, read_lines],
        messages=[{"role": "user", "content": TASK}],
    )
    last = None
    for message in runner:  # each iteration = one model turn
        last = message
        print(
            f"  turn: stop_reason={message.stop_reason} tools={[b.name for b in message.content if b.type == 'tool_use']}"
        )
    print("  answer:", "".join(b.text for b in last.content if b.type == "text").strip()[:400])


manual_loop()
fine_grained()
tool_runner()
