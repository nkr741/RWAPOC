"""API 9 — prompt caching: the rules, in action, with the numbers that prove it.

Rules (the exam asks them):
  * caching is a PREFIX match over tools → system → messages; any byte change before a
    breakpoint invalidates everything after it;
  * a cache_control breakpoint marks "cache up to here"; max 4 per request; the minimum
    cacheable prefix is model-dependent (1024 tokens on most; shorter prefixes silently don't cache);
  * TTL 5 min (default) or 1 h (`"ttl": "1h"`); refreshed on every hit;
  * writes cost ~1.25× input, reads ~0.1× — read usage.cache_creation_input_tokens vs
    usage.cache_read_input_tokens to see which happened.

    python sessions/08-agent-sdk/api/09_prompt_caching.py
"""

import sys
import time
from pathlib import Path

import anthropic

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from _env import MODEL, ROOT  # noqa: E402

client = anthropic.Anthropic()

# A big, STABLE context: this repo's own docs and page objects (~10k tokens).
big = "\n\n".join(
    f"### {p.relative_to(ROOT)}\n{p.read_text()}"
    for p in [ROOT / "README.md", ROOT / "CLAUDE.md", *sorted((ROOT / "pages").glob("*.ts"))]
)
SYSTEM = [
    {
        "type": "text",
        "text": "You answer questions about the ryvan-e2e repository using only the documents below.",
    },
    {"type": "text", "text": big, "cache_control": {"type": "ephemeral"}},  # breakpoint AFTER the stable blob
]


def ask(q: str) -> None:
    t0 = time.time()
    r = client.messages.create(
        model=MODEL, max_tokens=300, system=SYSTEM, messages=[{"role": "user", "content": q}]
    )
    u = r.usage
    print(
        f"  {q[:38]:<40} in={u.input_tokens:>5} cache_write={u.cache_creation_input_tokens:>6} "
        f"cache_read={u.cache_read_input_tokens:>6} {time.time() - t0:.1f}s"
    )


print("== same stable prefix, three different questions ==")
ask("Which fixture gives a page object access to the API?")
ask("What port does the RWA backend use?")
ask("Name the two navigation components.")

print("\n== break the prefix: one changed byte before the breakpoint ==")
SYSTEM[0]["text"] += " "  # volatile content BEFORE the breakpoint invalidates the cache
ask("Name the two navigation components.")
print(
    "\nPut volatile things (dates, user ids, the question) AFTER the last breakpoint; keep tools and "
    "system stable and in the same order; use 1h TTL for agents that idle between turns."
)
