"""RAG 4 — the full flow: chunk → index → retrieve → answer with the retrieved context only.

Retrieval is pluggable: BM25 always works; add embeddings when VOYAGE_API_KEY is set
(05_multi_index.py fuses both). The generation step is where RAG earns its name: the model
answers FROM the chunks, cites them, and says "not in the docs" when they don't cover it.

    python sessions/09-enterprise-patterns/rag/04_rag_flow.py ["question"]
"""

import os
import sys
from pathlib import Path

import anthropic

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from _env import MODEL  # noqa: E402
from corpus import by_section, chunks  # noqa: E402

cs = chunks(by_section)
client = anthropic.Anthropic()


def retrieve(query: str, k: int = 4) -> list[dict]:
    from importlib import import_module

    if os.environ.get("VOYAGE_API_KEY"):
        return import_module("05_multi_index").hybrid(query, k)  # BM25 + embeddings, fused (small corpus)
    index = import_module("03_bm25").BM25([c["text"] for c in cs])  # lexical only, full corpus
    return [cs[i] for i, _ in index.search(query, k)]


def answer(question: str) -> str:
    hits = retrieve(question)
    context = "\n\n".join(f'<chunk id="{h["id"]}">\n{h["text"]}\n</chunk>' for h in hits)
    r = client.messages.create(
        model=MODEL,
        max_tokens=800,
        system="Answer ONLY from the chunks. Cite chunk ids in brackets. If the chunks do not contain the answer, "
        "say 'Not covered by the docs' and nothing else.",
        messages=[{"role": "user", "content": f"{context}\n\n<question>{question}</question>"}],
    )
    print(f"\nQ: {question}\n   retrieved: {[h['id'] for h in hits]}")
    return "".join(b.text for b in r.content if b.type == "text").strip()


if len(sys.argv) > 1:
    print("A:", answer(" ".join(sys.argv[1:])))
else:
    print("A:", answer("What must be running before Firefox tests pass, and why?"))
    print("A:", answer("Which exit code does the quality gate use when Claude returns unparseable JSON?"))
    print("A:", answer("What is the capital of France?"))  # → not covered: grounding is the point
