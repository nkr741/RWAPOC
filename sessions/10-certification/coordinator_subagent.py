"""Curriculum example — coordinator-subagent.py: a multi-agent research system (D1, D2, D5).

  coordinator (Opus)  ── plans 3 focused questions ──►  3 workers (Haiku, parallel, own context each,
                                                        read-only doc tools, turn-capped)
                      ◄── structured findings ──────────┘
  coordinator verifies: every claim must cite a source the worker actually read; conflicting
  claims are surfaced, not averaged; then it writes the synthesis.

Why this shape: workers' reading never enters the coordinator's context (D5); workers are
cheap and parallel (cost, latency); verification catches confident nonsense (reliability).

    python sessions/10-certification/coordinator_subagent.py ["research question"]
"""

import asyncio
import json
import sys
from pathlib import Path

import anthropic
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from _env import CHEAP, MODEL, ROOT  # noqa: E402

client = anthropic.AsyncAnthropic()
DOCS = {
    p.name: p.read_text(encoding="utf-8", errors="replace")
    for p in [ROOT / "README.md", ROOT / "CLAUDE.md", *(ROOT / "docs").glob("lesson*.md")]
    if p.exists()
}
QUESTION = " ".join(sys.argv[1:]) or "How does this repo keep Claude-powered CI safe, cheap and reproducible?"


class Plan(BaseModel):
    sub_questions: list[str]  # 3 focused questions, one per worker


class Finding(BaseModel):
    claim: str
    source: str  # a document name the worker read
    quote: str  # supporting excerpt


class Report(BaseModel):
    findings: list[Finding]
    unanswered: str | None


READ_TOOL = {
    "name": "read_doc",
    "description": f"Read one document. Available: {list(DOCS)}",
    "input_schema": {"type": "object", "properties": {"name": {"type": "string"}}, "required": ["name"]},
}


async def worker(sub_q: str, idx: int) -> tuple[str, Report, set[str]]:
    """Own history, own tools, capped turns; returns structured findings + which docs it read."""
    messages = [
        {
            "role": "user",
            "content": f"Research: {sub_q}\nRead the documents you need (at most 3), then report findings with exact quotes.",
        }
    ]
    read: set[str] = set()
    for _ in range(6):
        r = await client.messages.create(model=CHEAP, max_tokens=3000, tools=[READ_TOOL], messages=messages)
        if r.stop_reason != "tool_use":
            break
        messages.append({"role": "assistant", "content": r.content})
        results = []
        for b in r.content:
            if b.type == "tool_use":
                name = b.input["name"]
                read.add(name)
                results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": b.id,
                        "content": DOCS.get(name, "ERROR: no such document")[:20000],
                        "is_error": name not in DOCS,
                    }
                )
        messages.append({"role": "user", "content": results})
    messages.append({"role": "user", "content": "Now output your findings."})
    rep = await client.messages.parse(model=CHEAP, max_tokens=3000, output_format=Report, messages=messages)
    print(f"  worker {idx}: read {sorted(read)} -> {len(rep.parsed_output.findings)} findings")
    return sub_q, rep.parsed_output, read


async def main() -> None:
    print(f"question: {QUESTION}\n== coordinator plans ==")
    plan = (
        await client.messages.parse(
            model=MODEL,
            max_tokens=1000,
            output_format=Plan,
            messages=[
                {
                    "role": "user",
                    "content": f"Split this into exactly 3 focused, non-overlapping research sub-questions about the repo docs:\n{QUESTION}",
                }
            ],
        )
    ).parsed_output
    for q in plan.sub_questions:
        print("  -", q)

    print("== workers run in parallel ==")
    results = await asyncio.gather(*(worker(q, i) for i, q in enumerate(plan.sub_questions, 1)))

    print("== coordinator verifies ==")
    verified, rejected = [], []
    for sub_q, rep, read in results:
        for f in rep.findings:
            ok = (
                f.source in read and f.quote.strip()[:40].lower() in DOCS.get(f.source, "").lower()
            )  # cite what you read, verbatim
            (verified if ok else rejected).append({"sub_question": sub_q, **f.model_dump()})
    print(
        f"  {len(verified)} findings verified against the source text, {len(rejected)} rejected (bad source or fabricated quote)"
    )

    synthesis = await client.messages.create(
        model=MODEL,
        max_tokens=1200,
        messages=[
            {
                "role": "user",
                "content": f"Question: {QUESTION}\n\nVerified findings (JSON):\n{json.dumps(verified, indent=1)[:15000]}\n\n"
                "Write the answer in at most 8 lines, citing sources in brackets. Where findings conflict, say so explicitly.",
            }
        ],
    )
    print("\n== synthesis ==\n" + "".join(b.text for b in synthesis.content if b.type == "text").strip())


asyncio.run(main())
