"""RAG 1 — text chunking strategies, compared on the same corpus.

Chunking decides what a "hit" can return. Too small: no context; too big: noise and cost;
cut mid-sentence: broken meaning. Numbers below are for this repo's docs.

    python sessions/09-enterprise-patterns/rag/01_chunking.py
"""

from statistics import mean

from corpus import by_section, by_sentence, chunks, fixed_size

for name, fn in [
    ("fixed_size(800, overlap 100)", fixed_size),
    ("by_sentence(≤800)", by_sentence),
    ("by_section(≤1500)", by_section),
]:
    cs = chunks(fn)
    sizes = [len(c["text"]) for c in cs]
    starts_mid_word = sum(1 for c in cs if c["text"][:1].islower()) / len(cs)
    print(
        f"{name:<30} chunks={len(cs):>4}  mean={mean(sizes):>5.0f}  min={min(sizes):>4}  max={max(sizes):>5}  "
        f"starts mid-word={starts_mid_word:.0%}"
    )

print("\nsample section chunk:\n---")
print(chunks(by_section)[3]["text"][:400])
print(
    "---\nRule of thumb: split on the document's own structure (headings, paragraphs), keep the heading in the "
    "chunk, size for the question type (facts: small; how-to: a whole section), overlap only for fixed windows."
)
