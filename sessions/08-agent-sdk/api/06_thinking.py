"""API 6 — extended thinking: adaptive thinking, effort, and the display switch.

Current models (Opus 5 / Sonnet 5 / Opus 4.7+) use ADAPTIVE thinking — the model decides how
much to think; you steer with output_config.effort. `budget_tokens` is gone (400 on Opus 5).
Thinking tokens are billed as output and count toward max_tokens. display="summarized" returns
a readable summary; the default "omitted" streams empty thinking blocks.

    python sessions/08-agent-sdk/api/06_thinking.py
"""

import sys
import time
from pathlib import Path

import anthropic

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from _env import MODEL  # noqa: E402

client = anthropic.Anthropic()
PUZZLE = (
    "A Playwright suite has 3 specs sharing one browser page. Spec A logs in, spec B logs out, spec C assumes "
    "a logged-in user. They pass in order A,B,C on Chromium but C fails on Firefox where B is skipped. Why, "
    "and what is the smallest fix? Answer in 3 sentences."
)

for effort in ("low", "high"):
    t0 = time.time()
    r = client.messages.create(
        model=MODEL,
        max_tokens=8000,
        thinking={"type": "adaptive", "display": "summarized"},
        output_config={"effort": effort},
        messages=[{"role": "user", "content": PUZZLE}],
    )
    thinking = "".join(b.thinking for b in r.content if b.type == "thinking")
    text = "".join(b.text for b in r.content if b.type == "text")
    print(
        f"== effort={effort}: {r.usage.output_tokens} output tokens (incl. thinking), {time.time() - t0:.1f}s =="
    )
    print(f"  thinking summary ({len(thinking)} chars): {thinking[:200].replace(chr(10), ' ')}…")
    print(f"  answer: {text.strip()[:400]}\n")

print(
    "When continuing a conversation, pass the thinking blocks back unchanged (append r.content), "
    "not just the text — the API needs them for the next turn on the same model."
)
