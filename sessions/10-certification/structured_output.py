"""Curriculum example — structured-output.py: JSON schema + retry loop + CONFLICT DETECTION (D4, D5).

Scenario 6 (structured data extraction for quality reporting): extract structured facts from
free text reliably enough to put in a report.

  1. schema-constrained generation (output_config.format)  — shape is guaranteed
  2. validation + bounded retry with the error fed back      — content rules are checked by code
  3. conflict detection: run the extraction TWICE (independent samples, or two models) and
     diff the results; fields that disagree are flagged for human review instead of silently
     picking one. Agreement is evidence; disagreement is a queue.

    python sessions/10-certification/structured_output.py
"""

import json
import sys
from pathlib import Path

import anthropic
from pydantic import BaseModel, ConfigDict, Field, ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from _env import CHEAP, MODEL  # noqa: E402

client = anthropic.Anthropic()
REPORT = """Nightly run 2026-09-21 — 262 runs, 4 shards. Chromium: 117/117 green. Firefox: 115 passed, 2 failed
(notifications.spec.ts:22 timed out waiting for **/notifications on retry 0, passed on retry 1; transaction.spec.ts:48
assertion on amount formatting failed twice). WebKit: 116 passed, 1 skipped. API project: 26/26. Total wall clock 14m12s.
Root cause for transaction.spec.ts:48 is believed to be the cents-vs-dollars change in PR #212."""


class SpecFailure(BaseModel):
    model_config = ConfigDict(extra="forbid")  # → additionalProperties: false, which the API requires
    file: str
    line: int
    browser: str
    passed_on_retry: bool


class Run(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    total_runs: int = Field(ge=1)
    shards: int = Field(ge=1)
    failures: list[SpecFailure]
    wall_clock_seconds: int = Field(ge=1)
    suspected_pr: int | None


def shape_only(schema: dict) -> dict:
    """The API's structured-output schema supports SHAPE (types, required, enum, additionalProperties)
    but not value constraints (minimum, pattern, minItems…). Strip those; Pydantic enforces them after."""
    drop = {
        "minimum",
        "maximum",
        "pattern",
        "minItems",
        "maxItems",
        "minLength",
        "maxLength",
        "exclusiveMinimum",
        "exclusiveMaximum",
    }
    if isinstance(schema, dict):
        return {k: shape_only(v) for k, v in schema.items() if k not in drop}
    if isinstance(schema, list):
        return [shape_only(v) for v in schema]
    return schema


SCHEMA = shape_only(Run.model_json_schema())


def extract(model: str, hint: str = "") -> Run:
    """Schema-constrained extraction with a bounded retry on validation errors."""
    prompt = f"Extract the nightly run facts.\n<report>\n{REPORT}\n</report>{hint}"
    for attempt in range(3):
        r = client.messages.create(
            model=model,
            max_tokens=2000,
            output_config={"format": {"type": "json_schema", "schema": SCHEMA}},
            messages=[{"role": "user", "content": prompt}],
        )
        if r.stop_reason != "end_turn":
            prompt += "\n\nBe more concise."
            continue  # truncated JSON → retry
        data = json.loads(next(b.text for b in r.content if b.type == "text"))
        try:
            run = Run.model_validate(data)
            if sum(1 for f in run.failures) != 2 and attempt < 2:  # a business rule the schema can't express
                raise ValueError("expected exactly the failures named in the report")
            return run
        except (ValidationError, ValueError) as e:
            prompt += f"\n\nPrevious attempt rejected: {str(e).splitlines()[0]}. Fix it."
    raise RuntimeError("extraction failed after 3 attempts")


a = extract(MODEL)
b = extract(CHEAP)  # independent second opinion
print("extraction A (opus):", a.model_dump())
print("extraction B (haiku):", b.model_dump())

# conflict detection: field-level diff
conflicts = {
    k: (va, vb)
    for (k, va), (_, vb) in zip(a.model_dump().items(), b.model_dump().items(), strict=False)
    if va != vb
}
if conflicts:
    print("\nCONFLICTS → human review queue:")
    for k, (va, vb) in conflicts.items():
        print(f"  {k}: A={va!r}  B={vb!r}")
else:
    print("\nno conflicts — both extractions agree on every field; safe to publish")
