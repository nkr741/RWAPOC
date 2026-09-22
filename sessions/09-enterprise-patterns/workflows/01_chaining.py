"""Workflow: CHAINING (pipeline composition) — each step's structured output is the next step's input.

  failure text ─► extract (facts as JSON) ─► classify (label + confidence) ─► draft (bug report)
                       │ code gate: required fields present?     │ code gate: confidence ≥ 0.7 else escalate

Why chain instead of one big prompt: each step is small, testable, cacheable, and a code gate
between steps catches drift before it compounds. Workflows (fixed steps you control) vs
agents (the model decides the steps) — this is a workflow.

    python sessions/09-enterprise-patterns/workflows/01_chaining.py
"""

import sys
from pathlib import Path

import anthropic
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from _env import CHEAP, MODEL  # noqa: E402

client = anthropic.Anthropic()
FAILURE = (
    "2) [chromium] › tests/api/transactions.api.spec.ts:23:5 › should create a payment\n"
    "ApiError: POST /transactions -> 500 Internal Server Error\n"
    "    at ApiClient.post (utils/api.client.ts:54:11)\nretry 1: same error\nretry 2: same error"
)


class Facts(BaseModel):
    spec_file: str
    line: int
    endpoint: str | None
    status_code: int | None
    deterministic: bool  # same result on every retry?


class Label(BaseModel):
    label: str
    confidence: float
    reason: str


def step(model: str, prompt: str, schema: type[BaseModel]):
    return client.messages.parse(
        model=model, max_tokens=1500, output_format=schema, messages=[{"role": "user", "content": prompt}]
    ).parsed_output


# step 1 — extract (cheap model: mechanical work)
facts = step(
    CHEAP, f"Extract the facts from this Playwright failure.\n<failure>\n{FAILURE}\n</failure>", Facts
)
print("1 extract :", facts.model_dump())
assert facts.spec_file and facts.line, "gate 1: extraction incomplete"  # code gate

# step 2 — classify (only the facts, not the raw text: smaller, cleaner input)
label = step(
    MODEL, f"Classify as APP_BUG / TEST_BUG / FLAKY / ENV from these facts:\n{facts.model_dump_json()}", Label
)
print("2 classify:", label.model_dump())
if label.confidence < 0.7:  # code gate
    sys.exit("gate 2: low confidence -> escalate to a human")

# step 3 — draft (conditional on the label)
if label.label == "APP_BUG":
    report = client.messages.create(
        model=MODEL,
        max_tokens=800,
        messages=[
            {
                "role": "user",
                "content": f"Write a 4-line bug report (title, steps, expected, actual) from:\n{facts.model_dump_json()}\nReason: {label.reason}",
            }
        ],
    )
    print("3 draft   :", "".join(b.text for b in report.content if b.type == "text").strip())
else:
    print("3 draft   : skipped —", label.label, "is handled by QA, not a bug report")
