"""API 2 — response streaming: text as it is generated, the raw event types, the final message.

python sessions/08-agent-sdk/api/02_streaming.py
"""

import sys
from collections import Counter
from pathlib import Path

import anthropic

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from _env import MODEL  # noqa: E402

client = anthropic.Anthropic()
PROMPT = "Write a five-line checklist for making a flaky Playwright test reliable."

print("== 1. text_stream: the simple way ==")
with client.messages.stream(
    model=MODEL, max_tokens=2000, messages=[{"role": "user", "content": PROMPT}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
    final = stream.get_final_message()  # the complete Message, same as a non-streaming call
print(f"\n   stop_reason={final.stop_reason} output_tokens={final.usage.output_tokens}")

print("\n== 2. raw events: what actually comes over the wire ==")
seen = Counter()
with client.messages.stream(
    model=MODEL,
    max_tokens=2000,
    thinking={"type": "adaptive", "display": "summarized"},
    messages=[{"role": "user", "content": "In one sentence, why do tests share one page in this repo?"}],
) as stream:
    for event in stream:
        seen[event.type] += 1
        if event.type == "content_block_start":
            print(f"   ▶ block {event.index}: {event.content_block.type}")
        elif event.type == "content_block_delta" and event.delta.type == "text_delta":
            print(event.delta.text, end="", flush=True)
        elif event.type == "message_delta":
            print(
                f"\n   ■ message_delta stop_reason={event.delta.stop_reason} output_tokens={event.usage.output_tokens}"
            )
print("   event counts:", dict(seen))
print(
    "\nOrder is always: message_start → (content_block_start → *_delta… → content_block_stop)… → message_delta → message_stop"
)
