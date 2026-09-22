"""Eval step 2 — run the prompt under test over the dataset and grade it WITH CODE.

Code-based grading: deterministic, free, fast — use it whenever the answer has a checkable
shape (a label, a number, valid JSON, a regex). Writes outputs.json for step 3.

    python sessions/03-workflows-prompting/eval/02_run_eval.py
"""

import json
import sys
from pathlib import Path

import anthropic

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from _env import MODEL  # noqa: E402
from prompt_under_test import LABELS, PROMPT  # noqa: E402

HERE = Path(__file__).parent
cases = json.loads((HERE / "dataset.json").read_text())["cases"]
client = anthropic.Anthropic()


def code_grade(answer: str, expected: str) -> dict:
    """Exact-match on the first line + a format check. Returns per-check booleans."""
    first = answer.strip().splitlines()[0].strip().upper() if answer.strip() else ""
    return {
        "label_ok": first == expected,
        "format_ok": first in LABELS and len(answer.strip().splitlines()) == 2,
    }


outputs = []
for c in cases:
    msg = client.messages.create(
        model=MODEL,
        max_tokens=300,
        messages=[{"role": "user", "content": PROMPT.format(failure=c["failure"])}],
    )
    answer = "".join(b.text for b in msg.content if b.type == "text")
    grade = code_grade(answer, c["expected"])
    outputs.append({**c, "answer": answer, **grade})
    mark = "✓" if grade["label_ok"] else "✗"
    print(f"{mark} expected {c['expected']:<8} got {answer.strip().splitlines()[0]:<10} {c['failure'][:60]}…")

(HERE / "outputs.json").write_text(json.dumps(outputs, indent=2))
n = len(outputs)
acc = sum(o["label_ok"] for o in outputs) / n
fmt = sum(o["format_ok"] for o in outputs) / n
print(f"\naccuracy {acc:.0%}   format compliance {fmt:.0%}   ({n} cases, model {MODEL})")
print(f"-> {HERE / 'outputs.json'}; now run 03_grade_model.py for the reasoning-quality score")
