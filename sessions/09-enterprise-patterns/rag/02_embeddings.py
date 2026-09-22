"""RAG 2 — text embeddings: vectors, cosine similarity, and why "semantic" beats "keyword".

Uses Voyage AI (Anthropic's recommended embedding provider). Needs VOYAGE_API_KEY in .env.
Documents are embedded with input_type="document", queries with input_type="query" — the two
are tuned to land near each other.

    python sessions/09-enterprise-patterns/rag/02_embeddings.py
"""

import math
import os
import sys

from corpus import embed, small_chunks

if not os.environ.get("VOYAGE_API_KEY"):
    sys.exit("VOYAGE_API_KEY is not set — add it to .env (https://dash.voyageai.com) and re-run")


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=False))
    return dot / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))


print("== 1. what an embedding is ==")
e = embed(["Firefox needs the RWA app built the CI way"], "document")[0]
print(f"   one text -> {len(e)} floats, first five: {[round(x, 4) for x in e[:5]]}")

print("\n== 2. similarity captures meaning, not words ==")
pairs = [
    ("the browser never fires the load event on the dev server", "Firefox navigation times out against Vite"),
    ("the browser never fires the load event on the dev server", "the default password is s3cret"),
    ("how do I run only smoke tests", "npm run test:smoke runs the @smoke tagged tests"),
]
texts = sorted({t for p in pairs for t in p})
vecs = dict(zip(texts, embed(texts, "document"), strict=False))
for a, b in pairs:
    print(f"   {cosine(vecs[a], vecs[b]):.3f}  «{a[:45]}»  vs  «{b[:45]}»")

print("\n== 3. embed the corpus once, query many times ==")
cs = small_chunks()  # README + CLAUDE.md: fits the free tier
doc_vecs = embed([c["text"] for c in cs], "document")  # batched, cached on disk, rate-limit aware
q = "why does Firefox time out on every navigation?"
qv = embed([q], "query")[0]
top = sorted(zip(cs, doc_vecs, strict=False), key=lambda cd: -cosine(qv, cd[1]))[:3]
for c, v in top:
    print(f"   {cosine(qv, v):.3f}  {c['id']:<40} {c['text'][:70].replace(chr(10), ' ')}…")
print(
    f"\n   embedded {len(cs)} chunks; in production store the vectors (numpy / a vector DB) — never re-embed per query"
)
