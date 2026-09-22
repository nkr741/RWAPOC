"""Eval step 1 — generate a test dataset with Claude.

The prompt under evaluation (see prompt_under_test.py) classifies a Playwright failure as
APP_BUG / TEST_BUG / FLAKY / ENV. We ask Claude for labelled cases via structured output, then
hand-check them once (a dataset is only as good as its labels) and commit dataset.json.

    python sessions/03-workflows-prompting/eval/01_generate_dataset.py
"""

import json
import sys
from pathlib import Path

import anthropic
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from _env import MODEL  # noqa: E402

HERE = Path(__file__).parent


class Case(BaseModel):
    failure: str  # the Playwright error text a CI job would print
    expected: str  # APP_BUG | TEST_BUG | FLAKY | ENV
    why: str  # one-line rationale — makes the label auditable


class Dataset(BaseModel):
    cases: list[Case]


client = anthropic.Anthropic()
resp = client.messages.parse(
    model=MODEL,
    max_tokens=16000,  # thinking + 12 verbose cases overflowed 8000 and cut the JSON mid-string
    messages=[
        {
            "role": "user",
            "content": (
                "Generate 8 realistic Playwright test-failure messages from a banking web app "
                "(Cypress Real World App) test suite: locator timeouts, assertion mismatches, "
                "ECONNREFUSED, 500 responses, strict-mode violations, screenshot diffs, etc. "
                "Label each with exactly one category:\n"
                "APP_BUG (product is wrong), TEST_BUG (test/locator/assertion is wrong), "
                "FLAKY (timing/race, passes on retry), ENV (infra: network, ports, browsers, secrets).\n"
                "Make two per category, make them hard — include the stack line and the failing assertion. "
                "Keep the label unambiguous."
            ),
        }
    ],
    output_format=Dataset,
)

data = resp.parsed_output
(HERE / "dataset.json").write_text(json.dumps(data.model_dump(), indent=2))
by = {}
for c in data.cases:
    by[c.expected] = by.get(c.expected, 0) + 1
print(f"wrote {len(data.cases)} cases -> {HERE / 'dataset.json'}   {by}")
print("Review the labels before trusting the eval — edit dataset.json by hand where the model is wrong.")
