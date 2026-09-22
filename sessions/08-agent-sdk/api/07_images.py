"""API 7 — image support: a base64 image block before the text block; multiple images per turn.

Uses the visual-regression snapshot this repo already has. Supported: JPEG, PNG, GIF, WebP;
up to 20 images per request; ~1.15 MP is the sweet spot (larger is downscaled, costs the same).
Token cost ≈ (width × height) / 750.

    python sessions/08-agent-sdk/api/07_images.py
"""

import base64
import sys
from pathlib import Path

import anthropic

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from _env import MODEL, ROOT  # noqa: E402

client = anthropic.Anthropic()
SNAPS = ROOT / "tests/practice/visual-regression.spec.ts-snapshots"
images = sorted(SNAPS.glob("*.png"))[:2]


def image_block(path: Path) -> dict:
    return {
        "type": "image",
        "source": {
            "type": "base64",
            "media_type": "image/png",
            "data": base64.standard_b64encode(path.read_bytes()).decode(),
        },
    }


content = [image_block(p) for p in images] + [
    {
        "type": "text",
        "text": f"These are {len(images)} Playwright screenshot baselines ({', '.join(p.name for p in images)}). "
        "For each: what UI element or page is it, and what would make a good visual-regression assertion for it? "
        "Two lines per image.",
    }
]

r = client.messages.create(model=MODEL, max_tokens=2000, messages=[{"role": "user", "content": content}])
print("".join(b.text for b in r.content if b.type == "text").strip())
print(f"\ninput tokens: {r.usage.input_tokens} (images are billed as tokens by pixel area)")
