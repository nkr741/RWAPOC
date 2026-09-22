"""Eval step 3 — grade the SAME outputs WITH A MODEL (LLM-as-judge).

Model-based grading is for the part code can't check: is the one-sentence reasoning correct,
specific and actionable? Rules that keep a judge honest:
  * a written rubric, a fixed 1-5 scale, and the expected label handed to the judge
  * structured output so the score is a number, not prose
  * a different (or at least separately prompted) model from the one under test
  * spot-check a sample of judge verdicts by hand — judges have biases too

    python sessions/03-workflows-prompting/eval/03_grade_model.py
"""

import json
import sys
from pathlib import Path

import anthropic
from pydantic import BaseModel, Field

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from _env import CHEAP  # noqa: E402  — judge on a different model than the one under test

HERE = Path(__file__).parent
outputs = json.loads((HERE / "outputs.json").read_text())
client = anthropic.Anthropic()


class Verdict(BaseModel):
    score: int = Field(ge=1, le=5)
    reason: str


RUBRIC = """You are grading a CI-failure triage answer.

<failure>{failure}</failure>
<expected_label>{expected}</expected_label>
<answer>{answer}</answer>

Score the answer's REASONING sentence 1-5:
5 = names the exact evidence in the failure that decides the label; an engineer could act on it
4 = correct and specific, minor omission
3 = correct label, generic reasoning
2 = plausible but wrong emphasis, or reasoning contradicts the label
1 = wrong label or no reasoning
Be strict. Return the score and a one-line reason."""

scores = []
for o in outputs:
    v = client.messages.parse(
        model=CHEAP,
        max_tokens=300,
        output_format=Verdict,
        messages=[{"role": "user", "content": RUBRIC.format(**o)}],
    ).parsed_output
    scores.append(v.score)
    print(f"{v.score}/5  {'✓' if o['label_ok'] else '✗'} {o['expected']:<8} {v.reason[:90]}")

mean = sum(scores) / len(scores)
print(
    f"\nmean reasoning score {mean:.2f}/5   code accuracy {sum(o['label_ok'] for o in outputs) / len(outputs):.0%}"
)
print(
    "Change PROMPT in prompt_under_test.py, re-run 02 then 03: both numbers must move up before you ship it."
)
