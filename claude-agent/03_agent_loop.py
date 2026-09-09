"""Step 3 — the loop. Claude keeps going until it no longer needs a tool.

    python 03_agent_loop.py
"""

import subprocess
import sys
import textwrap
from pathlib import Path

import anthropic

MODEL = "claude-sonnet-5"
MAX_ITERATIONS = 8
DEMO = Path(__file__).parent / "demo"

TASK = """
The login test is failing. The project contains app.py, auth.py and login_test.py.

You can:
- read files
- write files
- run the test

Do not guess. Use the tools to find the actual root cause, fix it,
and re-run the test until it passes. Then explain what was wrong.
"""


def _resolve(path):
    """Keep the agent inside demo/. Returns None if it tries to escape."""
    target = (DEMO / path).resolve()
    return target if DEMO.resolve() in target.parents else None


def read_file(path):
    target = _resolve(path)
    if target is None:
        return f"Refused: {path} is outside the demo directory."
    return target.read_text(encoding="utf-8")


def write_file(path, content):
    target = _resolve(path)
    if target is None:
        return f"Refused: {path} is outside the demo directory."
    target.write_text(content, encoding="utf-8")
    return f"Wrote {len(content)} characters to {path}."


def run_test():
    result = subprocess.run(
        [sys.executable, "login_test.py"],
        cwd=DEMO,
        capture_output=True,
        text=True,
        timeout=60,
    )
    return f"exit code {result.returncode}\n{result.stdout}{result.stderr}"


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
        "name": "write_file",
        "description": "Overwrite a file in the demo project with new content.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "content": {"type": "string"},
            },
            "required": ["path", "content"],
        },
    },
    {
        "name": "run_test",
        "description": "Run the login test and return its output.",
        "input_schema": {"type": "object", "properties": {}},
    },
]

TOOL_FUNCS = {
    "read_file": lambda args: read_file(args["path"]),
    "write_file": lambda args: write_file(args["path"], args["content"]),
    "run_test": lambda args: run_test(),
}


def execute_tools(response):
    """Claude asked for tools. We run them and package the results."""
    results = []
    for block in response.content:
        if block.type != "tool_use":
            continue
        args = textwrap.shorten(str(block.input), 100, placeholder=" ...")
        print(f"  -> {block.name}({args})")
        func = TOOL_FUNCS.get(block.name)
        output = func(block.input) if func else f"Unknown tool: {block.name}"
        results.append(
            {"type": "tool_result", "tool_use_id": block.id, "content": output}
        )
    return results


def final_text(response):
    return "\n".join(b.text for b in response.content if b.type == "text")


def main():
    client = anthropic.Anthropic()
    messages = [{"role": "user", "content": TASK}]

    for attempt in range(MAX_ITERATIONS):
        print(f"\n--- iteration {attempt + 1} ---")

        response = client.messages.create(
            model=MODEL, max_tokens=2000, tools=tools, messages=messages
        )

        # No tool requested = Claude is done. This is the exit condition.
        if response.stop_reason != "tool_use":
            print(final_text(response))
            return

        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": execute_tools(response)})

    print(f"Stopped: hit the {MAX_ITERATIONS}-iteration limit.")


if __name__ == "__main__":
    main()
