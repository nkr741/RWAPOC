"""Step 1 — a normal Claude call. Claude can tell us what it thinks. Nothing more.

    pip install anthropic
    set ANTHROPIC_API_KEY=...
    python 01_basic_claude.py
"""

import anthropic

MODEL = "claude-sonnet-5"

client = anthropic.Anthropic()

response = client.messages.create(
    model=MODEL,
    max_tokens=1000,
    messages=[
        {
            "role": "user",
            "content": "Explain why a Playwright login test might fail.",
        }
    ],
)

for block in response.content:
    if block.type == "text":
        print(block.text)
