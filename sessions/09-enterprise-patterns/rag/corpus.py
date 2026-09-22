"""Shared corpus + chunkers for the RAG demos. The corpus is this repo's own Markdown docs."""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from _env import ROOT  # noqa: E402

DOCS = [ROOT / "README.md", ROOT / "CLAUDE.md", *sorted((ROOT / "docs").glob("lesson*.md"))]


def load() -> list[tuple[str, str]]:
    """[(source name, text)]"""
    return [
        (str(p.relative_to(ROOT)), p.read_text(encoding="utf-8", errors="replace"))
        for p in DOCS
        if p.exists()
    ]


# ── three chunking strategies ────────────────────────────────────────────────────────────
def fixed_size(text: str, size: int = 800, overlap: int = 100) -> list[str]:
    """Character windows with overlap. Simple, predictable size, cuts sentences in half."""
    return [text[i : i + size] for i in range(0, max(len(text) - overlap, 1), size - overlap)]


def by_sentence(text: str, max_chars: int = 800) -> list[str]:
    """Pack whole sentences up to max_chars. Respects meaning boundaries; sizes vary."""
    chunks, cur = [], ""
    for s in re.split(r"(?<=[.!?])\s+|\n{2,}", text):
        if len(cur) + len(s) > max_chars and cur:
            chunks.append(cur.strip())
            cur = ""
        cur += s + " "
    return chunks + ([cur.strip()] if cur.strip() else [])


def by_section(text: str, max_chars: int = 1500) -> list[str]:
    """Split on Markdown headings, keep the heading with its body, sub-split big sections.
    Best for docs: a chunk = one topic, and the heading gives the model context."""
    out = []
    for sec in re.split(r"\n(?=#{1,3} )", text):
        out += (
            [sec]
            if len(sec) <= max_chars
            else [sec[: max_chars // 2 + 50]] + fixed_size(sec[max_chars // 2 :], max_chars, 100)
        )
    return [s.strip() for s in out if s.strip()]


def chunks(strategy=by_section) -> list[dict]:
    """[{id, source, text}] over the whole corpus."""
    out = []
    for source, text in load():
        for i, c in enumerate(strategy(text)):
            out.append({"id": f"{source}#{i}", "source": source, "text": c})
    return out


# ── embeddings with a disk cache and rate-limit backoff (Voyage free tier: 3 RPM / 10K TPM) ──
EMBED_MODEL = "voyage-3.5"
SMALL_DOCS = DOCS[:2]  # README + CLAUDE.md ≈ 5K tokens — fits the free tier in one batch


def embed(texts: list[str], input_type: str) -> list[list[float]]:
    """Voyage embeddings; identical inputs are served from .scratch/embeddings.json forever."""
    import hashlib
    import json
    import time

    import voyageai

    cache_file = ROOT / ".scratch" / "embeddings.json"
    cache = json.loads(cache_file.read_text()) if cache_file.exists() else {}
    keys = [hashlib.sha1(f"{EMBED_MODEL}:{input_type}:{t}".encode()).hexdigest() for t in texts]
    todo = [t for t, k in zip(texts, keys, strict=False) if k not in cache]
    for i in range(0, len(todo), 64):
        for attempt in range(6):
            try:
                vecs = (
                    voyageai.Client()
                    .embed(todo[i : i + 64], model=EMBED_MODEL, input_type=input_type)
                    .embeddings
                )
                break
            except voyageai.error.RateLimitError:
                time.sleep(21 * (attempt + 1))  # 3 RPM ⇒ wait out the window
        else:
            raise RuntimeError("Voyage rate limit: add a payment method or retry later")
        for t, v in zip(todo[i : i + 64], vecs, strict=False):
            cache[hashlib.sha1(f"{EMBED_MODEL}:{input_type}:{t}".encode()).hexdigest()] = v
        cache_file.parent.mkdir(exist_ok=True)
        cache_file.write_text(json.dumps(cache))
    return [cache[k] for k in keys]


def small_chunks(strategy=by_section) -> list[dict]:
    out = []
    for p in SMALL_DOCS:
        for i, c in enumerate(strategy(p.read_text(encoding="utf-8", errors="replace"))):
            out.append({"id": f"{p.name}#{i}", "source": p.name, "text": c})
    return out
