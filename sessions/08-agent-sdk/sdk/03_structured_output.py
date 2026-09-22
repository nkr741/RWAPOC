"""Agent SDK 3 — structured JSON output with schema validation and a retry loop.

`output_format={"type": "json_schema", "schema": …}` makes the agent's FINAL answer a JSON
object that matches the schema; it arrives in ResultMessage.structured_output. We still
validate it ourselves (jsonschema) and retry with the validation error fed back — the pattern
the certification calls "structured output + retry loop + conflict detection".

    python sessions/08-agent-sdk/sdk/03_structured_output.py
"""

import asyncio
import json
import sys
from pathlib import Path

import jsonschema
from claude_agent_sdk import ClaudeAgentOptions, ResultMessage, query

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from _env import ROOT  # noqa: E402

SCHEMA = {
    "type": "object",
    "properties": {
        "test_files": {"type": "integer", "minimum": 1},
        "categories": {
            "type": "array",
            "items": {"type": "string", "enum": ["e2e", "api", "integration", "practice", "setup"]},
            "minItems": 1,
            "uniqueItems": True,
        },
        "smoke_tagged": {"type": "integer", "minimum": 0},
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
    },
    "required": ["test_files", "categories", "smoke_tagged", "confidence"],
    "additionalProperties": False,
}
PROMPT = (
    "Count the *.spec.ts files under tests/, list the category folders, and count tests tagged "
    "@smoke (grep for '@smoke'). Report as JSON per the schema."
)


async def ask(prompt: str) -> dict:
    opts = ClaudeAgentOptions(
        cwd=ROOT,
        model="claude-haiku-4-5",
        allowed_tools=["Glob", "Grep", "Bash(find *)"],
        permission_mode="dontAsk",
        max_turns=8,
        output_format={"type": "json_schema", "schema": SCHEMA},
    )
    result = None
    async for m in query(prompt=prompt, options=opts):  # let the generator finish; returning mid-loop
        if isinstance(m, ResultMessage):  # leaves the subprocess half-closed
            result = m
    if result is None or result.subtype != "success":
        raise RuntimeError(f"agent failed: {result and result.subtype} {result and result.errors}")
    return result.structured_output


async def main() -> None:
    prompt, last_error = PROMPT, None
    for attempt in range(1, 4):  # bounded retry loop
        data = await ask(prompt)
        try:
            jsonschema.validate(data, SCHEMA)
            # conflict detection: cross-check a claim against ground truth we can compute
            actual = len(list((ROOT / "tests").rglob("*.spec.ts")))
            if data["test_files"] != actual:
                raise ValueError(f"test_files={data['test_files']} but the filesystem has {actual}")
            print(f"attempt {attempt}: valid ->", json.dumps(data))
            break
        except (jsonschema.ValidationError, ValueError) as e:
            last_error = str(e).splitlines()[0]
            print(f"attempt {attempt}: rejected -> {last_error}")
            prompt = f"{PROMPT}\n\nYour previous answer was rejected: {last_error}. Fix it."
    else:
        sys.exit(f"gave up after 3 attempts: {last_error}")


asyncio.run(main())
