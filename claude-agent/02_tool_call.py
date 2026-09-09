"""Step 2 — one tool call. Claude requests, Python executes, Claude sees the result.

    python 02_tool_call.py
"""

import subprocess
import sys
from pathlib import Path

import anthropic

MODEL = "claude-sonnet-5"
DEMO = Path(__file__).parent / "demo"


# --- Plain Python functions. Nothing AI-specific about them. ---


def read_file(path):
    target = (DEMO / path).resolve()
    if DEMO.resolve() not in target.parents:
        return f"Refused: {path} is outside the demo directory."
    return target.read_text(encoding="utf-8")


def run_test():
    result = subprocess.run(
        [sys.executable, "login_test.py"],
        cwd=DEMO,
        capture_output=True,
        text=True,
        timeout=60,
    )
    return f"exit code {result.returncode}\n{result.stdout}{result.stderr}"


# --- Describing those functions to Claude. ---

tools = [
    {
        "name": "read_file",
        "description": "Read a text file from the demo project, e.g. 'app.py'.",
        "input_schema": {
            "type": "object",
            "properties": {"path": {"type": "string"}},
            "required": ["path"],
        },
    },
    {
        "name": "run_test",
        "description": "Run the login test and return its output.",
        "input_schema": {"type": "object", "properties": {}},
    },
]

client = anthropic.Anthropic()

messages = [
    {
        "role": "user",
        "content": "Investigate the login test failure. Use the available tools.",
    }
]

response = client.messages.create(
    model=MODEL, max_tokens=1000, tools=tools, messages=messages
)

print("stop_reason:", response.stop_reason)

if response.stop_reason == "tool_use":
    tool_results = []

    for block in response.content:
        if block.type != "tool_use":
            continue

        print(f"Claude wants: {block.name}({block.input})")

        if block.name == "read_file":
            result = read_file(block.input["path"])
        elif block.name == "run_test":
            result = run_test()
        else:
            result = f"Unknown tool: {block.name}"

        tool_results.append(
            {"type": "tool_result", "tool_use_id": block.id, "content": result}
        )

    # Assistant turn, then the results — this pair is the required shape.
    messages.append({"role": "assistant", "content": response.content})
    messages.append({"role": "user", "content": tool_results})

    response = client.messages.create(
        model=MODEL, max_tokens=1000, tools=tools, messages=messages
    )

for block in response.content:
    if block.type == "text":
        print(block.text)

# Claude often still wants more tools here. We only did one round trip,
# so the program stops mid-investigation. That is what 03 fixes.
print("\nstop_reason:", response.stop_reason)
