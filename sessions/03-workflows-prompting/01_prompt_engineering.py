"""Session 3 — prompt engineering, the four techniques the exam names, side by side.

  1. clear & direct   2. specific (constraints, format, audience)
  3. XML-tag structure 4. examples (few-shot)

Each variant sends the SAME task — turn a bug report into a Playwright test title + tags —
so you can compare what changes. Structured output is Session 8/10; here we ask for plain text.

    python sessions/03-workflows-prompting/01_prompt_engineering.py
"""

import sys
from pathlib import Path

import anthropic

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from _env import MODEL  # noqa: E402

client = anthropic.Anthropic()

BUG = (
    "When I add a bank account with a routing number shorter than 9 digits the form submits "
    "anyway and the API returns 500. Expected: inline validation error, no request sent."
)

VARIANTS = {
    "0 · vague": f"Here is a bug: {BUG}\nWhat test should I write?",
    "1 · clear & direct": (
        "Write ONE Playwright test title for the bug below. Output the title only, nothing else.\n\n"
        f"Bug: {BUG}"
    ),
    "2 · specific": (
        "Write ONE Playwright test title for the bug below.\n"
        "Rules: imperative mood, starts with 'should', under 80 characters, names the field and the "
        "expected behaviour, followed by tags from {@smoke, @regression, @validation}.\n"
        "Output format: <title> | <tags>\n\n"
        f"Bug: {BUG}"
    ),
    "3 · XML structure": (
        "<task>Write one Playwright test title for the bug report.</task>\n"
        "<rules>\n"
        "  <rule>imperative mood, starts with 'should'</rule>\n"
        "  <rule>under 80 characters</rule>\n"
        "  <rule>names the field and the expected behaviour</rule>\n"
        "  <rule>append tags chosen from @smoke @regression @validation</rule>\n"
        "</rules>\n"
        "<output_format>&lt;title&gt; | &lt;tags&gt; — no other text</output_format>\n"
        f"<bug_report>{BUG}</bug_report>"
    ),
    "4 · examples (few-shot)": (
        "Convert bug reports to Playwright test titles with tags. Follow the examples exactly.\n\n"
        "<example>\n<bug>Login accepts an empty password and shows a spinner forever.</bug>\n"
        "<output>should reject empty password with an inline error | @smoke @validation</output>\n</example>\n"
        "<example>\n<bug>Transaction list shows amounts in cents instead of dollars after refresh.</bug>\n"
        "<output>should format transaction amounts in dollars after reload | @regression</output>\n</example>\n\n"
        f"<bug>{BUG}</bug>\n<output>"
    ),
}

for label, prompt in VARIANTS.items():
    # thinking counts toward max_tokens: at 400 the vague variant produced no text at all
    msg = client.messages.create(model=MODEL, max_tokens=2000, messages=[{"role": "user", "content": prompt}])
    text = "".join(b.text for b in msg.content if b.type == "text").strip()
    print(
        f"\n=== {label} ===  ({msg.usage.output_tokens} output tokens incl. thinking, stop={msg.stop_reason})"
    )
    print(text if len(text) < 500 else text[:500] + " …[truncated]")

print(
    "\nWatch: 0 rambles; 1 obeys 'title only'; 2 adds the constraints; 3 separates data from "
    "instructions so the bug text can't hijack them; 4 nails the exact format with zero rules."
)
