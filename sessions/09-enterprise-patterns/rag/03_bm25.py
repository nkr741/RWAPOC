"""RAG 3 — BM25 lexical search, from scratch in ~30 lines (no dependencies).

BM25 scores a document by how often the query's terms appear in it (tf), discounted by how
common the term is across the corpus (idf) and by document length. It is exact on identifiers,
error strings, flags — things embeddings blur. Pair it with embeddings (04_multi_index.py).

    python sessions/09-enterprise-patterns/rag/03_bm25.py ["your query"]
"""

import math
import re
import sys
from collections import Counter

from corpus import by_section, chunks

TOKEN = re.compile(r"[a-z0-9_./:@-]+")


def tokenize(text: str) -> list[str]:
    return TOKEN.findall(text.lower())


class BM25:
    def __init__(self, docs: list[str], k1: float = 1.5, b: float = 0.75):
        self.k1, self.b = k1, b
        self.tf = [Counter(tokenize(d)) for d in docs]
        self.len = [sum(c.values()) for c in self.tf]
        self.avg = sum(self.len) / len(self.len)
        df = Counter(t for c in self.tf for t in c)
        n = len(docs)
        self.idf = {t: math.log(1 + (n - f + 0.5) / (f + 0.5)) for t, f in df.items()}

    def score(self, query: str, i: int) -> float:
        s = 0.0
        for t in tokenize(query):
            if t not in self.tf[i]:
                continue
            f = self.tf[i][t]
            s += (
                self.idf[t]
                * f
                * (self.k1 + 1)
                / (f + self.k1 * (1 - self.b + self.b * self.len[i] / self.avg))
            )
        return s

    def search(self, query: str, k: int = 5) -> list[tuple[int, float]]:
        scored = [(i, self.score(query, i)) for i in range(len(self.tf))]
        return sorted((x for x in scored if x[1] > 0), key=lambda x: -x[1])[:k]


if __name__ == "__main__":
    cs = chunks(by_section)
    index = BM25([c["text"] for c in cs])
    q = sys.argv[1] if len(sys.argv) > 1 else "NODE_EXTRA_CA_CERTS proxy TLS"
    print(f"query: {q}\n")
    for i, s in index.search(q):
        print(f"  {s:6.2f}  {cs[i]['id']:<40} {cs[i]['text'][:70].replace(chr(10), ' ')}…")
    assert index.search("NODE_EXTRA_CA_CERTS"), "an exact identifier must be found"
    print("\nExact tokens (env var names, flags, error text) are BM25's home turf; paraphrases are not.")
