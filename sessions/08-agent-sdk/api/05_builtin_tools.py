"""API 5 — Anthropic-defined tools: the text editor tool (client-side) and web search (server-side).

text_editor_20250728  — schema-less; YOU implement view / str_replace / create / insert. The
                        model-supplied path is untrusted: confine it to a sandbox root.
web_search_20260209   — runs on Anthropic's servers; results come back as content blocks;
                        errors arrive as a result block, not an exception.

  python sessions/08-agent-sdk/api/05_builtin_tools.py
"""

import shutil
import sys
from pathlib import Path

import anthropic

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from _env import MODEL, ROOT  # noqa: E402

client = anthropic.Anthropic()
SANDBOX = ROOT / ".scratch" / "editor-sandbox"
shutil.rmtree(SANDBOX, ignore_errors=True)
SANDBOX.mkdir(parents=True)
(SANDBOX / "config.spec.ts").write_text(
    "test('slow', async ({ page }) => {\n  await page.waitForTimeout(2000);\n  await page.goto('/');\n});\n"
)


def editor(cmd: dict) -> str:
    """Minimal handler for the text editor tool's commands."""
    target = (SANDBOX / cmd["path"].lstrip("/\\")).resolve()
    if not target.is_relative_to(SANDBOX):  # path traversal guard
        return "ERROR: path outside sandbox"
    if cmd["command"] != "create" and not target.exists():  # tell the model, never raise
        return f"ERROR: {cmd['path']} does not exist; sandbox root contains: {[p.name for p in SANDBOX.iterdir()]}"
    match cmd["command"]:
        case "view":
            return (
                "\n".join(f"{i + 1}: {ln}" for i, ln in enumerate(target.read_text().splitlines()))
                if target.is_file()
                else "\n".join(p.name for p in target.iterdir())
            )
        case "str_replace":
            text = target.read_text()
            if text.count(cmd["old_str"]) != 1:
                return f"ERROR: old_str found {text.count(cmd['old_str'])} times; must be exactly 1"
            target.write_text(text.replace(cmd["old_str"], cmd["new_str"]))
            return "ok"
        case "create":
            target.write_text(cmd["file_text"])
            return "ok"
        case "insert":
            lines = target.read_text().splitlines()
            lines.insert(cmd["insert_line"], cmd["new_str"])
            target.write_text("\n".join(lines) + "\n")
            return "ok"
    return f"ERROR: unknown command {cmd['command']}"


print("== 1. text editor tool ==")
messages = [
    {
        "role": "user",
        "content": "In config.spec.ts, replace the waitForTimeout with a web-first assertion that "
        "the page's main heading is visible. Show me the result with view.",
    }
]
for _ in range(8):
    r = client.messages.create(
        model=MODEL,
        max_tokens=4000,
        messages=messages,
        tools=[{"type": "text_editor_20250728", "name": "str_replace_based_edit_tool"}],
    )
    if r.stop_reason != "tool_use":
        break
    messages.append({"role": "assistant", "content": r.content})
    results = []
    for b in r.content:
        if b.type == "tool_use":
            out = editor(b.input)
            print(f"  -> {b.input['command']} {b.input.get('path')}  => {out.splitlines()[0][:60]}")
            results.append(
                {
                    "type": "tool_result",
                    "tool_use_id": b.id,
                    "content": out,
                    "is_error": out.startswith("ERROR"),
                }
            )
    messages.append({"role": "user", "content": results})
print("  final file:\n   " + (SANDBOX / "config.spec.ts").read_text().replace("\n", "\n   "))
assert "waitForTimeout" not in (SANDBOX / "config.spec.ts").read_text()

print("== 2. web search tool (server-side) ==")
r = client.messages.create(
    model=MODEL,
    max_tokens=4000,
    tools=[
        {
            "type": "web_search_20260209",
            "name": "web_search",
            "max_uses": 5,
            "allowed_domains": ["playwright.dev"],
        }
    ],
    messages=[
        {
            "role": "user",
            "content": "What is the current stable Playwright version? One sentence with the source URL.",
        }
    ],
)
for b in r.content:
    if b.type == "server_tool_use":
        print(f"  searched: {b.input}")
    elif b.type == "web_search_tool_result":
        c = b.content
        print(f"  results: {len(c) if isinstance(c, list) else 'ERROR ' + c.error_code}")
    elif b.type == "text":
        print("  answer:", b.text.strip()[:300])
print(f"  usage.server_tool_use: {r.usage.server_tool_use}")
