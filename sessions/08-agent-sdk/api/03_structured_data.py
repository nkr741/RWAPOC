"""API 3 — structured data three ways: Pydantic parse(), raw JSON schema, strict tool input.

Structured outputs constrain the model to a schema at generation time — no "please reply in
JSON" prayers, no regex. Still check stop_reason: a max_tokens cut-off can truncate the JSON.

    python sessions/08-agent-sdk/api/03_structured_data.py
"""

import json
import sys
from pathlib import Path

import anthropic
from pydantic import BaseModel, Field

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from _env import MODEL  # noqa: E402

client = anthropic.Anthropic()
FAILURE = (
    "Error: expect(locator).toBeVisible() failed\nLocator: getByText('Must contain a valid routing number')\n"
    "Expected: visible  Timeout: 15000ms\n    at tests/e2e/bank-accounts.spec.ts:52:60"
)


# ── 1. Pydantic model → messages.parse() → validated object ─────────────────────────────
class Triage(BaseModel):
    label: str = Field(pattern="^(APP_BUG|TEST_BUG|FLAKY|ENV)$")
    file: str
    line: int
    evidence: str
    fix: str


r = client.messages.parse(
    model=MODEL,
    max_tokens=2000,
    output_format=Triage,
    messages=[{"role": "user", "content": f"Triage this Playwright failure:\n{FAILURE}"}],
)
t = r.parsed_output
print("1. parse():", t.label, f"{t.file}:{t.line}", "—", t.fix[:80])

# ── 2. raw JSON schema via output_config → json.loads on the text block ───────────────────
SCHEMA = {
    "type": "object",
    "properties": {
        "label": {"type": "string", "enum": ["APP_BUG", "TEST_BUG", "FLAKY", "ENV"]},
        "confidence": {"type": "number"},
    },
    "required": ["label", "confidence"],
    "additionalProperties": False,
}
r = client.messages.create(
    model=MODEL,
    max_tokens=2000,
    output_config={"format": {"type": "json_schema", "schema": SCHEMA}},
    messages=[{"role": "user", "content": f"Label this failure:\n{FAILURE}"}],
)
assert r.stop_reason == "end_turn", f"truncated: {r.stop_reason}"
data = json.loads(next(b.text for b in r.content if b.type == "text"))
print("2. json_schema:", data)

# ── 3. strict tool input: the model MUST produce arguments that validate ──────────────────
TOOL = {
    "name": "file_bug",
    "description": "File a bug for an APP_BUG failure",
    "strict": True,
    "input_schema": {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "severity": {"type": "string", "enum": ["P1", "P2", "P3"]},
            "component": {"type": "string"},
        },
        "required": ["title", "severity", "component"],
        "additionalProperties": False,
    },
}
r = client.messages.create(
    model=MODEL,
    max_tokens=2000,
    tools=[TOOL],
    tool_choice={"type": "tool", "name": "file_bug"},
    messages=[{"role": "user", "content": f"File a bug for:\n{FAILURE}"}],
)
call = next(b for b in r.content if b.type == "tool_use")
print("3. strict tool:", call.name, call.input)
assert set(call.input) == {"title", "severity", "component"}
