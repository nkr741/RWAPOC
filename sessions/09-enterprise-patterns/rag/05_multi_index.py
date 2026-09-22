"""RAG 5 — a multi-index pipeline: BM25 (lexical) + embeddings (semantic), fused with RRF,
optionally re-ranked.

Lexical finds exact identifiers; semantic finds paraphrases; Reciprocal Rank Fusion merges
the two ranked lists without having to make their scores comparable:
    rrf(d) = Σ_indexes 1 / (60 + rank_index(d))
Needs VOYAGE_API_KEY for the embedding half; also shows Voyage's reranker as the last stage.

    python sessions/09-enterprise-patterns/rag/05_multi_index.py ["query"]
"""

import math
import os
import sys
from importlib import import_module

import voyageai
from corpus import embed, small_chunks

if not os.environ.get("VOYAGE_API_KEY"):
    sys.exit("VOYAGE_API_KEY is not set — add it to .env and re-run")

cs = small_chunks()  # README + CLAUDE.md (free-tier sized)
bm = import_module("03_bm25")
_bm25 = bm.BM25([c["text"] for c in cs])
_vecs = embed([c["text"] for c in cs], "document")  # cached on disk after the first run


def _cos(a, b):
    return sum(x * y for x, y in zip(a, b, strict=False)) / (
        math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b))
    )


def semantic(query: str, k: int) -> list[int]:
    qv = embed([query], "query")[0]
    return sorted(range(len(cs)), key=lambda i: -_cos(qv, _vecs[i]))[:k]


def lexical(query: str, k: int) -> list[int]:
    return [i for i, _ in _bm25.search(query, k)]


def hybrid(query: str, k: int = 4, rerank: bool = True) -> list[dict]:
    ranks: dict[int, float] = {}
    for ranking in (lexical(query, 10), semantic(query, 10)):
        for rank, i in enumerate(ranking):
            ranks[i] = ranks.get(i, 0) + 1 / (60 + rank)  # reciprocal rank fusion
    fused = sorted(ranks, key=lambda i: -ranks[i])[: k * 2]
    if rerank and fused:  # cross-encoder pass on the short list
        rr = voyageai.Client().rerank(query, [cs[i]["text"] for i in fused], model="rerank-2.5", top_k=k)
        return [cs[fused[r.index]] for r in rr.results]
    return [cs[i] for i in fused[:k]]


if __name__ == "__main__":
    q = sys.argv[1] if len(sys.argv) > 1 else "how do I stop Firefox navigations timing out"
    print(f"query: {q}")
    print("  lexical :", [cs[i]["id"] for i in lexical(q, 3)])
    print("  semantic:", [cs[i]["id"] for i in semantic(q, 3)])
    print("  hybrid+rerank:", [c["id"] for c in hybrid(q, 3)])
